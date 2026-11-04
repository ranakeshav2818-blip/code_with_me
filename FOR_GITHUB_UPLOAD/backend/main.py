"""
GuardianAI - All-in-One Human Safety Ecosystem
FastAPI Real-Time WebSocket & AI Backend Server
"""
import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import (
    UserProfile, SOSTriggerRequest, IncidentRecord,
    CrowdsourcedReport, RouteRequest, VisionAnalysisRequest, MeshPacket
)
from database import init_db, get_db_connection
from redis_hub import redis_hub
from ai_services import AudioDistressAI, SafePathRoutingAI, RakshakVisionAI

# Initialize Database tables and seeds
init_db()

app = FastAPI(
    title="GuardianAI Core Safety API",
    description="Real-Time Human Safety Ecosystem API with AI Distress Detection, SafePath Routing, Decentralized Mesh, and Rakshak Hazard Vision",
    version="2.0.0"
)

# Enable CORS for frontend Vite development & PWA
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory user profile
CURRENT_USER_PROFILE = UserProfile()

# Seed active mesh nodes
ACTIVE_MESH_NODES = [
    {"node_id": "NODE-GW-X7", "role": "GATEWAY_CONNECTED", "lat": 28.6335, "lng": 27.2210, "battery": 92, "range_m": 85, "active_hops": 3, "status": "ONLINE"},
    {"node_id": "NODE-PEER-02", "role": "RELAY_OFFLINE", "lat": 28.6318, "lng": 27.2185, "battery": 78, "range_m": 60, "active_hops": 2, "status": "RELAYING"},
    {"node_id": "NODE-PEER-03", "role": "RELAY_OFFLINE", "lat": 28.6295, "lng": 27.2160, "battery": 65, "range_m": 50, "active_hops": 1, "status": "RELAYING"},
    {"node_id": "NODE-VICTIM-01", "role": "ORIGIN_OFFLINE", "lat": 28.6280, "lng": 27.2140, "battery": 41, "range_m": 45, "active_hops": 0, "status": "BROADCASTING"}
]

# Populate Redis SOS Hub with existing active incidents from SQLite
def sync_initial_incidents():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incidents ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    for row in rows:
        incident_dict = {
            "id": row["id"],
            "user_id": row["user_id"],
            "user_name": row["user_name"],
            "trigger_type": row["trigger_type"],
            "severity": row["severity"],
            "status": row["status"],
            "location": {
                "lat": row["lat"],
                "lng": row["lng"],
                "accuracy": row["accuracy"],
                "address": row["address"],
                "timestamp": row["timestamp"]
            },
            "timestamp": row["timestamp"],
            "notes": row["notes"],
            "has_audio": bool(row["has_audio"]),
            "audio_url": row["audio_url"],
            "biometric_summary": row["biometric_summary"],
            "mesh_hops": row["mesh_hops"],
            "responder_assigned": row["responder_assigned"],
            "dispatch_eta_min": row["dispatch_eta_min"],
            "timeline": json.loads(row["timeline_json"]) if row["timeline_json"] else []
        }
        redis_hub.sos_queue.append(incident_dict)
    conn.close()

sync_initial_incidents()

# ----------------- WEBSOCKET REAL-TIME ENDPOINTS -----------------

