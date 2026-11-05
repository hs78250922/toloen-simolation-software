# backend/main.py
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)
sys.path.append(os.path.abspath(os.path.join(current_dir, '..')))
sys.path.append(os.path.abspath(os.path.join(current_dir, '..', '..')))

import threading
import webbrowser
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from simulation import simulator
from app.schemas import (
    EquipmentSimRequest, EquipmentSimResponse,
    FlowsheetSimRequest, FlowsheetSimResponse,
    PhaseEnvelopeRequest, PhaseEnvelopePoint, KineticsResponse
)
from app.services.thermo_engine import (
    simulate_exchanger, simulate_reactor, simulate_compressor, simulate_pump,
    calculate_phase_envelope, calculate_kinetics
)
from app.services.flowsheet_solver import solve_flowsheet

app = FastAPI(title="Unit 600 Studio (All-in-One)", version="3.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ModeRequest(BaseModel):
    mode: str

@app.get("/api/health")
def health(): return {"status": "ok", "service": "Unit600-Core"}

@app.post("/api/simulation/start")
def start(): return simulator.start()

@app.post("/api/simulation/pause")
def pause(): return simulator.pause()

@app.post("/api/simulation/reset")
def reset(): return simulator.reset()

@app.post("/api/simulation/mode")
def set_mode(req: ModeRequest): return simulator.set_mode(req.mode)

@app.get("/api/simulation/state")
def get_state(): return simulator.get_state()

@app.get("/api/simulation/history")
def get_history(limit: int = 60): return {"history": simulator.get_history(limit)}

@app.post("/api/thermo/simulate/single", response_model=EquipmentSimResponse)
def simulate_single(req: EquipmentSimRequest):
    try:
        t = req.equipment_type.lower()
        if t in ["exchanger", "heater", "cooler"]:
            duty = req.params.get("duty", 0.0)
            if t == "cooler" or req.params.get("heating", 1) == 0:
                duty = -abs(duty)
            outlet = simulate_exchanger(req.inlet, duty)
            return EquipmentSimResponse(equipment_id=req.equipment_id, status="success", outlet=outlet, duty_mw=duty)
        elif t == "reactor":
            conv = req.params.get("conversion", 47.5)
            outlet = simulate_reactor(req.inlet, conv)
            return EquipmentSimResponse(equipment_id=req.equipment_id, status="success", outlet=outlet, duty_mw=0.0)
        elif t == "compressor":
            ratio = req.params.get("pressureRatio", 1.26)
            eff = req.params.get("efficiency", 0.78)
            outlet = simulate_compressor(req.inlet, ratio, eff)
            return EquipmentSimResponse(equipment_id=req.equipment_id, status="success", outlet=outlet, duty_mw=0.0)
        elif t == "pump":
            head = req.params.get("head", 100.0)
            eff = req.params.get("efficiency", 0.75)
            outlet = simulate_pump(req.inlet, head, eff)
            return EquipmentSimResponse(equipment_id=req.equipment_id, status="success", outlet=outlet, duty_mw=0.0)
        else:
            raise HTTPException(status_code=400, detail=f"Equipment type '{req.equipment_type}' not supported.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/thermo/simulate/flowsheet", response_model=FlowsheetSimResponse)
def simulate_flowsheet(req: FlowsheetSimRequest):
    try:
        result = solve_flowsheet(req)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/thermo/phase-envelope", response_model=list[PhaseEnvelopePoint])
def get_phase_envelope(req: PhaseEnvelopeRequest):
    try:
        result = calculate_phase_envelope(req.composition, req.pressure_range, req.steps)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/kinetics/simulate", response_model=KineticsResponse)
def get_kinetics(t_min: float = 350.0, t_max: float = 450.0):
    try:
        return calculate_kinetics(t_min, t_max)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_frontend_path():
    if getattr(sys, 'frozen', False):
        return os.path.join(sys._MEIPASS, 'dist')
    base = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, '..', '..', 'dist') 

DIST_DIR = get_frontend_path()

if os.path.exists(DIST_DIR):
    assets_dir = os.path.join(DIST_DIR, 'assets')
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    def serve_index():
        return FileResponse(os.path.join(DIST_DIR, 'index.html'))

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi"):
            raise HTTPException(status_code=404)
        candidate = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(DIST_DIR, 'index.html'))
else:
    print(f"⚠️ Warning: Frontend build not found at {DIST_DIR}. API-only mode.")

def open_browser():
    try: webbrowser.open('http://127.0.0.1:8000')
    except: pass

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("  UNIT 600 STUDIO (ALL-IN-ONE)")
    print("  Server: http://localhost:8000")
    print("=" * 60)
    
    threading.Timer(1.5, open_browser).start()
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")