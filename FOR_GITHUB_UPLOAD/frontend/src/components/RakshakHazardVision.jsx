import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, Video, ShieldCheck, AlertOctagon, Send, Bell, 
  Camera, CheckCircle2, XCircle, AlertTriangle, RefreshCw 
} from 'lucide-react';
import { analyzeVisionFrame } from '../utils/api';
import { playBeep, speakText } from '../utils/audioSynth';

export default function RakshakHazardVision({ highContrast, voiceEnabled }) {
  const [selectedCamera, setSelectedCamera] = useState('CAM-01-CRANE');
  const [useWebcam, setUseWebcam] = useState(false);
  const [currentCondition, setCurrentCondition] = useState('missing_ppe');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoScan, setAutoScan] = useState(true);
  const [violationHistory, setViolationHistory] = useState([
    { id: 'HZ-401', cam: 'CAM-01-CRANE', time: '19:10:15', type: 'MISSING_HELMET', severity: 'HIGH', worker: 'WRK-302', status: 'ALERT_SENT' },
    { id: 'HZ-402', cam: 'CAM-03-EXCAVATION', time: '19:04:30', type: 'ZONE_BREACH', severity: 'CRITICAL', worker: 'WRK-108', status: 'SUPERVISOR_NOTIFIED' }
  ]);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const autoScanIntervalRef = useRef(null);

  // Initialize and run detection
  const runDetection = async (condition = currentCondition) => {
    setIsProcessing(true);
    const result = await analyzeVisionFrame(selectedCamera, 'Zone-A-Heavy-Lift', condition);
    setAnalysisResult(result);
    setIsProcessing(false);

    // Draw detections on Canvas
    drawDetections(result);

    // If violation detected, trigger sound & add to history
    if (result.violations_detected > 0) {
      playBeep(940, 0.25, 'sawtooth');
      if (voiceEnabled) {
        speakText(`Rakshak Vision Alert. ${result.alert_summary}`, 1.0, 1.1);
      }

      setViolationHistory(prev => [
        {
          id: `HZ-${Date.now().toString(36).toUpperCase()}`,
          cam: selectedCamera,
          time: new Date().toLocaleTimeString(),
          type: result.fall_detected ? 'SLIP_AND_FALL' : (result.hazard_breach ? 'ZONE_BREACH' : 'PPE_VIOLATION'),
          severity: result.fall_detected || result.hazard_breach ? 'CRITICAL' : 'HIGH',
          worker: 'WRK-DEMO',
          status: 'WHATSAPP_DISPATCHED'
        },
        ...prev.slice(0, 9)
      ]);
    }
  };

  // Draw bounding boxes, labels, and hazard red-zones on Canvas
  const drawDetections = (result) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Draw synthetic CCTV background (simulated industrial warehouse / crane bay)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines for CCTV perspective
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Hazard Red Zone Perimeter (Restricted Laser Tripwire Area)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(w * 0.45, h * 0.35);
    ctx.lineTo(w * 0.90, h * 0.35);
    ctx.lineTo(w * 0.95, h * 0.92);
    ctx.lineTo(w * 0.40, h * 0.92);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('⚠️ RESTRICTED DANGER ZONE: CRANE SWING RADIUS', w * 0.45, h * 0.32);

    // Draw Detections
    if (result && result.detections) {
      result.detections.forEach((det) => {
        const [xMin, yMin, xMax, yMax] = det.box;
        const bx = xMin * w;
        const by = yMin * h;
        const bw = (xMax - xMin) * w;
        const bh = (yMax - yMin) * h;

        ctx.strokeStyle = det.is_violation ? '#ef4444' : '#10b981';
        ctx.lineWidth = det.is_violation ? 3 : 2;
        ctx.strokeRect(bx, by, bw, bh);

        // Bounding tag background
        ctx.fillStyle = det.is_violation ? '#ef4444' : '#10b981';
        ctx.fillRect(bx, by - 20, bw, 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(
          `${det.label.toUpperCase()} (${(det.confidence * 100).toFixed(0)}%)`,
          bx + 4,
          by - 6
        );

        if (det.status_text) {
          ctx.fillStyle = det.is_violation ? '#fca5a5' : '#a7f3d0';
          ctx.font = '10px monospace';
          ctx.fillText(det.status_text, bx, by + bh + 14);
        }
      });
    }

    // CCTV Timestamp & Watermark
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText(`REC ● ${selectedCamera} | ${new Date().toLocaleTimeString()} | YOLOv8-Safety`, 12, 22);
  };

  // Toggle user real webcam
  const toggleWebcam = async () => {
    if (useWebcam) {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      setUseWebcam(false);
      drawDetections(analysisResult);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setUseWebcam(true);
      } catch (err) {
        alert('Webcam access not permitted or unavailable.');
      }
    }
  };

  useEffect(() => {
    runDetection('missing_ppe');
  }, [selectedCamera]);

  // Periodic Auto-scan simulation
  useEffect(() => {
    if (autoScan) {
      autoScanIntervalRef.current = setInterval(() => {
        runDetection();
      }, 5000);
    }
    return () => {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
    };
  }, [autoScan, currentCondition, selectedCamera]);

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
            <Eye className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-extrabold tracking-tight">Rakshak Computer Vision Portal</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                YOLOv8 & Pose Estimation
              </span>
            </div>
            <p className="text-xs text-slate-400">Real-time CCTV AI monitoring for PPE compliance, hazard zone breaches & fall detection</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200"
          >
            <option value="CAM-01-CRANE">📹 CAM-01: Overhead Crane Bay</option>
            <option value="CAM-02-SCAFFOLD">📹 CAM-02: Scaffolding Level 3</option>
            <option value="CAM-03-EXCAVATION">📹 CAM-03: Restricted Trench</option>
          </select>

          <button
            onClick={toggleWebcam}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
              useWebcam ? 'bg-rose-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{useWebcam ? 'Disable Cam' : 'Use Webcam'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Video Stream Canvas & Automated Supervisor Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
        {/* CCTV Feed Canvas */}
        <div className="lg:col-span-2 relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col items-center justify-center min-h-[320px]">
          {useWebcam && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          )}

          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="w-full h-auto max-h-[360px] object-contain relative z-10"
          />

          {/* Real-time Compliance Status Pill */}
          <div className="absolute bottom-3 left-3 z-20 flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${analysisResult?.violations_detected === 0 ? 'bg-emerald-500' : 'bg-red-500 animate-ping'}`}></span>
            <span className="font-bold text-slate-200">
              PPE Compliance: {analysisResult?.ppe_compliance_rate || 50}%
            </span>
          </div>
        </div>

        {/* Automated WhatsApp / SMS Alert Box & Scenario Switcher */}
        <div className="space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Automated Site Supervisor Alert (WhatsApp / SMS)
          </span>

          {/* Simulated WhatsApp Notification Card */}
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 text-emerald-200 text-xs shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-900/40">
              <span className="font-bold flex items-center space-x-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp Urgent Dispatch</span>
              </span>
              <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 font-bold">
                DELIVERED
              </span>
            </div>

            <div className="my-2.5 space-y-1 text-slate-300">
              <div className="text-[11px] text-slate-400 font-mono">
                TO: Safety Supervisor Vikram (+91 98333 44455)
              </div>
              <p className="font-medium text-emerald-300">
                {analysisResult?.alert_summary || "Workplace zone monitored. No active alerts."}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-emerald-900/40 text-[10px] text-slate-400">
              <span>Automated via Rakshak AI Gateway</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Interactive Scenario Injector */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-300 block mb-1">
              Inject Test Hazard Scenario:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => { setCurrentCondition('compliant'); runDetection('compliant'); }}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 font-semibold text-center transition"
              >
                ✅ 100% Compliant
              </button>
              <button
                onClick={() => { setCurrentCondition('missing_ppe'); runDetection('missing_ppe'); }}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 font-semibold text-center transition"
              >
                ⚠️ Missing PPE
              </button>
              <button
                onClick={() => { setCurrentCondition('restricted_breach'); runDetection('restricted_breach'); }}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-rose-400 font-semibold text-center transition"
              >
                🚨 Zone Breach
              </button>
              <button
                onClick={() => { setCurrentCondition('fall_detected'); runDetection('fall_detected'); }}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-red-500 font-semibold text-center transition"
              >
                🚑 Slip & Fall
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Violation Event Logs Table */}
      <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
        <span className="text-xs font-bold text-slate-300 block mb-3">
          Rakshak Workplace Violation Log
        </span>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2">Incident ID</th>
                <th className="pb-2">Camera / Zone</th>
                <th className="pb-2">Violation Type</th>
                <th className="pb-2">Severity</th>
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Action Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {violationHistory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/40">
                  <td className="py-2.5 font-mono text-slate-200">{item.id}</td>
                  <td className="py-2.5">{item.cam}</td>
                  <td className="py-2.5 font-semibold text-rose-400">{item.type}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {item.severity}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-400">{item.time}</td>
                  <td className="py-2.5 text-emerald-400 font-medium">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
