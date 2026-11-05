# backend/app/services/flowsheet_solver.py
import networkx as nx
from app.schemas import FlowsheetSimRequest, StreamInput, ComponentFlows, StreamOutput
from app.services.thermo_engine import (
    simulate_exchanger, simulate_reactor, simulate_compressor, simulate_pump
)

def simulate_equipment_router(eq_type: str, inlet: StreamInput, params: dict) -> StreamOutput:
    t = eq_type.lower() if eq_type else "unknown"
    params = params or {}
    
    if t in ["exchanger", "heater", "cooler"]:
        duty = params.get("duty", 0.0)
        if t == "cooler" or params.get("heating", 1) == 0:
            duty = -abs(duty)
        return simulate_exchanger(inlet, duty)
    elif t == "reactor":
        conv = params.get("conversion", 47.5)
        return simulate_reactor(inlet, conv)
    elif t == "compressor":
        ratio = params.get("pressureRatio", 1.26)
        eff = params.get("efficiency", 0.78)
        return simulate_compressor(inlet, ratio, eff)
    elif t == "pump":
        head = params.get("head", 100.0)
        eff = params.get("efficiency", 0.75)
        return simulate_pump(inlet, head, eff)
    elif t in ["column", "stripper", "separator", "drum", "filter"]:
        # ⭐️ تقسیم جریان برای برج‌ها و سپراتورها
        split = params.get("topSplit", 0.5) # پیش‌فرض ۵۰-۵۰
        
        # محاسبه جریان بالا
        top_flow = ComponentFlows(
            Benzene=inlet.flows_kg_h.Benzene * split,
            Toluene=inlet.flows_kg_h.Toluene * split,
            Xylenes=inlet.flows_kg_h.Xylenes * split,
            H2=inlet.flows_kg_h.H2 * split,
            C9Plus=inlet.flows_kg_h.C9Plus * split
        )
        
        # محاسبه جریان پایین
        bot_flow = ComponentFlows(
            Benzene=inlet.flows_kg_h.Benzene * (1 - split),
            Toluene=inlet.flows_kg_h.Toluene * (1 - split),
            Xylenes=inlet.flows_kg_h.Xylenes * (1 - split),
            H2=inlet.flows_kg_h.H2 * (1 - split),
            C9Plus=inlet.flows_kg_h.C9Plus * (1 - split)
        )
        
        return StreamOutput(
            temperature_c=inlet.temperature_c,
            pressure_barg=inlet.pressure_barg,
            flows_kg_h=bot_flow, # خروجی اصلی (Bottom)
            enthalpy_kj_kg=0.0,
            top={
                "temperature_c": inlet.temperature_c,
                "pressure_barg": inlet.pressure_barg,
                "flows_kg_h": top_flow.model_dump(),
                "enthalpy_kj_kg": 0.0
            }
        )
    else:
        return StreamOutput(
            temperature_c=inlet.temperature_c,
            pressure_barg=inlet.pressure_barg,
            flows_kg_h=inlet.flows_kg_h,
            enthalpy_kj_kg=0.0
        )

