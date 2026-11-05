# backend/simulation.py
import random

class SimulatorEngine:
    def __init__(self):
        self.is_running = False
        self.mode = "SOR"
        self.time = 0
        self.state = self._get_initial_state()
        self.history = []

    def _get_initial_state(self):
        return {
            "reactor_inlet_temp_C": 375.0,
            "reactor_outlet_temp_C": 390.0,
            "conversion_wt": 47.5,
            "h2f_ratio": 4.08,
            "catalyst_activity": 1.0,
            "benzene_kg_h": 54435.0,
            "xylenes_kg_h": 25687.0,
            "H-6001_MW": 2.3,
            "E-6001_MW": 46.65,
            "E-6009_MW": 32.34,
            "total_fuel_MW": 33.6,
            "time": 0
        }

    def start(self):
        self.is_running = True
        return {"status": "running"}

    def pause(self):
        self.is_running = False
        return {"status": "paused"}

    def reset(self):
        self.is_running = False
        self.time = 0
        self.state = self._get_initial_state()
        self.history = []
        return {"status": "reset"}

    def set_mode(self, mode: str):
        self.mode = mode
        return {"status": "ok", "mode": mode}

    def get_state(self):
        if self.is_running:
            self.time += 1
            self.state["time"] = self.time
            self.state["reactor_inlet_temp_C"] += random.uniform(-0.2, 0.2)
            self.state["reactor_outlet_temp_C"] += random.uniform(-0.3, 0.3)
            self.state["conversion_wt"] += random.uniform(-0.05, 0.05)
            
            self.history.append(self.state.copy())
            if len(self.history) > 100:
                self.history.pop(0)
                
        return self.state

    def get_history(self, limit: int = 60):
        return self.history[-limit:]

# ⭐️ این متغیر باید حتماً در فایل وجود داشته باشد
simulator = SimulatorEngine()