@app.websocket("/ws/crisis-control")
async def websocket_crisis_control(websocket: WebSocket):
    """
    High-throughput WebSocket for Crisis Control Dashboard:
    Streams incoming distress alarms, automated AI triage, responder dispatches, and camera feeds
    """
    await redis_hub.connect_ws(websocket)
    try:
        # Send current initial state
        await websocket.send_json({
            "type": "INITIAL_INCIDENTS",
            "incidents": redis_hub.sos_queue
        })
        while True:
            # Keep alive and receive dispatcher actions
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("action")
            
            if msg_type == "ASSIGN_RESPONDER":
                incident_id = message.get("incident_id")
                responder = message.get("responder")
                eta = message.get("eta_min", 5)
                await redis_hub.update_incident_status(incident_id, "DISPATCHED", responder, eta)
            elif msg_type == "RESOLVE_INCIDENT":
                incident_id = message.get("incident_id")
                await redis_hub.update_incident_status(incident_id, "RESOLVED")
            elif msg_type == "BROADCAST_ALERT":
                await redis_hub.broadcast_ws({
                    "type": "COMMAND_BROADCAST",
                    "text": message.get("text", "Emergency alert broadcasted by Crisis Control"),
                    "sender": "COMMAND_DISPATCH"
                })
    except WebSocketDisconnect:
        redis_hub.disconnect_ws(websocket)
    except Exception as e:
        redis_hub.disconnect_ws(websocket)

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """
    Streaming real-time telemetry from mobile victims (GPS, Heart Rate, Battery)
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            user_id = payload.get("user_id", "USR-9921")
            lat = payload.get("lat")
            lng = payload.get("lng")
            hr = payload.get("heart_rate")
            battery = payload.get("battery")
            if lat and lng:
                await redis_hub.update_telemetry(user_id, lat, lng, battery, hr)
    except WebSocketDisconnect:
        pass

# ----------------- REST API ROUTES -----------------

@app.get("/api/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "timestamp": datetime.utcnow().isoformat(),
        "active_ws_connections": len(redis_hub.active_connections),
        "queued_incidents": len(redis_hub.sos_queue),
        "ai_models_loaded": {
            "suno_audio_distress": True,
            "safepath_routing_engine": True,
            "rakshak_yolov8_hazard": True
        }
    }

@app.get("/api/user/profile")
async def get_user_profile():
    return CURRENT_USER_PROFILE

@app.post("/api/user/profile")
async def update_user_profile(profile: UserProfile):
    global CURRENT_USER_PROFILE
    CURRENT_USER_PROFILE = profile
    return {"status": "SUCCESS", "profile": CURRENT_USER_PROFILE}

@app.get("/api/emergency/incidents")
async def get_incidents(status: Optional[str] = None):
    """Returns active and historical incidents with AI triage score"""
    results = redis_hub.sos_queue
    if status:
        results = [i for i in results if i.get("status") == status]
    return {"incidents": results, "total": len(results)}

@app.post("/api/emergency/trigger")
async def trigger_emergency_sos(req: SOSTriggerRequest):
    """
    Trigger immediate Emergency SOS:
    1. Validates trigger type (AUDIO_DISTRESS, ONE_TAP, BIOMETRIC, MESH, STEALTH_PIN)
    2. Runs AI Triage
    3. Queues in Redis Hub & broadcasts via WebSockets
    4. Simulates WhatsApp / SMS automated notifications to emergency contacts & supervisors
    5. Saves in SQLite persistent store
    """
    now = datetime.utcnow()
    incident_id = req.incident_id or f"INC-{str(uuid.uuid4())[:8].upper()}"

    timeline = [
        {"time": now.strftime("%H:%M:%S"), "text": f"SOS Triggered via {req.trigger_type}"},
        {"time": now.strftime("%H:%M:%S"), "text": f"Live GPS locked: ({req.location.lat:.4f}, {req.location.lng:.4f})"}
    ]

    if req.audio_base64:
        timeline.append({"time": now.strftime("%H:%M:%S"), "text": "10-second ambient distress audio recorded & uploaded"})

    if req.biometric_data:
        hr = req.biometric_data.get("heart_rate")
        timeline.append({"time": now.strftime("%H:%M:%S"), "text": f"Biometric anomaly detected: {hr} BPM"})

    new_incident = {
        "id": incident_id,
        "user_id": req.user_id,
        "user_name": CURRENT_USER_PROFILE.name if req.user_id == CURRENT_USER_PROFILE.id else "Citizen",
        "trigger_type": req.trigger_type,
        "severity": req.severity,
        "status": "ACTIVE",
        "location": {
            "lat": req.location.lat,
            "lng": req.location.lng,
            "accuracy": req.location.accuracy or 8.0,
            "address": req.location.address or "Live Geolocation Fix",
            "timestamp": now.isoformat()
        },
        "timestamp": now.isoformat(),
        "notes": req.notes or "Immediate emergency assistance required",
        "has_audio": bool(req.audio_base64),
        "audio_url": "/api/audio/sample_distress_1.mp3" if req.audio_base64 else None,
        "biometric_summary": f"HR: {req.biometric_data.get('heart_rate', 135)} BPM" if req.biometric_data else "Normal Range",
        "mesh_hops": req.mesh_hop_count or 0,
        "responder_assigned": None,
        "dispatch_eta_min": None,
        "timeline": timeline
    }

    # Push to Redis Hub (runs AI Triage and broadcasts to WebSockets)
    saved_incident = await redis_hub.push_sos(new_incident)

    # Persist in SQLite
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO incidents (
            id, user_id, user_name, trigger_type, severity, status, lat, lng,
            accuracy, address, timestamp, notes, has_audio, audio_url,
            biometric_summary, mesh_hops, responder_assigned, dispatch_eta_min, timeline_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        saved_incident["id"], saved_incident["user_id"], saved_incident["user_name"],
        saved_incident["trigger_type"], saved_incident["severity"], saved_incident["status"],
        saved_incident["location"]["lat"], saved_incident["location"]["lng"],
        saved_incident["location"]["accuracy"], saved_incident["location"]["address"],
        saved_incident["timestamp"], saved_incident["notes"],
        1 if saved_incident["has_audio"] else 0, saved_incident["audio_url"],
        saved_incident["biometric_summary"], saved_incident["mesh_hops"],
        None, None, json.dumps(saved_incident["timeline"])
    ))
    conn.commit()
    conn.close()

    # Simulated WhatsApp / SMS Dispatches
    notifications_sent = []
    for contact in CURRENT_USER_PROFILE.emergency_contacts:
        notifications_sent.append({
            "recipient": f"{contact.name} ({contact.phone})",
            "relation": contact.relation,
            "channel": "SMS & WHATSAPP",
            "message": f"🚨 EMERGENCY: {CURRENT_USER_PROFILE.name} has triggered an SOS! Location: https://maps.google.com/?q={req.location.lat},{req.location.lng} | GuardianAI Live Tracking Active",
            "status": "DELIVERED"
        })

    return {
        "status": "SOS_BROADCAST_SUCCESS",
        "incident": saved_incident,
        "notifications_dispatched": notifications_sent
    }

@app.post("/api/emergency/cancel")
async def cancel_sos(payload: Dict[str, Any] = Body(...)):
    """Cancel SOS within countdown or with safe PIN"""
    incident_id = payload.get("incident_id")
    reason = payload.get("reason", "Cancelled by user (False Alarm / Resolved)")
    
    if incident_id:
        await redis_hub.update_incident_status(incident_id, "FALSE_ALARM")
        # Update SQLite
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE incidents SET status = 'FALSE_ALARM', notes = notes || ' [Cancelled: ' || ? || ']' WHERE id = ?", (reason, incident_id))
        conn.commit()
        conn.close()

    return {"status": "CANCELLED_SUCCESS", "incident_id": incident_id, "reason": reason}

@app.post("/api/emergency/update-status")
async def update_status(payload: Dict[str, Any] = Body(...)):
    incident_id = payload.get("incident_id")
    status = payload.get("status")
    responder = payload.get("responder")
    eta = payload.get("eta_min")
    
    await redis_hub.update_incident_status(incident_id, status, responder, eta)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE incidents 
        SET status = ?, responder_assigned = COALESCE(?, responder_assigned), dispatch_eta_min = COALESCE(?, dispatch_eta_min)
        WHERE id = ?
    """, (status, responder, eta, incident_id))
    conn.commit()
    conn.close()
    
    return {"status": "UPDATED", "incident_id": incident_id}

