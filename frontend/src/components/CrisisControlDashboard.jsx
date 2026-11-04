import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, Radio, AlertOctagon, Phone, UserCheck, 
  MapPin, Clock, Volume2, Send, Activity, CheckCircle2, ChevronRight, Layers, Filter 
} from 'lucide-react';
import L from 'leaflet';
import { getIncidents, updateIncidentStatus } from '../utils/api';
import { playBeep, speakText } from '../utils/audioSynth';

export default function CrisisControlDashboard({ highContrast, voiceEnabled }) {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [responderName, setResponderName] = useState('PCR Patrol #12');
  const [etaMinutes, setEtaMinutes] = useState(4);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  // Fetch incidents
  const loadIncidents = async () => {
    const data = await getIncidents();
    if (data && data.incidents) {
      setIncidents(data.incidents);
      if (!selectedIncident && data.incidents.length > 0) {
        setSelectedIncident(data.incidents[0]);
      }
    }
  };

  useEffect(() => {
    loadIncidents();
    const interval = setInterval(loadIncidents, 4000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.6320, 77.2180],
      zoom: 14,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render markers on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || incidents.length === 0) return;

    // Remove old markers
    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};

    incidents.forEach(inc => {
      const isCritical = inc.severity === 'CRITICAL';
      const isSelected = selectedIncident?.id === inc.id;

      const beaconIcon = L.divIcon({
        className: 'incident-beacon',
        html: `<div style="
          background-color: ${isCritical ? '#ef4444' : '#f59e0b'};
          width: ${isSelected ? '24px' : '18px'};
          height: ${isSelected ? '24px' : '18px'};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 15px ${isCritical ? 'rgba(239,68,68,0.9)' : 'rgba(245,158,11,0.9)'};
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 10px; font-weight: bold;
        ">${isCritical ? '🚨' : '⚠️'}</div>`,
        iconSize: [24, 24]
      });

      const marker = L.marker([inc.location.lat, inc.location.lng], { icon: beaconIcon })
        .addTo(map)
        .bindPopup(`<b>${inc.id}</b><br/>Victim: ${inc.user_name}<br/>Trigger: ${inc.trigger_type}<br/>Status: <b>${inc.status}</b>`);

      marker.on('click', () => {
        setSelectedIncident(inc);
      });

      markersRef.current[inc.id] = marker;
    });

    if (selectedIncident) {
      map.panTo([selectedIncident.location.lat, selectedIncident.location.lng]);
    }
  }, [incidents, selectedIncident]);

  // Dispatch Responder Action
  const handleAssignResponder = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;

    await updateIncidentStatus(selectedIncident.id, 'DISPATCHED', responderName, etaMinutes);
    playBeep(920, 0.2);

    if (voiceEnabled) {
      speakText(`${responderName} assigned to incident ${selectedIncident.id}. ETA ${etaMinutes} minutes.`, 1.0, 1.1);
    }

    // Refresh state
    loadIncidents();
  };

  // Resolve Incident Action
  const handleResolveIncident = async () => {
    if (!selectedIncident) return;
    await updateIncidentStatus(selectedIncident.id, 'RESOLVED');
    playBeep(640, 0.15);
    if (voiceEnabled) speakText(`Incident ${selectedIncident.id} marked as resolved.`, 1.0, 1.0);
    loadIncidents();
  };

  // Send Broadcast Alert
  const handleSendBroadcast = (e) => {
    e.preventDefault();
    if (!broadcastText) return;
    setBroadcastSent(true);
    playBeep(1100, 0.25);
    if (voiceEnabled) speakText(`Command Broadcast: ${broadcastText}`, 1.0, 1.1);
    setTimeout(() => {
      setBroadcastSent(false);
      setBroadcastText('');
    }, 3000);
  };

  const filtered = incidents.filter(i => filterSeverity === 'ALL' || i.severity === filterSeverity);

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
              <h2 className="text-lg font-extrabold tracking-tight">Crisis Control Command UI</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                LIVE DISPATCH FEED
              </span>
            </div>
            <p className="text-xs text-slate-400">Tactical multi-incident command map with automated AI triage & unit dispatch</p>
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-2" />
          {['ALL', 'CRITICAL', 'HIGH'].map(s => (
            <button
              key={s}
              onClick={() => setFilterSeverity(s)}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filterSeverity === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Command Map + AI Triage Queue + Victim Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6">
        {/* Left Column: AI Triage Queue (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Incidents Queue ({filtered.length})
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">Live Sync</span>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {filtered.map(inc => {
              const isCrit = inc.severity === 'CRITICAL';
              const isSelected = selectedIncident?.id === inc.id;

              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                    isSelected
                      ? isCrit
                        ? 'bg-red-950/40 border-red-500 shadow-lg shadow-red-950'
                        : 'bg-amber-950/40 border-amber-500 shadow-lg'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-200">{inc.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      isCrit ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {inc.severity}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-100 mt-1">{inc.user_name}</div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{inc.notes}</div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                    <span>{inc.trigger_type}</span>
                    <span className="font-semibold text-emerald-400">{inc.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center / Right Column: Tactical Map & Incident Details (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Tactical Map */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-72">
            <div ref={mapContainerRef} className="w-full h-full" />
            <div className="absolute top-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
              TACTICAL RADAR: {filtered.length} INCIDENTS MAPPED
            </div>
          </div>

          {/* Incident Details Drawer */}
          {selectedIncident && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-extrabold text-slate-100">{selectedIncident.user_name}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-slate-300">
                      {selectedIncident.id}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>{selectedIncident.location.address}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    AI Urgency Score: 92/100
                  </span>
                  <button
                    onClick={handleResolveIncident}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>

              {/* Telemetry & Audio clip row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 font-semibold block mb-1">Vitals & Network Telemetry</span>
                  <div className="text-slate-200 font-mono font-bold">
                    {selectedIncident.biometric_summary || "Telemetry Synced"}
                  </div>
                  <div className="text-slate-400 mt-1">
                    Mesh Hops: {selectedIncident.mesh_hops || 0} peer relays traversed
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                  <span className="text-slate-400 font-semibold block mb-1">Ambient Distress Audio Clip</span>
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] text-slate-300">10-Second Continuous Recording</span>
                  </div>
                </div>
              </div>

              {/* Dispatch Form */}
              <form onSubmit={handleAssignResponder} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <select
                  value={responderName}
                  onChange={(e) => setResponderName(e.target.value)}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 font-semibold"
                >
                  <option value="PCR Patrol #12 (Officer Sanjay)">🚓 PCR Patrol #12 (Officer Sanjay)</option>
                  <option value="Rapid Paramedic Bike #03">🚑 Rapid Paramedic Bike #03</option>
                  <option value="Site Safety Supv (Vikram)">👷 Site Safety Supv (Vikram)</option>
                  <option value="Special Quick Response Unit">🚨 Special Quick Response Unit</option>
                </select>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">ETA:</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={etaMinutes}
                    onChange={(e) => setEtaMinutes(parseInt(e.target.value) || 5)}
                    className="w-16 p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-center font-bold text-slate-200"
                  />
                  <span className="text-xs text-slate-400">mins</span>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-indigo-950 shrink-0"
                >
                  Dispatch Unit
                </button>
              </form>
            </div>
          )}

          {/* Mass Emergency Evacuation / Broadcast Form */}
          <form onSubmit={handleSendBroadcast} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <Radio className="w-5 h-5 text-red-500 shrink-0 animate-pulse" />
            <input
              type="text"
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="Broadcast mass emergency or evacuation advisory to all local devices..."
              className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow"
            >
              {broadcastSent ? 'Sent!' : 'Broadcast'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
