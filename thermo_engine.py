# backend/app/services/thermo_engine.py
from thermo import ChemicalConstantsPackage, PRMIX, CEOSGas, CEOSLiquid, FlashVL
from scipy.optimize import brentq
from app.schemas import StreamInput, StreamOutput, ComponentFlows, PhaseEnvelopePoint, KineticsPoint, DeactivationPoint
import numpy as np
import math

COMPONENTS = ['benzene', 'toluene', 'xylene', 'hydrogen']

def build_mixture(temperature_c: float, pressure_barg: float, flows: ComponentFlows):
    masses = [flows.Benzene, flows.Toluene, flows.Xylenes, flows.H2]
    total_mass = sum(masses)
    if total_mass <= 1e-6:
        masses = [44.84, 54.86, 0.2, 0.1]
        total_mass = sum(masses)
    
    zs = [max(m / total_mass, 1e-6) for m in masses]
    z_sum = sum(zs)
    zs = [z / z_sum for z in zs]

    T_safe = max(-50.0, min(temperature_c, 1500.0))
    P_safe = max(0.01, pressure_barg)

    constants, properties = ChemicalConstantsPackage.from_IDs(COMPONENTS)
    kijs = [[0.0]*4 for _ in range(4)]
    eos_kwargs = dict(Tcs=constants.Tcs, Pcs=constants.Pcs, omegas=constants.omegas, kijs=kijs)
    
    liquid = CEOSLiquid(PRMIX, eos_kwargs)
    gas = CEOSGas(PRMIX, eos_kwargs)
    flasher = FlashVL(constants, properties, liquid=liquid, gas=gas)

    T_K = T_safe + 273.15
    P_Pa = P_safe * 1e5 + 101325

    res = flasher.flash(T=T_K, P=P_Pa, zs=zs)
    return res, total_mass / 3600.0

def simulate_exchanger(inlet: StreamInput, duty_mw: float) -> StreamOutput:
    try:
        res_in, mass_flow_kg_s = build_mixture(inlet.temperature_c, inlet.pressure_barg, inlet.flows_kg_h)
        h_in_specific = (res_in.H() * 1000) / res_in.MW()
        delta_H_total = duty_mw * 1e6
        delta_h = delta_H_total / mass_flow_kg_s
        h_out_target = h_in_specific + delta_h

        def enthalpy_error(T_c):
            try:
                res, _ = build_mixture(T_c, inlet.pressure_barg, inlet.flows_kg_h)
                h_spec = (res.H() * 1000) / res.MW()
                return h_spec - h_out_target
            except Exception: return 1e6

        T_out_c = brentq(enthalpy_error, -50.0, 1500.0, xtol=0.1)
        res_out, _ = build_mixture(T_out_c, inlet.pressure_barg, inlet.flows_kg_h)
        h_out_spec = (res_out.H() * 1000) / res_out.MW()

        P_out = max(0.05, inlet.pressure_barg - 0.2)
        
        return StreamOutput(
            temperature_c=round(T_out_c, 2),
            pressure_barg=P_out,
            flows_kg_h=inlet.flows_kg_h,
            enthalpy_kj_kg=round(h_out_spec / 1000.0, 2),
            duty_mw=duty_mw  # ⭐️ برگرداندن Duty
        )
    except Exception:
        cp = 2.5 
        mass_flow_kg_s = sum([inlet.flows_kg_h.Benzene, inlet.flows_kg_h.Toluene, inlet.flows_kg_h.Xylenes, inlet.flows_kg_h.H2]) / 3600.0
        if mass_flow_kg_s <= 1e-6: mass_flow_kg_s = 1.0
        delta_T = (duty_mw * 1000) / (mass_flow_kg_s * cp)
        return StreamOutput(
            temperature_c=round(inlet.temperature_c + delta_T, 2),
            pressure_barg=max(0.05, inlet.pressure_barg - 0.2),
            flows_kg_h=inlet.flows_kg_h,
            enthalpy_kj_kg=0.0,
            duty_mw=duty_mw  # ⭐️ برگرداندن Duty در Fallback
        )

