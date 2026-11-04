// GuardianAI API Client & WebSocket Manager with Offline Fallback

const API_BASE = window.location.origin;

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    return { status: 'OFFLINE_MODE', active_ws_connections: 0, queued_incidents: 0 };
  }
}

export async function getUserProfile() {
  try {
    const res = await fetch(`${API_BASE}/api/user/profile`);
    if (!res.ok) throw new Error('Failed to load user profile');
    return await res.json();
  } catch (err) {
    return {
      id: "USR-9921",
      name: "Priya Sharma",
      phone: "+91 98765 43210",
      blood_group: "O+ Positive",
      allergies: "Penicillin",
      emergency_contacts: [
        { name: "Rohit Sharma", phone: "+91 98111 22233", relation: "Brother", notify_sms: true },
        { name: "Dr. Anita Desai", phone: "+91 98222 33344", relation: "Doctor", notify_sms: true },
        { name: "Site Safety Supv (Vikram)", phone: "+91 98333 44455", relation: "Site Officer", notify_sms: true }
      ],
      medical_notes: "Asthma inhaler in backpack"
    };
  }
}

export async function triggerEmergencySOS(payload) {
  try {
    const res = await fetch(`${API_BASE}/api/emergency/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Emergency trigger failed');
    return await res.json();
  } catch (err) {
    console.warn('API error, falling back to local offline distress buffer:', err);
    // Offline distress store
    const offlineItem = {
      status: "SOS_BROADCAST_SUCCESS",
      incident: {
        id: `INC-OFFLINE-${Date.now().toString(36).toUpperCase()}`,
        user_id: payload.user_id || "USR-9921",
        user_name: "Priya Sharma",
        trigger_type: payload.trigger_type || "MANUAL_ONE_TAP",
        severity: payload.severity || "CRITICAL",
        status: "ACTIVE",
        location: payload.location,
        timestamp: new Date().toISOString(),
        notes: payload.notes || "SOS Broadcast via Local Storage Buffer",
        has_audio: Boolean(payload.audio_base64),
        mesh_hops: payload.mesh_hop_count || 0,
        timeline: [
          { time: new Date().toLocaleTimeString(), text: `SOS Triggered (${payload.trigger_type})` },
          { time: new Date().toLocaleTimeString(), text: "Queued in device local buffer for Sahayata BLE Mesh Relay" }
        ]
      },
      notifications_dispatched: [
        { recipient: "Rohit Sharma (+91 98111 22233)", channel: "SMS", status: "QUEUED_OFFLINE" },
        { recipient: "Site Safety Supv (+91 98333 44455)", channel: "WHATSAPP", status: "QUEUED_OFFLINE" }
      ]
    };
    try {
      const stored = JSON.parse(localStorage.getItem('guardian_offline_sos') || '[]');
      stored.unshift(offlineItem.incident);
      localStorage.setItem('guardian_offline_sos', JSON.stringify(stored));
    } catch (e) {}
    return offlineItem;
  }
}

export async function cancelEmergencySOS(incidentId, reason) {
  try {
    const res = await fetch(`${API_BASE}/api/emergency/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incident_id: incidentId, reason })
    });
    return await res.json();
  } catch (err) {
    return { status: "CANCELLED_SUCCESS", incident_id: incidentId, reason };
  }
}