def solve_flowsheet(req: FlowsheetSimRequest) -> dict:
    G = nx.DiGraph()
    for n in req.nodes:
        G.add_node(n.id)
    for e in req.edges:
        G.add_edge(e.source, e.target, id=e.id, sourceHandle=e.sourceHandle)

    topo_order = []
    try:
        topo_order = list(nx.topological_sort(G))
    except nx.NetworkXUnfeasible:
        topo_order = [n.id for n in req.nodes]
    except Exception:
        topo_order = [n.id for n in req.nodes]

    for n in req.nodes:
        if n.id not in topo_order:
            topo_order.append(n.id)

    results = {}
    log = []
    converged = False
    default_comp = ComponentFlows(Benzene=44.84, Toluene=54.86, Xylenes=0.2, H2=0.1)
    
    for iteration in range(req.max_iterations):
        max_error = 0.0
        new_results = {}
        
        for node_id in topo_order:
            node_data = next((n for n in req.nodes if n.id == node_id), None)
            if not node_data: continue
                
            incoming_edges = list(G.in_edges(node_id, data=True))
            
            if not incoming_edges:
                T_in = float(node_data.design.get("T_in", 25.0))
                P_in = float(node_data.design.get("P_in", 1.0))
                flow_total = float(node_data.design.get("flow", 1000.0))
                
                comp_dict = node_data.design.get("composition", {})
                comp = ComponentFlows(
                    Benzene=float(comp_dict.get("Benzene", 44.84)),
                    Toluene=float(comp_dict.get("Toluene", 54.86)),
                    Xylenes=float(comp_dict.get("Xylenes", 0.2)),
                    H2=float(comp_dict.get("H2", 0.1)),
                    C9Plus=float(comp_dict.get("C9Plus", 0.0))
                )
                
                total_base = comp.Benzene + comp.Toluene + comp.Xylenes + comp.H2 + comp.C9Plus
                if total_base > 1e-6:
                    scale = flow_total / total_base
                    comp.Benzene *= scale; comp.Toluene *= scale
                    comp.Xylenes *= scale; comp.H2 *= scale; comp.C9Plus *= scale
                else:
                    comp = ComponentFlows(Benzene=flow_total*0.45, Toluene=flow_total*0.55, Xylenes=0, H2=0, C9Plus=0)
                
                inlet = StreamInput(temperature_c=T_in, pressure_barg=P_in, flows_kg_h=comp)
                
            else:
                temps, press, comps = [], [], []
                for u, v, d in incoming_edges:
                    if u in results and results[u] is not None:
                        res = results[u]
                        handle = d.get("sourceHandle", "out") # ⭐️ تشخیص خروجی بالا یا پایین
                        
                        if handle == "top" and res.top:
                            temps.append(res.top["temperature_c"])
                            press.append(res.top["pressure_barg"])
                            comps.append(ComponentFlows(**res.top["flows_kg_h"]))
                        else:
                            temps.append(res.temperature_c)
                            press.append(res.pressure_barg)
                            comps.append(res.flows_kg_h)
                
                if temps:
                    total_flow = sum([sum([c.Benzene, c.Toluene, c.Xylenes, c.H2, c.C9Plus]) for c in comps])
                    if total_flow > 1e-6 and len(comps) > 1:
                        avg_comp = ComponentFlows(Benzene=0, Toluene=0, Xylenes=0, H2=0, C9Plus=0)
                        for c in comps:
                            c_flow = sum([c.Benzene, c.Toluene, c.Xylenes, c.H2, c.C9Plus])
                            weight = c_flow / total_flow
                            avg_comp.Benzene += c.Benzene * weight
                            avg_comp.Toluene += c.Toluene * weight
                            avg_comp.Xylenes += c.Xylenes * weight
                            avg_comp.H2 += c.H2 * weight
                            avg_comp.C9Plus += c.C9Plus * weight
                        final_comp = avg_comp
                    else:
                        final_comp = comps[0] if comps else default_comp

                    inlet = StreamInput(
                        temperature_c=sum(temps)/len(temps),
                        pressure_barg=min(press),
                        flows_kg_h=final_comp
                    )
                else:
                    inlet = StreamInput(temperature_c=25, pressure_barg=1, flows_kg_h=default_comp)

            try:
                outlet = simulate_equipment_router(node_data.simType, inlet, node_data.params)
                new_results[node_id] = outlet
            except Exception as e:
                new_results[node_id] = StreamOutput(
                    temperature_c=inlet.temperature_c,
                    pressure_barg=max(0.05, inlet.pressure_barg),
                    flows_kg_h=inlet.flows_kg_h,
                    enthalpy_kj_kg=0.0
                )
                log.append(f"⚠ Error at {node_id}: {str(e)}")

            if node_id in results and results[node_id] is not None:
                err = abs(results[node_id].temperature_c - new_results[node_id].temperature_c)
                if err > max_error: max_error = err

        results = new_results
        log.append(f"Iter {iteration+1}: Max Error = {max_error:.3f} °C")
        
        if max_error < req.tolerance and iteration > 0:
            converged = True
            log.append("✓ Converged!")
            break

    return {
        "status": "success",
        "iterations": iteration + 1,
        "converged": converged,
        "results": results,
        "log": log
    }