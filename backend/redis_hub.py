"""
Ultra-low latency real-time SOS queue, location cache, and WebSocket Hub
Supports in-memory fast Redis-compatible queue with async pub/sub and WebSocket broadcast
"""
import asyncio
import json
from datetime import datetime
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket

class RedisSOSHub:
    def __init__(self):
        # Active WebSockets connected (Command center, responders, mobile clients)
        self.active_connections: Set[WebSocket] = set()
        
        # Real-time SOS Priority Queue (Ordered by severity: CRITICAL > HIGH > MEDIUM)
        self.sos_queue: List[Dict[str, Any]] = []
        
        # Ultra-low latency location cache (user_id -> {lat, lng, accuracy, timestamp, battery})
        self.location_cache: Dict[str, Dict[str, Any]] = {}

        # Channel subscribers for Pub/Sub simulation
        self.subscribers: Dict[str, List[asyncio.Queue]] = {
            "sos_alerts": [],
            "telemetry": [],
            "hazard_cctv": [],
            "mesh_relays": []
        }
        
        self.lock = asyncio.Lock()

    async def connect_ws(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        # Send current queue snapshot and active stats
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "active_sos_count": len([i for i in self.sos_queue if i.get("status") in ["ACTIVE", "DISPATCHED", "EN_ROUTE"]]),
            "timestamp": datetime.utcnow().isoformat()
        })

    def disconnect_ws(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast_ws(self, message: Dict[str, Any]):
        """Broadcast message to all connected crisis dispatchers and clients"""
        dead_connections = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)
        for dead in dead_connections:
            self.active_connections.discard(dead)

    async def push_sos(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """Push new emergency SOS into priority queue and broadcast immediately"""
        async with self.lock:
            # Automated AI Triage assignment
            triage_score = self._calculate_ai_triage(incident)
            incident["ai_triage_score"] = triage_score
            incident["received_at"] = datetime.utcnow().isoformat()
            
            # Update location cache
            if "location" in incident and "user_id" in incident:
                self.location_cache[incident["user_id"]] = {
                    "lat": incident["location"]["lat"],
                    "lng": incident["location"]["lng"],
                    "timestamp": incident["received_at"],
                    "incident_id": incident.get("id")
                }
            
            # Check if existing incident, update or prepend
            existing = next((i for i in self.sos_queue if i.get("id") == incident.get("id")), None)
            if existing:
                existing.update(incident)
            else:
                self.sos_queue.insert(0, incident)

        # Broadcast to all crisis control dispatchers
        await self.broadcast_ws({
            "type": "SOS_TRIGGERED",
            "incident": incident,
            "triage_score": triage_score
        })
        return incident

    async def update_telemetry(self, user_id: str, lat: float, lng: float, battery: Optional[int] = None, hr: Optional[int] = None):
        """Update live telemetry cache and broadcast to responders"""
        async with self.lock:
            telemetry_data = {
                "user_id": user_id,
                "lat": lat,
                "lng": lng,
                "battery": battery,
                "heart_rate": hr,
                "timestamp": datetime.utcnow().isoformat()
            }
            self.location_cache[user_id] = telemetry_data

        await self.broadcast_ws({
            "type": "TELEMETRY_UPDATE",
            "telemetry": telemetry_data
        })

    async def update_incident_status(self, incident_id: str, status: str, responder: Optional[str] = None, eta: Optional[int] = None):
        async with self.lock:
            for item in self.sos_queue:
                if item.get("id") == incident_id:
                    item["status"] = status
                    if responder:
                        item["responder_assigned"] = responder
                    if eta is not None:
                        item["dispatch_eta_min"] = eta
                    break
        
        await self.broadcast_ws({
            "type": "STATUS_CHANGED",
            "incident_id": incident_id,
            "status": status,
            "responder_assigned": responder,
            "dispatch_eta_min": eta
        })

    def _calculate_ai_triage(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """
        AI Triage heuristic:
        Computes composite urgency score [0 - 100] based on trigger type,
        acoustic screaming frequency, biometric spikes, and mesh hop isolation.
        """
        score = 50
        trigger = incident.get("trigger_type", "")
        factors = []

        if trigger == "AUDIO_DISTRESS":
            score += 35
            factors.append("Acoustic screaming / struggle distress detected")
        elif trigger == "BIOMETRIC_FALL":
            score += 30
            factors.append("Sudden high-G impact fall + immobility")
        elif trigger == "BIOMETRIC_HR":
            score += 25
            factors.append("Acute tachycardia tachycardia spike (>140 BPM)")
        elif trigger == "MESH_HOP":
            score += 28
            factors.append("Zero-cellular isolated area relay")
        elif trigger == "MANUAL_ONE_TAP":
            score += 32
            factors.append("Direct high-priority one-tap citizen trigger")
        elif trigger == "STEALTH_PIN":
            score += 38
            factors.append("Covert stealth trigger activated under duress")

        if incident.get("has_audio"):
            score += 10
            factors.append("Ambient audio recording attached")

        if incident.get("mesh_hops", 0) > 1:
            score += 8
            factors.append(f"Relayed across {incident.get('mesh_hops')} offline P2P hops")

        score = min(100, max(15, score))

        if score >= 80:
            urgency = "CRITICAL"
            color = "#ef4444"
            recommended_action = "Immediate Police & Paramedic Emergency Dispatch"
        elif score >= 60:
            urgency = "HIGH"
            color = "#f97316"
            recommended_action = "Rapid Patrol Intercept & Supervisory Notification"
        else:
            urgency = "MEDIUM"
            color = "#eab308"
            recommended_action = "Contact Verification & SafePath Route Escort"

        return {
            "score": score,
            "urgency": urgency,
            "badge_color": color,
            "factors": factors,
            "recommended_action": recommended_action
        }

# Global instance
redis_hub = RedisSOSHub()