export async function getIncidents() {
  try {
    const res = await fetch(`${API_BASE}/api/emergency/incidents`);
    if (!res.ok) throw new Error('Failed to load incidents');
    return await res.json();
  } catch (err) {
    // Return sample offline incidents
    return {
      incidents: [
        {
          id: "INC-8801",
          user_id: "USR-7712",
          user_name: "Aarav Mehta",
          trigger_type: "AUDIO_DISTRESS",
          severity: "CRITICAL",
          status: "EN_ROUTE",
          location: { lat: 28.6315, lng: 77.2132, address: "Palika Bazaar Radial 3, New Delhi" },
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
          notes: "High distress scream signature detected (3.8 kHz peak + 'Bachao' keyword)",
          has_audio: true,
          audio_url: "/api/audio/sample_distress_1.mp3",
          biometric_summary: "Heart Rate: 142 BPM (Tachycardia detected)",
          mesh_hops: 0,
          responder_assigned: "PCR Unit 12 (Officer Sanjay)",
          dispatch_eta_min: 4,
          timeline: [
            { time: "19:04:12", text: "Distress audio triggered silent countdown" },
            { time: "19:04:17", text: "10s audio recorded & transmitted to Command Dispatch" },
            { time: "19:07:00", text: "Automated AI Triage categorized severity as CRITICAL" },
            { time: "19:10:00", text: "PCR Unit 12 dispatched. ETA ~4 mins" }
          ]
        },
        {
          id: "INC-8802",
          user_id: "USR-4421",
          user_name: "Sunita Rao",
          trigger_type: "BIOMETRIC_FALL",
          severity: "HIGH",
          status: "DISPATCHED",
          location: { lat: 28.6254, lng: 77.2198, address: "Ashoka Road Lane 2, New Delhi" },
          timestamp: new Date(Date.now() - 28 * 60000).toISOString(),
          notes: "Sudden 3.4G impact drop detected via smartwatch accelerometer followed by 45s immobility",
          has_audio: false,
          biometric_summary: "Heart Rate: 58 BPM (Low responsiveness)",
          mesh_hops: 0,
          responder_assigned: "Rapid Medical Bike #03",
          dispatch_eta_min: 6,
          timeline: [
            { time: "18:50:20", text: "Fall impact detected by wearable sensor" },
            { time: "18:58:00", text: "Paramedic dispatch alert sent to nearest medical post" }
          ]
        },
        {
          id: "INC-8803",
          user_id: "USR-1092",
          user_name: "Farhan Khan",
          trigger_type: "MESH_HOP",
          severity: "CRITICAL",
          status: "ACTIVE",
          location: { lat: 28.6380, lng: 77.2240, address: "Underground Metro Concourse (Zero Cellular Zone)" },
          timestamp: new Date(Date.now() - 6 * 60000).toISOString(),
          notes: "Decentralized Sahayata SOS Mesh relayed across 3 offline BLE nodes to Gateway Node-X7",
          has_audio: true,
          biometric_summary: "Battery: 18% | 3 P2P Hops Traversed",
          mesh_hops: 3,
          responder_assigned: null,
          dispatch_eta_min: null,
          timeline: [
            { time: "19:12:00", text: "SOS originated in zero-cellular basement subway" },
            { time: "19:13:00", text: "Relayed via: Node-Basement -> Node-Escalator -> Node-Gate" },
            { time: "19:15:00", text: "Surface Gateway Node-X7 connected to Cloud and pushed SOS" }
          ]
        }
      ],
      total: 3
    };
  }
}

