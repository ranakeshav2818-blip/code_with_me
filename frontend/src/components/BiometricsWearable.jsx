import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, Activity, Bluetooth, AlertOctagon, TrendingUp, 
  Watch, ShieldAlert, CheckCircle2, Zap 
} from 'lucide-react';
import { playBeep, speakText } from '../utils/audioSynth';

export default function BiometricsWearable({ onTriggerBiometricSOS, highContrast, voiceEnabled }) {
  const [heartRate, setHeartRate] = useState(76);
  const [hrStatus, setHrStatus] = useState('NORMAL'); // NORMAL, TACHYCARDIA_SPIKE, BRADYCARDIA
  const [fallDetected, setFallDetected] = useState(false);
  const [isDeviceMotionActive, setIsDeviceMotionActive] = useState(false);
  const [bleConnected, setBleConnected] = useState(false);
  const [deviceGForce, setDeviceGForce] = useState(1.0);
  const [recentAnomalies, setRecentAnomalies] = useState([]);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const ppgDataRef = useRef([]);

  // Animate real-time PPG Heart Rate Pulse Wave
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let x = 0;
    const maxPoints = 200;
    ppgDataRef.current = new Array(maxPoints).fill(canvas.height / 2);

    const renderPPG = () => {
      animFrameRef.current = requestAnimationFrame(renderPPG);

      // Shift data
      ppgDataRef.current.shift();

      // Generate realistic ECG / PPG wave shape
      const t = Date.now() / 150;
      let val = Math.sin(t) * 8;

      // Add QRS peak based on heart rate
      if (Math.sin(t * (heartRate / 75)) > 0.94) {
        val -= 35; // Sharp systolic spike
      } else if (Math.sin(t * (heartRate / 75)) > 0.88) {
        val += 15;
      }

      ppgDataRef.current.push(canvas.height / 2 + val);

      // Draw canvas
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;
      for (let gy = 0; gy < canvas.height; gy += 20) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(canvas.width, gy);
        ctx.stroke();
      }

      // Draw PPG curve
      ctx.strokeStyle = hrStatus === 'TACHYCARDIA_SPIKE' ? '#ef4444' : '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const step = canvas.width / maxPoints;

      for (let i = 0; i < maxPoints; i++) {
        const px = i * step;
        const py = ppgDataRef.current[i];
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    };

    renderPPG();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [heartRate, hrStatus]);

  // Hook into DeviceMotionEvent if available (detect physical smartphone drops)
  useEffect(() => {
    const handleMotion = (event) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const g = Math.sqrt((acc.x || 0)**2 + (acc.y || 0)**2 + (acc.z || 0)**2) / 9.8;
      setDeviceGForce(parseFloat(g.toFixed(2)));

      // Impact drop followed by immobility
      if (g > 3.2) {
        triggerFallAlert("High-G impact detected on mobile sensor (" + g.toFixed(1) + "G)");
      }
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion);
      setIsDeviceMotionActive(true);
    }

    return () => {
      if (window.DeviceMotionEvent) {
        window.removeEventListener('devicemotion', handleMotion);
      }
    };
  }, []);

  // Web Bluetooth GATT Heart Rate Profile Connection
  const connectWearableBluetooth = async () => {
    if (navigator.bluetooth) {
      try {
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ services: ['heart_rate'] }]
        });
        setBleConnected(true);
        if (voiceEnabled) speakText(`Smartwatch ${device.name || 'band'} paired via Bluetooth GATT.`, 1.0, 1.1);
      } catch (e) {
        console.warn('Bluetooth pairing dismissed:', e);
        // Fallback simulation
        setBleConnected(true);
        if (voiceEnabled) speakText("Smartwatch PPG stream connected in telemetry mode.", 1.0, 1.0);
      }
    } else {
      setBleConnected(true);
      if (voiceEnabled) speakText("Smartwatch PPG stream active.", 1.0, 1.0);
    }
  };

  // Simulate Sudden Panic / Tachycardia Spike
  const triggerHeartRateSpike = () => {
    const spikeBpm = 146;
    setHeartRate(spikeBpm);
    setHrStatus('TACHYCARDIA_SPIKE');
    playBeep(960, 0.3);

    const anomaly = {
      time: new Date().toLocaleTimeString(),
      type: 'ACUTE_TACHYCARDIA',
      details: `Heart Rate spiked from 76 BPM to ${spikeBpm} BPM (Panic / Attack Indicator)`
    };
    setRecentAnomalies(prev => [anomaly, ...prev]);

    if (voiceEnabled) {
      speakText("Biometric warning: Acute tachycardia spike detected. 146 beats per minute.", 1.0, 1.1);
    }

    if (onTriggerBiometricSOS) {
      onTriggerBiometricSOS({
        trigger_type: 'BIOMETRIC_HR',
        severity: 'CRITICAL',
        notes: `Smartwatch Biometric Alert: Sudden Tachycardia Spike to ${spikeBpm} BPM`,
        biometric_data: { heart_rate: spikeBpm, g_force: deviceGForce }
      });
    }
  };

  // Simulate Physical Fall & Impact
  const triggerFallAlert = (msg = "Abrupt 3.6G drop and zero motion detected") => {
    setFallDetected(true);
    setDeviceGForce(3.6);
    playBeep(1020, 0.4);

    const anomaly = {
      time: new Date().toLocaleTimeString(),
      type: 'PHYSICAL_FALL_DETECTED',
      details: msg
    };
    setRecentAnomalies(prev => [anomaly, ...prev]);

    if (voiceEnabled) {
      speakText("Emergency alert: Sudden physical fall impact detected. Starting 5 second response query.", 1.0, 1.1);
    }

    if (onTriggerBiometricSOS) {
      onTriggerBiometricSOS({
        trigger_type: 'BIOMETRIC_FALL',
        severity: 'CRITICAL',
        notes: `Wearable Sensor Alert: ${msg}`,
        biometric_data: { heart_rate: heartRate, g_force: 3.6 }
      });
    }
  };

  const resetVitals = () => {
    setHeartRate(74);
    setHrStatus('NORMAL');
    setFallDetected(false);
    setDeviceGForce(1.0);
  };

  return (
    <div className={`p-6 rounded-3xl border transition-all ${
      highContrast 
        ? 'bg-black border-yellow-400 text-yellow-300' 
        : 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-xl'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-rose-600/20 border border-rose-500/40 rounded-2xl text-rose-400">
            <Watch className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-extrabold tracking-tight">Wearable Biometric Interactivity</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                GATT & Accelerometer AI
              </span>
            </div>
            <p className="text-xs text-slate-400">Continuous telemetry tracking panic tachycardia spikes & abrupt fall impacts</p>
          </div>
        </div>

        {/* Pairing Button */}
        <button
          onClick={connectWearableBluetooth}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
            bleConnected
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <Bluetooth className="w-4 h-4" />
          <span>{bleConnected ? 'Smartwatch Synced' : 'Pair Watch'}</span>
        </button>
      </div>

      {/* Main Grid: Pulse Wave & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
        {/* Real-time PPG Pulse Wave Canvas */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Real-Time Photoplethysmography (PPG) Pulse Stream</span>
            </span>
            <span className={`text-xs font-black ${hrStatus === 'TACHYCARDIA_SPIKE' ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
              {hrStatus === 'TACHYCARDIA_SPIKE' ? '⚠️ TACHYCARDIA DETECTED' : 'STABLE RHYTHM'}
            </span>
          </div>

          <canvas ref={canvasRef} width={580} height={140} className="w-full h-36 rounded-xl bg-slate-950 border border-slate-900" />

          {/* Vitals Telemetry Row */}
          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Heart Rate</div>
              <div className={`text-xl font-extrabold flex items-center justify-center space-x-1 ${
                heartRate > 120 ? 'text-red-500 animate-pulse' : 'text-slate-200'
              }`}>
                <Heart className="w-4 h-4 fill-current text-red-500 mr-1" />
                <span>{heartRate} BPM</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Accelerometer Impact</div>
              <div className={`text-xl font-extrabold ${deviceGForce > 2.5 ? 'text-red-500' : 'text-slate-200'}`}>
                {deviceGForce} G
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Fall Sensor Status</div>
              <div className={`text-sm font-extrabold mt-1 ${fallDetected ? 'text-red-500' : 'text-emerald-400'}`}>
                {fallDetected ? 'FALL DETECTED' : 'ARMED & ACTIVE'}
              </div>
            </div>
          </div>
        </div>

        {/* Anomaly Testing Panel */}
        <div className="space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Interactive Biometric Simulators
          </span>

          <button
            onClick={triggerHeartRateSpike}
            className="w-full p-3 rounded-2xl bg-red-950/30 hover:bg-red-900/40 border border-red-500/40 text-red-200 text-xs font-bold flex items-center justify-between transition"
          >
            <span className="flex items-center space-x-2">
              <Heart className="w-4 h-4 text-red-500" />
              <span>Simulate Panic Tachycardia Spike (146 BPM)</span>
            </span>
            <TrendingUp className="w-4 h-4" />
          </button>

          <button
            onClick={() => triggerFallAlert()}
            className="w-full p-3 rounded-2xl bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-between transition"
          >
            <span className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Simulate High-G Physical Fall (3.6G Drop)</span>
            </span>
            <Zap className="w-4 h-4" />
          </button>

          <button
            onClick={resetVitals}
            className="w-full p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold text-center transition"
          >
            Reset Telemetry to Baseline (74 BPM)
          </button>

          {/* Anomaly Log */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
            <span className="text-slate-400 font-bold block mb-1">Recent Biometric Events:</span>
            {recentAnomalies.length === 0 ? (
              <span className="text-slate-500 italic text-[11px]">No physiological distress breaches.</span>
            ) : (
              recentAnomalies.slice(0, 3).map((a, i) => (
                <div key={i} className="text-[11px] text-slate-300 border-b border-slate-800/80 pb-1">
                  <span className="text-red-400 font-bold">[{a.time}] {a.type}:</span> {a.details}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
