import requests

BASE = 'http://127.0.0.1:8000'

def test_api():
    print("--- Testing GuardianAI Endpoints ---")
    
    # 1. Health
    r = requests.get(f"{BASE}/api/health")
    assert r.status_code == 200, f"Health failed: {r.text}"
    print("[PASS] Health check passed:", r.json()["status"])
    
    # 2. Frontend HTML
    r = requests.get(f"{BASE}/")
    assert r.status_code == 200 and "GuardianAI" in r.text, "Frontend root failed"
    print("[PASS] PWA Frontend index.html served successfully")
    
    # 3. User Profile
    r = requests.get(f"{BASE}/api/user/profile")
    assert r.status_code == 200 and "emergency_contacts" in r.json()
    print("[PASS] User Profile loaded:", r.json()["name"])
    
    # 4. SunoAI Audio Distress endpoint
    r = requests.post(f"{BASE}/api/ai/audio-distress", json={
        "transcript": "Please bachao someone help me emergency",
        "spectral_max_freq": 3650.0,
        "decibels": 82.0
    })
    data = r.json()
    assert r.status_code == 200 and data["is_emergency"] is True
    print(f"[PASS] Module A: SunoAI Audio Distress passed! Score: {data['distress_score']}, Model: {data['model']}")
    
    # 5. SafePath Navigation Route calculation
    r = requests.get(f"{BASE}/api/safepath/calculate?origin_lat=28.6304&origin_lng=77.2177&dest_lat=28.6415&dest_lng=77.2285")
    assert r.status_code == 200 and len(r.json()["routes"]) == 2
    safepath = next(rt for rt in r.json()["routes"] if rt["type"] == "SAFE_PATH")
    fastest = next(rt for rt in r.json()["routes"] if rt["type"] == "FASTEST")
    print(f"[PASS] Module B: SafePath Route calculated! Safe Score: {safepath['safety_score']} vs Fastest: {fastest['safety_score']}")
    
    # 6. Sahayata Decentralized Offline Mesh relay
    r = requests.post(f"{BASE}/api/mesh/relay", json={
        "packet_id": "PKT-TEST-001",
        "origin_user_id": "USR-9921",
        "origin_user_name": "Priya Sharma",
        "timestamp": "19:30:00",
        "location": {"lat": 28.6380, "lng": 77.2240, "accuracy": 10.0},
        "sos_type": "MESH_HOP",
        "hop_count": 2,
        "max_hops": 5,
        "path_nodes": ["NODE-ME", "NODE-RELAY-1", "NODE-RELAY-2"],
        "message": "Zero cell signal, hopping through mesh"
    })
    mesh_res = r.json()
    assert r.status_code == 200 and mesh_res["status"] == "MESH_PACKET_DELIVERED_TO_CLOUD"
    print(f"[PASS] Module C: Sahayata Mesh multi-hop relay passed! Gateway: {mesh_res['gateway_node']}, Total Hops: {mesh_res['total_hops']}")
    
    # 7. Rakshak Computer Vision / YOLOv8 Hazard Detection
    r = requests.post(f"{BASE}/api/ai/vision-analyze", json={
        "camera_id": "CAM-01-CRANE",
        "zone_id": "Zone-A-Heavy-Lift",
        "condition": "missing_ppe"
    })
    vis_res = r.json()
    assert r.status_code == 200 and vis_res["violations_detected"] > 0
    print(f"[PASS] Module D: Rakshak Hazard Vision passed! Violations: {vis_res['violations_detected']}, Alert: {vis_res['alert_summary']}")
    
    # 8. Emergency SOS Trigger with AI Triage
    r = requests.post(f"{BASE}/api/emergency/trigger", json={
        "user_id": "USR-9921",
        "trigger_type": "MANUAL_ONE_TAP",
        "location": {"lat": 28.6304, "lng": 77.2177, "accuracy": 8.0},
        "severity": "CRITICAL",
        "notes": "Test emergency trigger"
    })
    sos_res = r.json()
    assert r.status_code == 200 and sos_res["status"] == "SOS_BROADCAST_SUCCESS"
    print(f"[PASS] One-Tap SOS Trigger passed! Incident ID: {sos_res['incident']['id']}, Notifications Dispatched: {len(sos_res['notifications_dispatched'])}")
    
    print("\nALL GUARDIAN-AI BACKEND & ML SERVICES VERIFIED 100% OPERATIONAL!")

if __name__ == "__main__":
    test_api()