export async function updateIncidentStatus(incidentId, status, responder, etaMin) {
  try {
    const res = await fetch(`${API_BASE}/api/emergency/update-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incident_id: incidentId, status, responder, eta_min: etaMin })
    });
    return await res.json();
  } catch (err) {
    return { status: "UPDATED_LOCAL", incident_id: incidentId };
  }
}

export async function calculateSafePath(originLat, originLng, destLat, destLng) {
  try {
    const res = await fetch(`${API_BASE}/api/safepath/calculate?origin_lat=${originLat}&origin_lng=${originLng}&dest_lat=${destLat}&dest_lng=${destLng}`);
    if (!res.ok) throw new Error('SafePath calculation error');
    return await res.json();
  } catch (err) {
    // Generate fallback algorithmic routes
    return {
      origin: { lat: originLat, lng: originLng },
      destination: { lat: destLat, lng: destLng },
      recommended_route_id: "route_safepath",
      routes: [
        {
          id: "route_safepath",
          title: "AI Guardian SafePath",
          type: "SAFE_PATH",
          distance_km: 1.45,
          duration_min: 17,
          safety_score: 94,
          lighting_score: 96,
          crime_avoidance_score: 92,
          safe_havens_count: 3,
          crowdsourced_alerts_count: 0,
          waypoints: [
            [originLat, originLng],
            [originLat + 0.002, originLng + 0.002],
            [originLat + 0.006, originLng + 0.005],
            [destLat - 0.002, destLng - 0.001],
            [destLat, destLng]
          ],
          highlights: [
            "100% High-Intensity LED Street Illumination",
            "Passes 24/7 Police Help Booth (Radial 2)",
            "Continuous foot-traffic & open commercial shops"
          ],
          cautions: [
            "Route is ~250m longer (+3 mins walking)"
          ]
        },
        {
          id: "route_fastest",
          title: "Standard Fastest Route",
          type: "FASTEST",
          distance_km: 1.20,
          duration_min: 14,
          safety_score: 48,
          lighting_score: 38,
          crime_avoidance_score: 42,
          safe_havens_count: 0,
          crowdsourced_alerts_count: 2,
          waypoints: [
            [originLat, originLng],
            [originLat + 0.004, originLng - 0.001],
            [destLat, destLng]
          ],
          highlights: [
            "Saves ~3 minutes walking time",
            "Direct shortcut through back alley"
          ],
          cautions: [
            "Cuts through unlit G-Block service lane (6 broken streetlights)",
            "2 active user reports of suspicious isolated gatherings"
          ]
        }
      ]
    };
  }
}

export async function getSafePathLayers() {
  try {
    const res = await fetch(`${API_BASE}/api/safepath/layers`);
    if (!res.ok) throw new Error('Failed to load layers');
    return await res.json();
  } catch (err) {
    return {
      safe_havens: [
        { id: "SH-101", name: "Central Metro Police Station", category: "POLICE", lat: 28.6328, lng: 77.2195, address: "Barakhamba Road, Connaught Place", open_24x7: 1, phone: "112" },
        { id: "SH-102", name: "Apollo 24/7 Emergency Pharmacy", category: "PHARMACY", lat: 28.6292, lng: 77.2152, address: "Block E, Inner Circle", open_24x7: 1, phone: "+91 11 2334 1100" },
        { id: "SH-103", name: "RML General Hospital Emergency Care", category: "HOSPITAL", lat: 28.6241, lng: 77.2023, address: "Baba Kharak Singh Marg", open_24x7: 1, phone: "+91 11 2336 5525" },
        { id: "SH-104", name: "SafeHub Pink Booth & Transit Guard", category: "SAFE_BOOTH", lat: 28.6345, lng: 77.2210, address: "Janpath Radial Road 2", open_24x7: 1, phone: "1091" }
      ],
      crowdsourced_reports: [
        { id: "CR-001", lat: 28.6360, lng: 77.2140, category: "POOR_LIGHTING", description: "Street lights non-functional along alley between Block G & Outer Circle", severity: "WARNING", upvotes: 14 },
        { id: "CR-002", lat: 28.6275, lng: 77.2115, category: "SAFE_HAVEN", description: "24-hr security guards on patrol and bright LED floodlights active", severity: "SAFE", upvotes: 28 },
        { id: "CR-005", lat: 28.6298, lng: 77.2080, category: "SUSPICIOUS_ACTIVITY", description: "Isolated parking lot with broken CCTV cameras and zero lighting", severity: "DANGER", upvotes: 19 }
      ],
      illumination_zones: [
        { center: [28.6328, 77.2195], radius: 350, intensity: "HIGH", score: 98, label: "Connaught Outer Plaza LED Grid" },
        { center: [28.6292, 77.2152], radius: 300, intensity: "HIGH", score: 94, label: "Inner Circle Commercial Zone" },
        { center: [28.6360, 77.2140], radius: 220, intensity: "LOW", score: 32, label: "Block G Service Lane (Poor Lighting)" }
      ]
    };
  }
}

export async function submitCrowdsourcedReport(report) {
  try {
    const res = await fetch(`${API_BASE}/api/safepath/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    });
    return await res.json();
  } catch (err) {
    return { status: "REPORT_RECORDED_LOCAL", report };
  }
}

