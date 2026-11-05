import os

REQUIREMENTS = """fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
"""

KINETICS = '''"""
Reaction Kinetics for Toluene Disproportionation (Tatoray Process)
Reaction: 2 Toluene (92 g/mol) -> Benzene (78 g/mol) + Xylenes (106 g/mol)
Calibrated against Unit 600 design data.
"""
import math

T_REF_C = 375.0
CONV_AT_TREF = 47.5
CONV_PER_DEGREE = 0.35
H2F_MIN = 4.0
H2F_NOMINAL = 4.08
MAX_TEMP_C = 480.0


def compute_conversion(T_in_celsius, catalyst_activity, h2f_ratio=H2F_NOMINAL):
    base_conv = CONV_AT_TREF + (T_in_celsius - T_REF_C) * CONV_PER_DEGREE
    if h2f_ratio >= H2F_MIN:
        h2f_factor = 1.0
    else:
        h2f_factor = max(0.0, h2f_ratio / H2F_MIN)
    conversion = base_conv * catalyst_activity * h2f_factor
    return max(0.0, min(conversion, 55.0))


def temperature_for_target_conversion(target_conv, catalyst_activity, h2f_ratio=H2F_NOMINAL):
    if h2f_ratio >= H2F_MIN:
        h2f_factor = 1.0
    else:
        h2f_factor = max(0.01, h2f_ratio / H2F_MIN)
    if catalyst_activity <= 0.01:
        return MAX_TEMP_C
    base_conv_needed = target_conv / (catalyst_activity * h2f_factor)
    T = T_REF_C + (base_conv_needed - CONV_AT_TREF) / CONV_PER_DEGREE
    return min(T, MAX_TEMP_C)


def deactivation_rate(temp_celsius):
    base_rate_per_min = 1.0 / (30 * 24 * 60)
    temp_factor = 2.0 ** ((temp_celsius - T_REF_C) / 20.0)
    return base_rate_per_min * temp_factor


def compute_products(fresh_feed_kg_h, conversion_wt_pct):
    scale = (fresh_feed_kg_h / 80954.0) * (conversion_wt_pct / 47.5)
    return {
        "benzene_kg_h": 54435.0 * scale,
        "xylenes_kg_h": 25687.0 * scale,
        "toluene_recycle_kg_h": 80954.0 * 0.5486 * (1 - conversion_wt_pct / 100),
    }


def compute_energy_balance(T_in_celsius, catalyst_activity, mode):
    h6001_duty = 2.299 + max(0, T_in_celsius - 375) * 0.018
    h6001_duty = min(h6001_duty, 4.5)
    return {
        "H-6001_MW": round(h6001_duty, 3),
        "H-6002_MW": 31.29,
        "E-6001_MW": 46.65,
        "E-6009_MW": 32.34,
        "total_fuel_MW": round(h6001_duty + 31.29, 3),
    }
'''

