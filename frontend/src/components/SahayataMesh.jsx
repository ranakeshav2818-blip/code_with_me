import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, Bluetooth, Wifi, WifiOff, Share2, Layers, 
  ArrowRight, ShieldAlert, CheckCircle2, Zap, AlertTriangle 
} from 'lucide-react';
import { relayMeshPacket } from '../utils/api';
import { playBeep, speakText } from '../utils/audioSynth';

export default function SahayataMesh({ onTriggerMeshSOS, highContrast, voiceEnabled }) {
  const [isMeshActive, setIsMeshActive] = useState(true);
  const [bluetoothSupported, setBluetoothSupported] = useState(false);
  const [activeNodes, setActiveNodes] = useState([
    { id: 'NODE-GW-X7', name: 'Gateway Surface Node', role: 'GATEWAY', status: 'ONLINE_4G', battery: 92, hops: 0, rssi: -48 },
    { id: 'NODE-PEER-02', name: 'Metro Escalator Relay', role: 'RELAY', status: 'BLE_PEER', battery: 78, hops: 1, rssi: -62 },
    { id: 'NODE-PEER-03', name: 'Basement Concourse Relay', role: 'RELAY', status: 'BLE_PEER', battery: 65, hops: 2, rssi: -74 },
    { id: 'NODE-VICTIM-ME', name: 'My Device (Isolated)', role: 'ORIGIN', status: 'ZERO_CELLULAR', battery: 84, hops: 3, rssi: -85 }
  ]);
  const [offlinePackets, setOfflinePackets] = useState([
    {
      packetId: 'PKT-9901',
      origin: 'NODE-VICTIM-ME',
      timestamp: '19:12:00',
      hops: 3,
      deliveredToCloud: true,
      gps: '28.6380, 77.2240',
      message: 'Disaster zone collapse in underground parking. 2 citizens stranded.'
    }
  ]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [currentHopStep, setCurrentHopStep] = useState(null);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    setBluetoothSupported(Boolean(navigator.bluetooth));
  }, []);

  // Animate Mesh Radar Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let angle = 0;
    const renderRadar = () => {
      animFrameRef.current = requestAnimationFrame(renderRadar);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const maxRadius = Math.min(cx, cy) - 20;

      // Draw concentric radar rings
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      for (let r = 40; r <= maxRadius; r += 40) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw crosshairs
      ctx.beginPath();
      ctx.moveTo(cx, 10);
      ctx.lineTo(cx, canvas.height - 10);
      ctx.moveTo(10, cy);
      ctx.lineTo(canvas.width - 10, cy);
      ctx.stroke();

      // Sweeping radar beam
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      const sweepGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
      sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
      sweepGrad.addColorStop(1, 'rgba(16, 185, 129, 0.25)');
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxRadius, -Math.PI / 4, 0);
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.restore();
      angle += 0.025;

      // Render Nodes on radar
      const nodeCoords = [
        { x: cx, y: cy - 70, label: 'GATEWAY X7', color: '#10b981', ring: true },
        { x: cx + 60, y: cy - 10, label: 'RELAY-02', color: '#38bdf8' },
        { x: cx - 50, y: cy + 40, label: 'RELAY-03', color: '#38bdf8' },
        { x: cx + 10, y: cy + 85, label: 'ME (OFFLINE)', color: '#ef4444', ring: true }
      ];

      // Draw hop links between nodes
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(nodeCoords[3].x, nodeCoords[3].y);
      ctx.lineTo(nodeCoords[2].x, nodeCoords[2].y);
      ctx.lineTo(nodeCoords[1].x, nodeCoords[1].y);
      ctx.lineTo(nodeCoords[0].x, nodeCoords[0].y);
      ctx.stroke();
      ctx.setLineDash([]);

      nodeCoords.forEach((node) => {
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.ring ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '9px monospace';
        ctx.fillText(node.label, node.x - 24, node.y - 10);
      });
    };

    renderRadar();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Web Bluetooth Pairing or Simulation
  const connectWebBluetooth = async () => {
    if (navigator.bluetooth) {
      try {
        const device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true
        });
        if (voiceEnabled) speakText(`Connected to BLE peer ${device.name || 'node'}`, 1.0, 1.1);
      } catch (err) {
        console.warn('BLE pairing dialog dismissed or unsupported:', err);
      }
    } else {
      if (voiceEnabled) speakText("Web Bluetooth simulated in active mesh.", 1.0, 1.0);
    }
  };

  // Broadcast Offline Distress Mesh Packet (Device-to-Device Multi-Hop Propagation)
  const broadcastMeshPacket = async () => {
    setIsBroadcasting(true);
    playBeep(880, 0.2);

    if (voiceEnabled) {
      speakText("Initiating zero-connectivity Sahayata mesh broadcast. Hopping distress signal across local peer nodes.", 1.0, 1.1);
    }

    const packet = {
      packet_id: `PKT-${Date.now().toString(36).toUpperCase()}`,
      origin_user_id: 'USR-9921',
      origin_user_name: 'Priya Sharma (Disaster Mode)',
      timestamp: new Date().toLocaleTimeString(),
      location: { lat: 28.6380, lng: 77.2240, address: "Underground Basement Level -3" },
      sos_type: 'DECENTRALIZED_MESH_DISASTER',
      hop_count: 0,
      path_nodes: ['NODE-VICTIM-ME'],
      battery_level: 84,
      message: 'Zero cellular coverage! Hopping distress packet through nearby peer devices.'
    };

    // Step 1: Hop to Relay 03
    setCurrentHopStep('Hop 1: My Device -> Relay Node 03 (Basement Concourse)');
    playBeep(920, 0.15);
    await new Promise(r => setTimeout(r, 1200));

    // Step 2: Hop to Relay 02
    setCurrentHopStep('Hop 2: Relay Node 03 -> Relay Node 02 (Escalator Portal)');
    playBeep(1040, 0.15);
    await new Promise(r => setTimeout(r, 1200));

    // Step 3: Gateway Node reaches Cloud
    setCurrentHopStep('Hop 3: Relay Node 02 -> Gateway Node X7 (Active 4G Surface Connection)');
    playBeep(1200, 0.2);
    await new Promise(r => setTimeout(r, 1200));

    // Delivered
    const res = await relayMeshPacket(packet);
    setIsBroadcasting(false);
    setCurrentHopStep(null);

    const newDelivered = {
      packetId: packet.packet_id,
      origin: 'NODE-VICTIM-ME',
      timestamp: new Date().toLocaleTimeString(),
      hops: 3,
      deliveredToCloud: true,
      gps: '28.6380, 77.2240',
      message: packet.message
    };

    setOfflinePackets(prev => [newDelivered, ...prev]);

    if (voiceEnabled) {
      speakText("Mesh packet reached surface gateway node X7. Cloud SOS dispatched successfully.", 1.0, 1.0);
    }

    if (onTriggerMeshSOS) {
      onTriggerMeshSOS({
        id: res.cloud_incident_id,
        trigger_type: 'MESH_HOP',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        location: packet.location,
        timestamp: new Date().toISOString(),
        notes: `Sahayata BLE Mesh relayed across 3 offline nodes to Gateway Node-X7`,
        has_audio: false,
        mesh_hops: 3,
        timeline: [
          { time: new Date().toLocaleTimeString(), text: "SOS originated in zero-cellular basement subway" },
          { time: new Date().toLocaleTimeString(), text: "Packet hopped: Node-ME -> Node-Relay03 -> Node-Relay02" },
          { time: new Date().toLocaleTimeString(), text: "Surface Gateway Node-X7 connected to Cloud and pushed SOS payload" }
        ]
      });
    }
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
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/40 rounded-2xl text-indigo-400">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-extrabold tracking-tight">Sahayata Zero-Connectivity SOS Mesh</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                P2P BLE & Wi-Fi Direct
              </span>
            </div>
            <p className="text-xs text-slate-400">Device-to-device distress packet hopping for disaster zones with zero cellular signal</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={connectWebBluetooth}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <Bluetooth className="w-4 h-4 text-sky-400" />
            <span>BLE Peer Scan</span>
          </button>

          <button
            onClick={broadcastMeshPacket}
            disabled={isBroadcasting}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-lg ${
              isBroadcasting
                ? 'bg-amber-600 text-white animate-pulse'
                : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-950'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{isBroadcasting ? 'Hopping...' : 'Broadcast Mesh SOS'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Radar & Hop Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
        {/* Radar Visualizer */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center relative">
          <div className="w-full flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
            <span>P2P BLE Mesh Radar</span>
            <span className="text-emerald-400 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>4 Nodes Synced</span>
            </span>
          </div>

          <canvas ref={canvasRef} width={280} height={240} className="w-full max-w-[280px] h-[240px]" />

          {/* Hop Progress Notification */}
          {currentHopStep && (
            <div className="mt-3 p-2 rounded-xl bg-amber-500/20 border border-amber-500 text-amber-300 text-[11px] font-bold text-center w-full animate-bounce">
              {currentHopStep}
            </div>
          )}
        </div>

        {/* Mesh Peer Nodes Table */}
        <div className="lg:col-span-2 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Mesh Peers & Gateway Uplink
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeNodes.map((node) => {
              const isGateway = node.role === 'GATEWAY';
              const isMe = node.role === 'ORIGIN';

              return (
                <div
                  key={node.id}
                  className={`p-3.5 rounded-2xl border ${
                    isGateway
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                      : isMe
                        ? 'bg-red-950/20 border-red-500/40 text-red-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{node.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      isGateway ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {node.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
                    <div>
                      <span>STATUS:</span>
                      <div className="font-bold text-slate-200">{node.status}</div>
                    </div>
                    <div>
                      <span>BATTERY:</span>
                      <div className="font-bold text-slate-200">{node.battery}%</div>
                    </div>
                    <div>
                      <span>RSSI:</span>
                      <div className="font-bold text-slate-200">{node.rssi} dBm</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delivered Packet Logs */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-xs font-bold text-slate-300 block mb-2">
              Decentralized SOS Packet Hop History
            </span>
            <div className="space-y-2 text-xs">
              {offlinePackets.map((pkt) => (
                <div key={pkt.packetId} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-mono font-bold text-slate-200">{pkt.packetId}</span>
                      <span className="text-[11px] text-slate-400 ml-2">({pkt.hops} P2P hops)</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{pkt.message}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
                    CLOUD DELIVERED
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