def simulate_reactor(inlet: StreamInput, conversion: float) -> StreamOutput:
    try:
        comp = inlet.flows_kg_h.model_copy(deep=True)
        converted_tol = comp.Toluene * (conversion / 100.0)
        comp.Toluene -= converted_tol
        comp.Benzene += converted_tol * (78.0 / 92.0) * 0.95
        comp.Xylenes += converted_tol * (106.0 / 92.0) * 0.95
        comp.C9Plus += converted_tol * 0.05

        res_in, _ = build_mixture(inlet.temperature_c, inlet.pressure_barg, inlet.flows_kg_h)
        H_in_total = res_in.H() * (sum([comp.Benzene, comp.Toluene, comp.Xylenes, comp.H2]) / res_in.MW())

        def energy_error(T_c):
            try:
                res_out, _ = build_mixture(T_c, inlet.pressure_barg, comp)
                H_out_total = res_out.H() * (sum([comp.Benzene, comp.Toluene, comp.Xylenes, comp.H2]) / res_out.MW())
                return H_out_total - H_in_total
            except Exception: return 1e6

        T_out_c = brentq(energy_error, inlet.temperature_c, 1000.0, xtol=0.1)
        res_out, _ = build_mixture(T_out_c, inlet.pressure_barg, comp)
        h_out_spec = (res_out.H() * 1000) / res_out.MW()

        return StreamOutput(
            temperature_c=round(T_out_c, 2),
            pressure_barg=max(0.05, inlet.pressure_barg - 0.3),
            flows_kg_h=comp,
            enthalpy_kj_kg=round(h_out_spec / 1000.0, 2),
            duty_mw=0.0  # ⭐️ راکتور آدیاباتیک است
        )
    except Exception:
        delta_T = 15 * (conversion / 47.5)
        return StreamOutput(
            temperature_c=round(inlet.temperature_c + delta_T, 2),
            pressure_barg=max(0.05, inlet.pressure_barg - 0.3),
            flows_kg_h=inlet.flows_kg_h,
            enthalpy_kj_kg=0.0,
            duty_mw=0.0
        )

def simulate_compressor(inlet: StreamInput, pressure_ratio: float, efficiency: float = 0.78) -> StreamOutput:
    try:
        res_in, mass_flow = build_mixture(inlet.temperature_c, inlet.pressure_barg, inlet.flows_kg_h)
        H_in = res_in.H()
        P_out_barg = max(0.1, inlet.pressure_barg) * pressure_ratio
        entropy_in = res_in.S()
        
        def entropy_error(T_c):
            try:
                res, _ = build_mixture(T_c, P_out_barg, inlet.flows_kg_h)
                return res.S() - entropy_in
            except Exception: return 1e6

        T_isentropic_c = brentq(entropy_error, inlet.temperature_c, 1000.0, xtol=0.1)
        res_isentropic, _ = build_mixture(T_isentropic_c, P_out_barg, inlet.flows_kg_h)
        H_out_isentropic = res_isentropic.H()
        H_out_actual = H_in + (H_out_isentropic - H_in) / efficiency

        def enthalpy_error(T_c):
            try:
                res, _ = build_mixture(T_c, P_out_barg, inlet.flows_kg_h)
                return res.H() - H_out_actual
            except Exception: return 1e6

        T_out_c = brentq(enthalpy_error, T_isentropic_c, 1000.0, xtol=0.1)
        res_out, _ = build_mixture(T_out_c, P_out_barg, inlet.flows_kg_h)
        h_out_spec = (res_out.H() * 1000) / res_out.MW()

        return StreamOutput(
            temperature_c=round(T_out_c, 2),
            pressure_barg=round(P_out_barg, 2),
            flows_kg_h=inlet.flows_kg_h,
            enthalpy_kj_kg=round(h_out_spec / 1000.0, 2),
            duty_mw=0.0
        )
    except Exception:
        T_out_c = inlet.temperature_c * (pressure_ratio ** 0.3)
        return StreamOutput(
            temperature_c=round(T_out_c, 2),
            pressure_barg=round(max(0.1, inlet.pressure_barg) * pressure_ratio, 2),
            flows_kg_h=inlet.flows_kg_h,
            enthalpy_kj_kg=0.0,
            duty_mw=0.0
        )