SIMULATION = '''"""
Real-time simulation engine for Unit 600.
"""
import threading
import time
import random
from datetime import datetime
from kinetics import (
    compute_conversion, temperature_for_target_conversion,
    deactivation_rate, compute_products, compute_energy_balance,
    MAX_TEMP_C,
)


class Unit600Simulator:
    def __init__(self):
        self.running = False
        self.mode = "SOR"
        self.process_time_min = 0.0
        self.catalyst_activity = 1.0
        self.h2f_ratio = 4.08
        self.fresh_feed_kg_h = 80954.0
        self.target_conversion = 47.5
        self.history = []
        self.max_history = 120
        self._thread = None
        self._lock = threading.Lock()

    def start(self):
        if self.running:
            return {"status": "already_running"}
        self.running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        return {"status": "started"}

    def pause(self):
        self.running = False
        return {"status": "paused"}

    def reset(self):
        self.pause()
        with self._lock:
            self.process_time_min = 0.0
            self.catalyst_activity = 1.0
            self.h2f_ratio = 4.08
            self.history = []
        return {"status": "reset"}

    def set_mode(self, mode):
        if mode not in ("SOR", "EOR"):
            return {"status": "error", "message": "invalid mode"}
        with self._lock:
            self.mode = mode
            if mode == "SOR":
                self.catalyst_activity = 1.0
                self.h2f_ratio = 4.08
            else:
                self.catalyst_activity = 0.55
                self.h2f_ratio = 4.05
        return {"status": "mode_set", "mode": mode}

    def get_history(self, limit=60):
        with self._lock:
            return list(self.history[-limit:])

    def get_state(self):
        with self._lock:
            if self.history:
                return self.history[-1]
            return self._initial_state()

    def _initial_state(self):
        return {
            "time": 0.0,
            "mode": self.mode,
            "reactor_inlet_temp_C": 375.0,
            "reactor_outlet_temp_C": 390.0,
            "conversion_wt": 47.5,
            "h2f_ratio": 4.08,
            "catalyst_activity": 1.0,
            "benzene_kg_h": 54435.0,
            "xylenes_kg_h": 25687.0,
            "H-6001_MW": 2.299,
            "H-6002_MW": 31.29,
            "E-6001_MW": 46.65,
            "E-6009_MW": 32.34,
            "total_fuel_MW": 33.589,
            "status": "normal",
        }

    def _loop(self):
        while True:
            if not self.running:
                time.sleep(0.5)
                continue
            try:
                step = self._compute_step()
                with self._lock:
                    self.history.append(step)
                    if len(self.history) > self.max_history:
                        self.history = self.history[-self.max_history:]
                    self.process_time_min += 1.0
            except Exception as e:
                print("[SIM ERROR] " + str(e))
            time.sleep(1.0)

    def _compute_step(self):
        with self._lock:
            activity = self.catalyst_activity
            mode = self.mode

        T_in = temperature_for_target_conversion(self.target_conversion, activity, self.h2f_ratio)
        conversion = compute_conversion(T_in, activity, self.h2f_ratio) + (random.random() - 0.5) * 0.15
        conversion = max(0, min(conversion, 55))
        delta_T = 15.0 * (conversion / 47.5)
        T_out = T_in + delta_T
        products = compute_products(self.fresh_feed_kg_h, conversion)
        energy = compute_energy_balance(T_in, activity, mode)

        if self.running:
            with self._lock:
                self.catalyst_activity -= deactivation_rate(T_in)
                self.catalyst_activity = max(0.05, self.catalyst_activity)

        if T_out >= MAX_TEMP_C - 2:
            status = "warning_catalyst_regen"
        elif conversion < 46.0:
            status = "warning_low_conversion"
        else:
            status = "normal"

        return {
            "time": round(self.process_time_min, 1),
            "timestamp": datetime.now().isoformat(),
            "mode": mode,
            "reactor_inlet_temp_C": round(T_in, 2),
            "reactor_outlet_temp_C": round(T_out, 2),
            "conversion_wt": round(conversion, 2),
            "h2f_ratio": round(self.h2f_ratio, 3),
            "catalyst_activity": round(activity, 4),
            "benzene_kg_h": round(products["benzene_kg_h"], 1),
            "xylenes_kg_h": round(products["xylenes_kg_h"], 1),
            "H-6001_MW": energy["H-6001_MW"],
            "H-6002_MW": energy["H-6002_MW"],
            "E-6001_MW": energy["E-6001_MW"],
            "E-6009_MW": energy["E-6009_MW"],
            "total_fuel_MW": energy["total_fuel_MW"],
            "status": status,
        }


simulator = Unit600Simulator()
'''

MAIN = '''"""
FastAPI server for Unit 600 Simulation Studio.
Run: python main.py
Server: http://localhost:8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from simulation import simulator

app = FastAPI(title="Unit 600 Simulation API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ModeRequest(BaseModel):
    mode: str


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Unit600-Simulator"}


@app.post("/api/simulation/start")
def start():
    return simulator.start()


@app.post("/api/simulation/pause")
def pause():
    return simulator.pause()


@app.post("/api/simulation/reset")
def reset():
    return simulator.reset()


@app.post("/api/simulation/mode")
def set_mode(req: ModeRequest):
    return simulator.set_mode(req.mode)


@app.get("/api/simulation/state")
def get_state():
    return simulator.get_state()


@app.get("/api/simulation/history")
def get_history(limit: int = 60):
    return {"history": simulator.get_history(limit)}


if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("  UNIT 600 SIMULATION BACKEND")
    print("  Starting on http://localhost:8000")
    print("  API docs: http://localhost:8000/docs")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
'''

FILES = {
    "requirements.txt": REQUIREMENTS,
    "kinetics.py": KINETICS,
    "simulation.py": SIMULATION,
    "main.py": MAIN,
}

print("Creating backend files...")
for name, content in FILES.items():
    with open(name, "w", encoding="utf-8") as f:
        f.write(content)
    print("[OK] {} ({} bytes)".format(name, len(content)))

print()
print("All files created successfully!")
print("Now run: python main.py")