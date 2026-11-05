# backend/app/schemas.py
from pydantic import BaseModel, Field
from typing import Dict, Optional, List, Any

class ComponentFlows(BaseModel):
    Benzene: float = 0.0
    Toluene: float = 0.0
    Xylenes: float = 0.0
    H2: float = 0.0
    C9Plus: float = 0.0

class StreamInput(BaseModel):
    temperature_c: float
    pressure_barg: float
    flows_kg_h: ComponentFlows

class EquipmentSimRequest(BaseModel):
    equipment_id: str
    equipment_type: str
    params: Dict[str, Any] = Field(default_factory=dict)
    inlet: StreamInput

class StreamOutput(BaseModel):
    temperature_c: float
    pressure_barg: float
    flows_kg_h: ComponentFlows
    enthalpy_kj_kg: float
    duty_mw: Optional[float] = 0.0  # ⭐️ فیلد جدید
    top: Optional[Dict[str, Any]] = None 

class EquipmentSimResponse(BaseModel):
    equipment_id: str
    status: str
    outlet: StreamOutput
    duty_mw: float
    message: Optional[str] = None

class NodeSchema(BaseModel):
    id: str
    type: str
    simType: str
    params: Dict[str, Any] = Field(default_factory=dict)
    design: Dict[str, Any] = Field(default_factory=dict)

class EdgeSchema(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = "out"

class FlowsheetSimRequest(BaseModel):
    nodes: List[NodeSchema]
    edges: List[EdgeSchema]
    tolerance: float = 0.1
    max_iterations: int = 20

class FlowsheetSimResponse(BaseModel):
    status: str
    iterations: int
    converged: bool
    results: Dict[str, StreamOutput]
    log: List[str]

# مدل‌های Phase Envelope & Kinetics
class PhaseEnvelopeRequest(BaseModel):
    composition: Dict[str, float] 
    pressure_range: List[float] = [1.0, 50.0] 
    steps: int = 20

class PhaseEnvelopePoint(BaseModel):
    T: float
    P_bubble: float
    P_dew: float

class KineticsPoint(BaseModel):
    T: float
    rate: float

class DeactivationPoint(BaseModel):
    day: int
    activity: float

class KineticsResponse(BaseModel):
    arrhenius: List[KineticsPoint]
    deactivation: List[DeactivationPoint]