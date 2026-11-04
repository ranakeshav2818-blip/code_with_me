"""
Database module for GuardianAI with SQLite persistence and seed data
"""
import sqlite3
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "guardian_ai.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Incidents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            user_name TEXT,
            trigger_type TEXT,
            severity TEXT,
            status TEXT,
            lat REAL,
            lng REAL,
            accuracy REAL,
            address TEXT,
            timestamp TEXT,
            notes TEXT,
            has_audio INTEGER,
            audio_url TEXT,
            biometric_summary TEXT,
            mesh_hops INTEGER,
            responder_assigned TEXT,
            dispatch_eta_min INTEGER,
            timeline_json TEXT
        )
    """)

    # Crowdsourced reports table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS crowdsourced_reports (
            id TEXT PRIMARY KEY,
            lat REAL,
            lng REAL,
            category TEXT,
            description TEXT,
            severity TEXT,
            upvotes INTEGER,
            timestamp TEXT
        )
    """)

    # Safe havens table (Police, 24/7 Pharmacies, Hospitals, Verified Safe Hubs)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS safe_havens (
            id TEXT PRIMARY KEY,
            name TEXT,
            category TEXT,
            lat REAL,
            lng REAL,
            address TEXT,
            open_24x7 INTEGER,
            phone TEXT,
            verified INTEGER
        )
    """)

    # PPE / CCTV Hazard Event Logs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hazard_events (
            id TEXT PRIMARY KEY,
            camera_id TEXT,
            zone_id TEXT,
            timestamp TEXT,
            violation_type TEXT,
            severity TEXT,
            worker_id TEXT,
            details TEXT,
            snapshot_url TEXT,
            acknowledged INTEGER
        )
    """)

    conn.commit()

    # Seed data if empty
    cursor.execute("SELECT COUNT(*) FROM safe_havens")
    if cursor.fetchone()[0] == 0:
        seed_safe_havens(cursor)

    cursor.execute("SELECT COUNT(*) FROM crowdsourced_reports")
    if cursor.fetchone()[0] == 0:
        seed_crowdsourced_reports(cursor)

    cursor.execute("SELECT COUNT(*) FROM incidents")
    if cursor.fetchone()[0] == 0:
        seed_incidents(cursor)

    cursor.execute("SELECT COUNT(*) FROM hazard_events")
    if cursor.fetchone()[0] == 0:
        seed_hazard_events(cursor)

    conn.commit()
    conn.close()