# ----------------- MODULE A: SUNO-AI AUDIO DISTRESS MONITOR -----------------

@app.post("/api/ai/audio-distress")
async def analyze_audio_distress(payload: Dict[str, Any] = Body(...)):
    """
    Endpoint for SunoAI Audio Distress Detection:
    Accepts speech recognition transcript, spectral frequency peaks, and decibel level
    """
    transcript = payload.get("transcript", "")
    spectral_freq = float(payload.get("spectral_max_freq", 0.0))
    decibels = float(payload.get("decibels", 0.0))
    
    analysis = AudioDistressAI.analyze_audio_stream(
        text_transcript=transcript,
        spectral_max_freq=spectral_freq,
        decibels=decibels
    )
    return analysis

# ----------------- MODULE B: SAFEPATH PREDICTIVE ROUTING -----------------

@app.get("/api/safepath/calculate")
async def calculate_safepath(
    origin_lat: float = Query(28.6304),
    origin_lng: float = Query(77.2177),
    dest_lat: float = Query(28.6415),
    dest_lng: float = Query(77.2285)
):
    """
    SafePath Routing: Computes standard shortest route vs AI SafePath route
    ranked with dynamic Safety Score based on illumination, crime index, and safe havens
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM crowdsourced_reports")
    pins = [dict(r) for r in cursor.fetchall()]
    conn.close()

    result = SafePathRoutingAI.compute_routes(
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        dest_lat=dest_lat,
        dest_lng=dest_lng,
        crowdsourced_pins=pins
    )
    return result

@app.get("/api/safepath/layers")
async def get_safepath_layers():
    """Returns safe havens, crowdsourced pins, and illumination zones"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM safe_havens")
    havens = [dict(r) for r in cursor.fetchall()]
    cursor.execute("SELECT * FROM crowdsourced_reports ORDER BY timestamp DESC")
    reports = [dict(r) for r in cursor.fetchall()]
    conn.close()

    # Precomputed illumination zones
    illumination_zones = [
        {"center": [28.6328, 77.2195], "radius": 350, "intensity": "HIGH", "score": 98, "label": "Connaught Outer Plaza LED Grid"},
        {"center": [28.6292, 77.2152], "radius": 300, "intensity": "HIGH", "score": 94, "label": "Inner Circle Commercial Zone"},
        {"center": [28.6360, 77.2140], "radius": 220, "intensity": "LOW", "score": 32, "label": "Block G Service Lane (Poor Lighting)"}
    ]

    return {
        "safe_havens": havens,
        "crowdsourced_reports": reports,
        "illumination_zones": illumination_zones
    }