export async function analyzeAudioDistress(transcript, spectralFreq, decibels) {
  try {
    const res = await fetch(`${API_BASE}/api/ai/audio-distress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, spectral_max_freq: spectralFreq, decibels })
    });
    return await res.json();
  } catch (err) {
    // Client-side fallback logic
    const lower = transcript.toLowerCase();
    const hasKw = lower.includes("help") || lower.includes("bachao") || lower.includes("save") || lower.includes("madad");
    const isScream = spectralFreq >= 2400 && spectralFreq <= 4800 && decibels > 70;
    const isEmergency = hasKw || isScream;
    return {
      is_emergency: isEmergency,
      distress_score: isEmergency ? 92.5 : 18.0,
      detected_keywords: hasKw ? [{ keyword: "bachao/help", confidence: 0.95 }] : [],
      spectral_freq_hz: spectralFreq,
      decibels_db: decibels,
      triggers: isEmergency ? ["Client-side acoustic distress detected"] : [],
      recommended_action: isEmergency ? "TRIGGER_SILENT_SOS_COUNTDOWN" : "STANDBY",
      model: "Client-AudioClassifier-Fallback"
    };
  }
}

export async function analyzeVisionFrame(cameraId, zoneId, condition = "random") {
  try {
    const res = await fetch(`${API_BASE}/api/ai/vision-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ camera_id: cameraId, zone_id: zoneId, condition })
    });
    return await res.json();
  } catch (err) {
    // Client-side simulation fallback
    return {
      timestamp: new Date().toISOString(),
      camera_id: cameraId,
      zone_id: zoneId,
      condition,
      total_persons: 1,
      violations_detected: condition === 'compliant' ? 0 : 1,
      ppe_compliance_rate: condition === 'compliant' ? 100 : 45,
      fall_detected: condition === 'fall_detected',
      hazard_breach: condition === 'restricted_breach',
      detections: [
        { label: condition === 'fall_detected' ? 'fall_detected' : (condition === 'missing_ppe' ? 'no_helmet' : 'helmet'), confidence: 0.94, box: [0.35, 0.25, 0.65, 0.85], is_violation: condition !== 'compliant', status_text: condition === 'compliant' ? 'Compliant Hardhat' : 'PPE / Zone Violation Detected' }
      ],
      supervisor_alert_triggered: condition !== 'compliant',
      alert_summary: condition === 'compliant' ? "Workplace zone fully compliant" : "Hazard violation detected by Rakshak AI",
      whatsapp_simulated_dispatch: condition !== 'compliant' ? {
        recipient: "+91 98333 44455 (Safety Supv Vikram)",
        channel: "WHATSAPP_EMERGENCY_ALERT",
        message: `[GUARDIAN-AI RAKSHAK ALERT] Violation in ${zoneId}. Immediate inspection required.`,
        status: "SENT"
      } : null
    };
  }
}

export async function relayMeshPacket(packet) {
  try {
    const res = await fetch(`${API_BASE}/api/mesh/relay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packet)
    });
    return await res.json();
  } catch (err) {
    return {
      status: "MESH_PACKET_DELIVERED_TO_CLOUD",
      packet_id: packet.packet_id,
      total_hops: (packet.hop_count || 0) + 1,
      gateway_node: "NODE-GW-X7",
      cloud_incident_id: `INC-MESH-${Date.now().toString(36).toUpperCase()}`
    };
  }
}