def seed_safe_havens(cursor):
    # Centered around an active metro area (e.g., Delhi NCR / CP / Connaught Place coords: 28.6304, 77.2177)
    havens = [
        ("SH-101", "Central Metro Police Station", "POLICE", 28.6328, 77.2195, "Barakhamba Road, Connaught Place", 1, "112", 1),
        ("SH-102", "Apollo 24/7 Emergency Pharmacy", "PHARMACY", 28.6292, 77.2152, "Block E, Inner Circle", 1, "+91 11 2334 1100", 1),
        ("SH-103", "RML General Hospital Emergency Care", "HOSPITAL", 28.6241, 77.2023, "Baba Kharak Singh Marg", 1, "+91 11 2336 5525", 1),
        ("SH-104", "SafeHub Pink Booth & Transit Guard", "SAFE_BOOTH", 28.6345, 77.2210, "Janpath Radial Road 2", 1, "1091", 1),
        ("SH-105", "24x7 Indian Oil Fuel & Safety Post", "ALL_NIGHT_STORE", 28.6268, 77.2241, "Tolstoy Marg Junction", 1, "+91 11 2371 4988", 1)
    ]
    cursor.executemany("""
        INSERT INTO safe_havens (id, name, category, lat, lng, address, open_24x7, phone, verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, havens)

def seed_crowdsourced_reports(cursor):
    now = datetime.utcnow()
    reports = [
        ("CR-001", 28.6360, 77.2140, "POOR_LIGHTING", "Street lights non-functional along alley between Block G & Outer Circle", "WARNING", 14, (now - timedelta(hours=3)).isoformat()),
        ("CR-002", 28.6275, 77.2115, "SAFE_HAVEN", "24-hr security guards on patrol and bright LED floodlights active", "SAFE", 28, (now - timedelta(hours=1)).isoformat()),
        ("CR-003", 28.6220, 77.2185, "HAZARD_OBSTACLE", "Open road excavation without safety reflectors or barrier warning", "WARNING", 9, (now - timedelta(hours=5)).isoformat()),
        ("CR-004", 28.6352, 77.2260, "POLICE_PATROL", "Active PCR Van stationary near metro gate 4 with 2 officers", "SAFE", 34, (now - timedelta(minutes=45)).isoformat()),
        ("CR-005", 28.6298, 77.2080, "SUSPICIOUS_ACTIVITY", "Isolated parking lot with broken CCTV cameras and zero lighting", "DANGER", 19, (now - timedelta(hours=2)).isoformat())
    ]
    cursor.executemany("""
        INSERT INTO crowdsourced_reports (id, lat, lng, category, description, severity, upvotes, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, reports)

def seed_incidents(cursor):
    now = datetime.utcnow()
    incidents = [
        (
            "INC-8801",
            "USR-7712",
            "Aarav Mehta",
            "AUDIO_DISTRESS",
            "CRITICAL",
            "EN_ROUTE",
            28.6315,
            77.2132,
            8.5,
            "Near Palika Bazaar Radial 3, New Delhi",
            (now - timedelta(minutes=14)).isoformat(),
            "High distress acoustic screaming signature detected (3.8 kHz peak + 'Bachao' keyword)",
            1,
            "/api/audio/sample_distress_1.mp3",
            "Heart Rate: 142 BPM (Tachycardia detected)",
            0,
            "PCR Unit 12 (Officer Sanjay)",
            4,
            json.dumps([
                {"time": (now - timedelta(minutes=14)).strftime("%H:%M:%S"), "text": "Distress audio triggered silent countdown"},
                {"time": (now - timedelta(minutes=13)).strftime("%H:%M:%S"), "text": "No cancellation. 10s audio recorded & live GPS transmitted to Command Dispatch"},
                {"time": (now - timedelta(minutes=10)).strftime("%H:%M:%S"), "text": "Automated AI Triage categorized severity as CRITICAL"},
                {"time": (now - timedelta(minutes=7)).strftime("%H:%M:%S"), "text": "PCR Unit 12 dispatched. ETA ~4 mins"}
            ])
        ),
        (
            "INC-8802",
            "USR-4421",
            "Sunita Rao",
            "BIOMETRIC_FALL",
            "HIGH",
            "DISPATCHED",
            28.6254,
            77.2198,
            12.0,
            "Ashoka Road Lane 2, New Delhi",
            (now - timedelta(minutes=28)).isoformat(),
            "Sudden 3.4G impact drop detected via smartwatch accelerometer followed by 45s immobility",
            0,
            None,
            "Heart Rate: 58 BPM (Low responsiveness)",
            0,
            "Rapid Medical Bike #03",
            6,
            json.dumps([
                {"time": (now - timedelta(minutes=28)).strftime("%H:%M:%S"), "text": "Fall impact detected by wearable sensor"},
                {"time": (now - timedelta(minutes=26)).strftime("%H:%M:%S"), "text": "Haptic pulse query timed out without user response"},
                {"time": (now - timedelta(minutes=20)).strftime("%H:%M:%S"), "text": "Paramedic dispatch alert sent to nearest medical post"}
            ])
        ),
        (
            "INC-8803",
            "USR-1092",
            "Farhan Khan",
            "MESH_HOP",
            "CRITICAL",
            "ACTIVE",
            28.6380,
            77.2240,
            15.0,
            "Underground Metro Concourse (Zero Cellular Zone)",
            (now - timedelta(minutes=6)).isoformat(),
            "Decentralized Sahayata SOS Mesh relayed across 3 offline BLE nodes to Gateway Node-X7",
            1,
            "/api/audio/mesh_voice_note.mp3",
            "Battery: 18% | 3 P2P Hops Traversed",
            3,
            None,
            None,
            json.dumps([
                {"time": (now - timedelta(minutes=6)).strftime("%H:%M:%S"), "text": "SOS originated in zero-cellular basement subway"},
                {"time": (now - timedelta(minutes=5)).strftime("%H:%M:%S"), "text": "Packet hopped: Node-Basement -> Node-Escalator -> Node-SurfaceGate"},
                {"time": (now - timedelta(minutes=3)).strftime("%H:%M:%S"), "text": "Surface Gateway Node-X7 connected to Cloud and pushed SOS payload"}
            ])
        )
    ]
    cursor.executemany("""
        INSERT INTO incidents (
            id, user_id, user_name, trigger_type, severity, status, lat, lng,
            accuracy, address, timestamp, notes, has_audio, audio_url,
            biometric_summary, mesh_hops, responder_assigned, dispatch_eta_min, timeline_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, incidents)

def seed_hazard_events(cursor):
    now = datetime.utcnow()
    events = [
        ("HZ-401", "CAM-01-CRANE", "Zone-A-Heavy-Lift", (now - timedelta(minutes=18)).isoformat(), "PPE_NO_HELMET", "HIGH", "WRK-302", "Worker detected in crane swing radius without certified hardhat", "/snapshots/violation_1.jpg", 1),
        ("HZ-402", "CAM-03-EXCAVATION", "Zone-C-Restricted-Trench", (now - timedelta(minutes=8)).isoformat(), "RESTRICTED_ZONE_BREACH", "CRITICAL", "WRK-108", "Unauthorized entry across laser tripwire perimeter into un-shored trench", "/snapshots/violation_2.jpg", 0),
        ("HZ-403", "CAM-02-SCAFFOLD", "Zone-B-High-Elevation", (now - timedelta(minutes=2)).isoformat(), "PPE_NO_VEST", "MEDIUM", "WRK-419", "Worker at level 3 scaffolding missing high-visibility fluorescent vest", "/snapshots/violation_3.jpg", 0)
    ]
    cursor.executemany("""
        INSERT INTO hazard_events (
            id, camera_id, zone_id, timestamp, violation_type, severity, worker_id, details, snapshot_url, acknowledged
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, events)
