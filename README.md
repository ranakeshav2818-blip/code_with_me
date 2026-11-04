# GuardianAI — All-in-One Real-Time Human Safety Ecosystem

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-10b981.svg)](/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20v2.0-0284c7.svg)](/)
[![AI Models](https://img.shields.io/badge/AI%2FLayer-YOLOv8%20%7C%20Whisper-rose.svg)](/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](/)

**GuardianAI** is a production-ready, highly responsive, and accessible Progressive Web Application (PWA) designed to predict, prevent, and respond to emergencies in real time. It caters to **personal safety**, **disaster management**, and **workplace security** using advanced AI models, web APIs, real-time WebSockets, and zero-connectivity peer-to-peer mesh networking.

---

## 🌟 Key Architecture & Tech Stack

```
                          ┌───────────────────────────────────────────────┐
                          │         GuardianAI Frontend PWA 2.0           │
                          │   (React 19 + Tailwind CSS + Lucide Icons)    │
                          └──────────────┬──────────────────┬─────────────┘
                                         │                  │
                ┌────────────────────────┴───────┐   ┌──────┴──────────────────────┐
                │  Citizen & Worker Safety UI    │   │ Crisis Command & CCTV UI    │
                │  - One-Tap SOS (5s Countdown)  │   │ - Tactical Incident Radar   │
                │  - SunoAI Audio Distress       │   │ - Automated AI Triage       │
                │  - SafePath Predictive Routing │   │ - Rakshak YOLO Hazard Portal│
                │  - Sahayata BLE Offline Mesh   │   │ - Automated Dispatch Units  │
                │  - Wearable Biometrics PPG     │   │ - SMS / WhatsApp Webhooks   │
                │  - Fake Call & Stealth PIN     │   │ - Evacuation Broadcasts     │
                └────────────────┬───────────────┘   └──────┬──────────────────────┘
                                 │ HTTP & WebSockets        │
                          ┌──────▼──────────────────────────▼─────────────┐
                          │           FastAPI High-Throughput Hub         │
                          │      (WebSockets, Async Redis Queue, SQLite)  │
                          └──────────────┬──────────────────┬─────────────┘
                                         │                  │
                ┌────────────────────────┴───────┐   ┌──────┴──────────────────────┐
                │        AI / ML Inference       │   │     Storage & In-Memory     │
                │ - Whisper NLP Keyword Spotter  │   │ - SQLite / PostgreSQL Store │
                │ - Spectral Scream Resonance AI │   │ - Ultra-Low Latency Redis   │
                │ - SafePath Multi-Factor Engine │   │   Priority SOS Queue        │
                │ - Rakshak YOLOv8 Hazard Vision │   │ - Real-Time Location Cache  │
                └────────────────────────────────┘   └─────────────────────────────┘
```

- **Frontend**: React 19 + Tailwind CSS v4, mobile-first design, high-contrast accessible mode, Web Audio API synthesis engine, Leaflet tactical mapping, Service Worker offline caching.
- **Backend**: Python FastAPI with high-throughput WebSockets (`/ws/crisis-control`, `/ws/telemetry`).
- **AI/ML Layer**:
  - **SunoAI**: Dual NLP Whisper keyword spotting ("Help", "Bachao", "Save me", "Madad") + acoustic scream resonance analyzer (2.5 kHz – 4.5 kHz band).
  - **SafePath**: Multi-criteria predictive routing engine computing dynamic safety scores from illumination data, crime stats, safe havens, and crowdsourced pins.
  - **Rakshak Vision**: YOLOv8 hazard detection for PPE compliance (Helmets, Vests, Goggles), restricted perimeter tripwire breaches, and slip-and-fall postures.
- **Database & Cache**: SQLite/PostgreSQL store + In-memory ultra-low latency Redis-compatible priority queue and real-time telemetry cache.

---

## 📦 Core Modules

### 1. Module A: AI-Powered Audio Distress Monitor (SunoAI)
- **Live Background Acoustic Monitoring**: Web Audio API analyser node with FFT frequency bars and scream band highlight.
- **Dual Voice & Acoustic Trigger**:
  - Recognizes multilingual distress keywords ("Help", "Bachao", "Save me", "Madad", "Police").
  - Detects acoustic scream resonance frequencies ($2400\text{ Hz} - 4800\text{ Hz}$ at $>70\text{ dB}$).
- **Automatic Action**: Initiates a 5-second silent cancelable countdown; automatically captures a 10-second ambient audio recording with `MediaRecorder` and dispatches it with live coordinates to responders.

### 2. Module B: Predictive Safety Navigation & Crowdsourced Routing (SafePath)
- **Leaflet Interactive Map**: Customized dark tactical tiles with layer toggles (Safe Havens, Street Illumination Heat-zones, Crowdsourced Danger Pins).
- **Dynamic Safety Score**:
  $$\text{Safety Score} = w_l \times L + w_c \times (100 - C) + w_h \times H + w_r \times R$$
  Compares the standard fastest route ($48/100$) against the **AI SafePath Route** ($94/100$) passing through well-lit boulevards and police checkpoints.
- **Crowdsourced Safety Check-ins**: Community members can pin broken streetlights, suspicious activity, or safe open establishments in real time.
- **Turn-by-Turn Simulated Navigation**: Real-time waypoint walker with spoken audio safety prompts.

### 3. Module C: Zero-Connectivity Decentralized SOS Mesh (Sahayata)
- **PWA Offline Operation**: Service Worker caches all critical assets, storing offline distress events locally.
- **P2P Mesh Network**: Simulates and interfaces with Web Bluetooth API and Wi-Fi Direct protocols.
- **Multi-Hop Hop Propagation**: Allows devices in zero-cellular basements or disaster zones to hop distress signals device-to-device ($Node_A \to Node_B \to Node_C$) until reaching a surface Gateway Node that pushes the payload to the Cloud.
- **Interactive Mesh Radar**: Visualizes peer nodes, signal strength (RSSI), battery levels, and hop history.

### 4. Module D: Computer Vision Hazard Detection Portal (Rakshak)
- **Live Video / CCTV Feed**: Supports industrial camera feeds (Crane Bay, Scaffold Elevation, Excavation Trench) and live webcam streaming.
- **YOLOv8 & Pose Hazard Detection**:
  - Hardhat / Helmet compliance bounding boxes
  - High-visibility reflective vest verification
  - Eye protection compliance
  - Laser tripwire restricted perimeter breach alarms
  - Slip, trip, and fall horizontal posture detection
- **Automated Dispatch**: Instantly triggers automated WhatsApp / SMS supervisor notifications with violation snapshots.

---

## 🚀 Advanced Winning Features (The Edge)

1. **Biometric Interactivity**:
   - Web Bluetooth GATT Heart Rate profile and real-time PPG pulse wave curve.
   - Panic / Tachycardia detection ($>140\text{ BPM}$).
   - `DeviceMotionEvent` accelerometer monitor detecting high-G drops ($>3.2\text{G}$) followed by immobility.
2. **Fake Call & Stealth Disguise**:
   - **Fake Call**: Ultra-realistic incoming call simulator with customizable caller personas ("Dad ❤️", "Inspector Sharma", "Director Anita"), dual-frequency telephone ringtone synthesis, and believable spoken voice dialogue.
   - **Stealth Camouflage**: Instantly transforms GuardianAI into a fully functional Calculator. Typing secret PIN `9999=` silently dispatches a distress beacon without changing the screen.
3. **Centralized Crisis Control Dashboard**:
   - Responders tactical command UI displaying active distress beacons categorized by automated AI triage severity (CRITICAL, HIGH, MEDIUM).
   - One-click unit dispatch (PCR Patrol #12, Rapid Medical Bike #03, Site Supervisor) with ETA countdown.
   - Ambient distress audio player and victim medical ID drawer.

---

## 🛠️ Quick Start & Running Locally

### Prerequisites
- Python 3.10+
- Node.js v18+

### 1. Launch the Application
Double-click `run_guardian.bat` or run in PowerShell:
```powershell
.\run_guardian.ps1
```

Or start manually:
```powershell
# In terminal 1 (FastAPI backend + unified PWA server)
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser to: **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

### 2. Run the Automated Test Suite
```powershell
python test_system.py
```
All 8 integration tests verify health, PWA serving, Whisper audio distress, SafePath algorithms, Sahayata mesh relay, Rakshak hazard vision, and emergency SOS triage.