@app.post("/api/safepath/report")
async def submit_crowdsourced_report(report: CrowdsourcedReport):
    """Allows users to submit live crowdsourced safety check-in"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO crowdsourced_reports (id, lat, lng, category, description, severity, upvotes, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (report.id, report.lat, report.lng, report.category, report.description, report.severity, report.upvotes, report.timestamp))
    conn.commit()
    conn.close()

    # Broadcast new report to crisis dispatchers
    await redis_hub.broadcast_ws({
        "type": "NEW_SAFETY_REPORT",
        "report": report.dict()
    })

    return {"status": "REPORT_RECORDED", "report": report}

# ----------------- MODULE C: SAHAYATA DECENTRALIZED MESH -----------------

@app.get("/api/mesh/topology")
async def get_mesh_topology():
    """Returns the current state of local peer-to-peer mesh nodes and relay hops"""
    return {
        "active_nodes_count": len(ACTIVE_MESH_NODES),
        "nodes": ACTIVE_MESH_NODES,
        "protocols_active": ["Web Bluetooth (BLE 5.2)", "Wi-Fi Direct P2P Simulation", "WebRTC DataChannel"],
        "gateway_connected": True,
        "mesh_coverage_m": 240
    }

@app.post("/api/mesh/relay")
async def relay_mesh_packet(packet: MeshPacket):
    """
    Receives multi-hop distress packet from peer nodes.
    If a connected gateway node receives it, converts to live Cloud SOS!
    """
    # Increment hops
    packet.hop_count += 1
    packet.path_nodes.append("NODE-GW-X7")
    packet.is_gateway_reached = True

    # Convert to live emergency SOS
    sos_req = SOSTriggerRequest(
        user_id=packet.origin_user_id,
        trigger_type="MESH_HOP",
        location=packet.location,
        severity="CRITICAL",
        notes=f"[SAHAYATA MESH RELAY] {packet.message} (Hops traversed: {packet.hop_count} via BLE nodes: {' -> '.join(packet.path_nodes)})",
        mesh_hop_count=packet.hop_count,
        mesh_origin_id=packet.origin_user_id
    )

    sos_response = await trigger_emergency_sos(sos_req)

    return {
        "status": "MESH_PACKET_DELIVERED_TO_CLOUD",
        "packet_id": packet.packet_id,
        "total_hops": packet.hop_count,
        "gateway_node": "NODE-GW-X7",
        "cloud_incident_id": sos_response["incident"]["id"]
    }

# ----------------- MODULE D: RAKSHAK COMPUTER VISION PORTAL -----------------

@app.post("/api/ai/vision-analyze")
async def analyze_vision_frame(payload: Dict[str, Any] = Body(...)):
    """
    Rakshak AI Computer Vision:
    Analyzes live camera frame for PPE compliance (Helmets, Vests, Eyewear),
    hazard zone breaches, and slip & fall posture detection
    """
    camera_id = payload.get("camera_id", "CAM-01-CRANE")
    zone_id = payload.get("zone_id", "Zone-A-Heavy-Lift")
    condition = payload.get("condition", "random") # compliant, missing_ppe, restricted_breach, fall_detected

    result = RakshakVisionAI.process_frame_hazard(
        camera_id=camera_id,
        zone_id=zone_id,
        simulated_condition=condition
    )

    # If violation, log to database and broadcast alert
    if result["violations_detected"] > 0:
        event_id = f"HZ-{str(uuid.uuid4())[:6].upper()}"
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO hazard_events (
                id, camera_id, zone_id, timestamp, violation_type, severity, worker_id, details, snapshot_url, acknowledged
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event_id, camera_id, zone_id, result["timestamp"],
            result["detections"][0]["label"] if result["detections"] else "PPE_VIOLATION",
            "CRITICAL" if result["hazard_breach"] or result["fall_detected"] else "HIGH",
            "WRK-DEMO", result["alert_summary"], "/snapshots/live_detection.jpg", 0
        ))
        conn.commit()
        conn.close()

        await redis_hub.broadcast_ws({
            "type": "HAZARD_VIOLATION_TRIGGERED",
            "event_id": event_id,
            "camera_id": camera_id,
            "zone_id": zone_id,
            "result": result
        })

    return result

@app.get("/api/hazard/recent-events")
async def get_hazard_events():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM hazard_events ORDER BY timestamp DESC LIMIT 20")
    events = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"events": events}

# ----------------- ADVANCED WINNING FEATURES -----------------

@app.post("/api/fake-call/config")
async def get_fake_call_config(payload: Dict[str, Any] = Body(...)):
    """Generates realistic caller profile and audio voice lines for safe exit"""
    caller_preset = payload.get("preset", "dad") # "dad", "police", "boss"
    
    presets = {
        "dad": {
            "name": "Dad ❤️",
            "number": "+91 98111 22233",
            "avatar": "👨‍🦳",
            "speech": "Beta, where are you right now? I am parked right outside on the main road with the hazard lights on."
        },
        "police": {
            "name": "Inspector Sharma (Control Room)",
            "number": "112 / PCR-04",
            "avatar": "👮‍♂️",
            "speech": "This is Delhi Police PCR patrol 12. Citizen, please state your exact location."
        },
        "boss": {
            "name": "Dr. Anita Desai (Director)",
            "number": "+91 98222 33344",
            "avatar": "👩‍💼",
            "speech": "Hello Priya, we need you in the conference room urgently."
        }
    }
    return presets.get(caller_preset, presets["dad"])

from fastapi.staticfiles import StaticFiles
import os

# Serve frontend build if dist folder exists
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


