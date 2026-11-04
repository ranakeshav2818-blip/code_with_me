"""
Pydantic Models and Data Schemas for GuardianAI
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class Location(BaseModel):
    lat: float
    lng: float
    accuracy: Optional[float] = 10.0
    address: Optional[str] = "Live GPS Telemetry"
    timestamp: Optional[str] = None

class EmergencyContact(BaseModel):
    name: str
    phone: str
    relation: str
    notify_sms: bool = True
    notify_call: bool = True

class UserProfile(BaseModel):
    id: str = "USR-9921"
    name: str = "Priya Sharma"
    phone: str = "+91 98765 43210"
    blood_group: str = "O+ Positive"
    allergies: str = "Penicillin"
    emergency_contacts: List[EmergencyContact] = [
        EmergencyContact(name="Rohit Sharma", phone="+91 98111 22233", relation="Brother"),
        EmergencyContact(name="Dr. Anita Desai", phone="+91 98222 33344", relation="Family Doctor"),
        EmergencyContact(name="Site Safety Supv (Vikram)", phone="+91 98333 44455", relation="Site Officer")
    ]
    medical_notes: str = "Asthma inhaler in backpack"

class SOSTriggerRequest(BaseModel):
    incident_id: Optional[str] = None
    user_id: str = "USR-9921"
    trigger_type: str = "MANUAL_ONE_TAP" # MANUAL_ONE_TAP, AUDIO_DISTRESS, BIOMETRIC_FALL, BIOMETRIC_HR, MESH_HOP, STEALTH_PIN
    location: Location
    severity: str = "CRITICAL" # CRITICAL, HIGH, MEDIUM
    notes: Optional[str] = "Immediate emergency response requested"
    audio_base64: Optional[str] = None
    audio_duration_sec: Optional[float] = 10.0
    biometric_data: Optional[Dict[str, Any]] = None
    mesh_hop_count: Optional[int] = 0
    mesh_origin_id: Optional[str] = None

class IncidentRecord(BaseModel):
    id: str
    user_id: str
    user_name: str
    trigger_type: str
    severity: str
    status: str = "ACTIVE" # ACTIVE, DISPATCHED, EN_ROUTE, RESOLVED, FALSE_ALARM
    location: Location
    timestamp: str
    notes: str
    has_audio: bool = False
    audio_url: Optional[str] = None
    biometric_summary: Optional[str] = None
    mesh_hops: int = 0
    responder_assigned: Optional[str] = None
    dispatch_eta_min: Optional[int] = None
    timeline: List[Dict[str, Any]] = []

class CrowdsourcedReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    lat: float
    lng: float
    category: str # "POOR_LIGHTING", "SUSPICIOUS_ACTIVITY", "SAFE_HAVEN", "HAZARD_OBSTACLE", "POLICE_PATROL"
    description: str
    severity: str # "INFO", "WARNING", "DANGER"
    upvotes: int = 1
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class RouteRequest(BaseModel):
    origin: Location
    destination: Location
    mode: str = "walking" # walking, driving

class RouteAlternative(BaseModel):
    id: str
    title: str
    type: str # "SAFE_PATH" vs "FASTEST"
    distance_km: float
    duration_min: int
    safety_score: int # 0 to 100
    lighting_score: int # 0 to 100
    crime_avoidance_score: int # 0 to 100
    safe_havens_count: int
    crowdsourced_alerts_count: int
    waypoints: List[List[float]] # [[lat, lng], ...]
    highlights: List[str]
    cautions: List[str]

class VisionAnalysisRequest(BaseModel):
    image_base64: str
    zone_id: Optional[str] = "Zone-A-Heavy-Machinery"
    camera_id: Optional[str] = "CAM-EAST-BAY-04"

class DetectionItem(BaseModel):
    label: str # "helmet", "vest", "goggles", "no_helmet", "no_vest", "person", "fall_detected", "restricted_breach"
    confidence: float
    box: List[float] # [x_min, y_min, x_max, y_max] normalized 0-1
    is_violation: bool
    status_text: str

class VisionAnalysisResponse(BaseModel):
    timestamp: str
    camera_id: str
    total_persons: int
    violations_detected: int
    ppe_compliance_rate: float
    fall_detected: bool
    hazard_breach: bool
    detections: List[DetectionItem]
    supervisor_alert_triggered: bool
    alert_summary: str

class MeshPacket(BaseModel):
    packet_id: str
    origin_user_id: str
    origin_user_name: str
    timestamp: str
    location: Location
    sos_type: str
    hop_count: int
    max_hops: int = 5
    path_nodes: List[str]
    battery_level: Optional[int] = 85
    message: str
    is_gateway_reached: bool = False