def simulate_pump(inlet: StreamInput, head_m: float, efficiency: float = 0.75) -> StreamOutput:
    try:
        rho = 850.0
        g = 9.81
        delta_P_pa = rho * g * head_m
        delta_P_barg = delta_P_pa / 1e5
        P_out_barg = max(0.1, inlet.pressure_barg) + delta_P_barg
        
        res_in, _ = build_mixture(inlet.temperature_c, inlet.pressure_barg, inlet.flows_kg_h)
        Cp = res_in.Cp() * 1000
        MW = res_in.MW() / 1000
        Cp_mass = Cp / MW
        delta_T = (delta_P_pa / (rho * Cp_mass)) / efficiency
        T_out_c = inlet.temperature_c + delta_T

        res_out, _ = build_mixture(T_out_c, P_out_barg, inlet.flows_kg_h)
        h_out_spec = (res_out.H() * 1000) / res_out.MW()

        return StreamOutput(
            temperature_c=round(T_out_c, 2),
            pressure_barg=round(P_out_barg, 2),
            flows_kg_h=inlet.flows_kg_h,
            enthalpy_kj_kg=round(h_out_spec / 1000.0, 2),
            duty_mw=0.0
        )
    except Exception:
        delta_P_barg = (850.0 * 9.81 * head_m) / 1e5
        return StreamOutput(
            temperature_c=round(inlet.temperature_c + 0.1, 2),
            pressure_barg=round(max(0.1, inlet.pressure_barg) + delta_P_barg, 2),
            flows_kg_h=inlet.flows_kg_h,
            enthalpy_kj_kg=0.0,
            duty_mw=0.0
        )

def calculate_phase_envelope(composition: dict, pressure_range: list, steps: int) -> list:
    constants, properties = ChemicalConstantsPackage.from_IDs(COMPONENTS)
    kijs = [[0.0]*4 for _ in range(4)]
    eos_kwargs = dict(Tcs=constants.Tcs, Pcs=constants.Pcs, omegas=constants.omegas, kijs=kijs)
    liquid = CEOSLiquid(PRMIX, eos_kwargs)
    gas = CEOSGas(PRMIX, eos_kwargs)
    flasher = FlashVL(constants, properties, liquid=liquid, gas=gas)
    
    masses = [composition.get('Benzene', 0), composition.get('Toluene', 0), composition.get('Xylenes', 0), composition.get('H2', 0)]
    total_mass = sum(masses)
    if total_mass == 0: return []
    zs = [m / total_mass for m in masses]

    results = []
    p_min, p_max = pressure_range
    pressures = np.linspace(p_min, p_max, steps)
    
    for P in pressures:
        try:
            P_Pa = P * 1e5
            def bubble_err(T):
                try:
                    res = flasher.flash(T=T, P=P_Pa, zs=zs)
                    return res.VF 
                except: return 1.0
            T_bubble_K = brentq(bubble_err, 250.0, 800.0, xtol=0.1)
            
            def dew_err(T):
                try:
                    res = flasher.flash(T=T, P=P_Pa, zs=zs)
                    return res.VF - 1.0 
                except: return 1.0
            T_dew_K = brentq(dew_err, 250.0, 800.0, xtol=0.1)
            
            results.append(PhaseEnvelopePoint(
                T=round(T_bubble_K - 273.15, 1),
                P_bubble=round(P, 2),
                P_dew=round(P, 2)
            ))
        except Exception:
            pass
            
    return results

def calculate_kinetics(t_min: float, t_max: float) -> dict:
    arrhenius_data = []
    deactivation_data = []
    A = 1.5e7       
    Ea = 85000.0    
    R = 8.314       
    
    for t in np.linspace(t_min, t_max, 15):
        T_K = t + 273.15
        k = A * math.exp(-Ea / (R * T_K))
        arrhenius_data.append(KineticsPoint(T=round(t, 1), rate=round(k, 4)))
        
    kd = 0.025 
    for day in range(1, 31):
        activity = math.exp(-kd * day)
        deactivation_data.append(DeactivationPoint(day=day, activity=round(activity, 3)))
        
    return {"arrhenius": arrhenius_data, "deactivation": deactivation_data}