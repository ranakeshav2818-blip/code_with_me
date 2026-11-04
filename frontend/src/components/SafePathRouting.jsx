import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, Shield, AlertTriangle, Eye, Sun, MapPin, 
  Layers, PlusCircle, Compass, CheckCircle2, ChevronRight, Volume2
} from 'lucide-react';
import L from 'leaflet';
import { calculateSafePath, getSafePathLayers, submitCrowdsourcedReport } from '../utils/api';
import { speakText } from '../utils/audioSynth';

export default function SafePathRouting({ highContrast, voiceEnabled }) {
  const [routesData, setRoutesData] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState('route_safepath');
  const [layersData, setLayersData] = useState(null);
  const [activeLayers, setActiveLayers] = useState({
    safeHavens: true,
    illumination: true,
    crowdsourced: true,
    crimeZones: true
  });
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStepIndex, setNavStepIndex] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [newReportCategory, setNewReportCategory] = useState('POOR_LIGHTING');
  const [newReportDesc, setNewReportDesc] = useState('');
  const [userLocation, setUserLocation] = useState([28.6304, 77.2177]);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylinesRef = useRef({});
  const markersLayerRef = useRef(null);
  const walkerMarkerRef = useRef(null);
  const navIntervalRef = useRef(null);

  // Load SafePath routes and layers
  useEffect(() => {
    async function loadData() {
      const routes = await calculateSafePath(28.6304, 77.2177, 28.6415, 77.2285);
      setRoutesData(routes);
      const layers = await getSafePathLayers();
      setLayersData(layers);
    }
    loadData();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const map = L.map(mapContainerRef.current, {
      center: [28.6340, 77.2210],
      zoom: 15,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Dark tactical tiles from CartoDB or OpenStreetMap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Routes and Markers on the Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !routesData) return;

    // Remove old polylines
    Object.values(polylinesRef.current).forEach(line => map.removeLayer(line));
    polylinesRef.current = {};

    routesData.routes.forEach(route => {
      const isSelected = route.id === selectedRouteId;
      const isSafePath = route.type === 'SAFE_PATH';

      const polyline = L.polyline(route.waypoints, {
        color: isSafePath ? '#10b981' : '#f59e0b',
        weight: isSelected ? 6 : 3,
        opacity: isSelected ? 0.95 : 0.45,
        dashArray: isSafePath ? null : '6, 8',
        lineCap: 'round'
      }).addTo(map);

      polyline.on('click', () => {
        setSelectedRouteId(route.id);
      });

      polylinesRef.current[route.id] = polyline;
    });

    // Add Start and End Pins
    const originIcon = L.divIcon({
      className: 'custom-pin',
      html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(59,130,246,0.8);"></div>`,
      iconSize: [14, 14]
    });

    const destIcon = L.divIcon({
      className: 'custom-pin',
      html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(239,68,68,0.8);"></div>`,
      iconSize: [16, 16]
    });

    L.marker([routesData.origin.lat, routesData.origin.lng], { icon: originIcon }).addTo(map)
      .bindPopup("<b>Your Current Location</b><br/>Connaught Place Radial 1");
    
    L.marker([routesData.destination.lat, routesData.destination.lng], { icon: destIcon }).addTo(map)
      .bindPopup("<b>Destination Safe Zone</b><br/>Barakhamba Transit Hub");

  }, [routesData, selectedRouteId]);

  // Render Map Layers: Safe Havens, Illumination, Crowdsourced Pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer || !layersData) return;

    markersLayer.clearLayers();

    // 1. Safe Havens (Police, 24x7 Pharmacies, Pink Booths)
    if (activeLayers.safeHavens && layersData.safe_havens) {
      layersData.safe_havens.forEach(haven => {
        const havenIcon = L.divIcon({
          className: 'haven-pin',
          html: `<div style="background-color: #10b981; color: white; padding: 4px; border-radius: 8px; font-size: 11px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white;">
            ${haven.category === 'POLICE' ? '👮' : haven.category === 'PHARMACY' ? '💊' : '🛡️'}
          </div>`,
          iconSize: [26, 26]
        });

        L.marker([haven.lat, haven.lng], { icon: havenIcon })
          .bindPopup(`<b>${haven.name}</b><br/>Category: ${haven.category}<br/>Phone: ${haven.phone}<br/><b>Verified 24/7 Safe Haven</b>`)
          .addTo(markersLayer);
      });
    }

    // 2. Crowdsourced Reports (Poor lighting, suspicious activity, police patrol)
    if (activeLayers.crowdsourced && layersData.crowdsourced_reports) {
      layersData.crowdsourced_reports.forEach(report => {
        const isDanger = report.severity === 'DANGER' || report.category === 'POOR_LIGHTING';
        const reportIcon = L.divIcon({
          className: 'report-pin',
          html: `<div style="background-color: ${isDanger ? '#ef4444' : '#3b82f6'}; color: white; padding: 3px; border-radius: 50%; font-size: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px ${isDanger ? 'rgba(239,68,68,0.7)' : 'rgba(59,130,246,0.7)'}; border: 2px solid white;">
            ${report.category === 'POOR_LIGHTING' ? '💡' : isDanger ? '⚠️' : 'ℹ️'}
          </div>`,
          iconSize: [22, 22]
        });

        L.marker([report.lat, report.lng], { icon: reportIcon })
          .bindPopup(`<b>Crowdsourced Safety Check-in</b><br/><b>${report.category}</b>: ${report.description}<br/>Upvotes: ${report.upvotes}`)
          .addTo(markersLayer);
      });
    }

    // 3. Street Illumination Heat-zones
    if (activeLayers.illumination && layersData.illumination_zones) {
      layersData.illumination_zones.forEach(zone => {
        const isHigh = zone.intensity === 'HIGH';
        L.circle(zone.center, {
          radius: zone.radius,
          color: isHigh ? '#fbbf24' : '#ef4444',
          fillColor: isHigh ? '#fde047' : '#f87171',
          fillOpacity: 0.15,
          weight: 1
        }).bindPopup(`<b>${zone.label}</b><br/>Illumination Score: ${zone.score}/100`).addTo(markersLayer);
      });
    }

  }, [layersData, activeLayers]);

  // Turn-by-Turn Simulated Navigation
  const startNavigation = () => {
    if (!routesData) return;
    const currentRoute = routesData.routes.find(r => r.id === selectedRouteId) || routesData.routes[0];
    const waypoints = currentRoute.waypoints;

    setIsNavigating(true);
    setNavStepIndex(0);

    if (voiceEnabled) {
      speakText("SafePath navigation started. Following 100% illuminated boulevard passing Police Help Booth.", 1.0, 1.1);
    }

    let step = 0;
    navIntervalRef.current = setInterval(() => {
      step += 1;
      if (step >= waypoints.length) {
        clearInterval(navIntervalRef.current);
        setIsNavigating(false);
        if (voiceEnabled) {
          speakText("You have arrived safely at your destination.", 1.0, 1.0);
        }
        return;
      }
      setNavStepIndex(step);
      setUserLocation(waypoints[step]);

      // Move marker on map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo(waypoints[step]);
      }
    }, 3500);
  };

  const stopNavigation = () => {
    if (navIntervalRef.current) {
      clearInterval(navIntervalRef.current);
      navIntervalRef.current = null;
    }
    setIsNavigating(false);
  };

  // Submit new Crowdsourced Report
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!newReportDesc) return;

    const newReport = {
      lat: 28.6330 + (Math.random() - 0.5) * 0.005,
      lng: 77.2190 + (Math.random() - 0.5) * 0.005,
      category: newReportCategory,
      description: newReportDesc,
      severity: newReportCategory === 'POOR_LIGHTING' || newReportCategory === 'SUSPICIOUS_ACTIVITY' ? 'DANGER' : 'SAFE'
    };

    await submitCrowdsourcedReport(newReport);
    setShowReportModal(false);
    setNewReportDesc('');

    // Refresh layers
    const updated = await getSafePathLayers();
    setLayersData(updated);

    if (voiceEnabled) {
      speakText("Safety check-in pinned to community map. Thank you for protecting fellow citizens.", 1.0, 1.0);
    }
  };

  const activeRouteObj = routesData?.routes.find(r => r.id === selectedRouteId) || routesData?.routes[0];

  return (
    <div className={`p-6 rounded-3xl border transition-all ${
      highContrast 
        ? 'bg-black border-yellow-400 text-yellow-300' 
        : 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-xl'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-600/20 border border-emerald-500/40 rounded-2xl text-emerald-400">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-extrabold tracking-tight">SafePath Predictive Navigation</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Dynamic Safety Scoring
              </span>
            </div>
            <p className="text-xs text-slate-400">Reroutes along illuminated boulevards, safe havens & verified crowdsourced zones</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Check-in Pin</span>
          </button>

          {!isNavigating ? (
            <button
              onClick={startNavigation}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-emerald-950"
            >
              <Navigation className="w-4 h-4" />
              <span>Start Walk</span>
            </button>
          ) : (
            <button
              onClick={stopNavigation}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider transition shadow-lg"
            >
              <span>Stop Walk</span>
            </button>
          )}
        </div>
      </div>

      {/* Map and Route Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
        {/* Interactive Map View */}
        <div className="lg:col-span-2 relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-96">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Map Layer Overlay Pills */}
          <div className="absolute top-3 left-3 z-[400] flex flex-wrap gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 text-[11px]">
            <button
              onClick={() => setActiveLayers(p => ({ ...p, safeHavens: !p.safeHavens }))}
              className={`px-2 py-1 rounded-lg font-semibold transition ${
                activeLayers.safeHavens ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400'
              }`}
            >
              🛡️ Safe Havens
            </button>
            <button
              onClick={() => setActiveLayers(p => ({ ...p, illumination: !p.illumination }))}
              className={`px-2 py-1 rounded-lg font-semibold transition ${
                activeLayers.illumination ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400'
              }`}
            >
              💡 Street Illumination
            </button>
            <button
              onClick={() => setActiveLayers(p => ({ ...p, crowdsourced: !p.crowdsourced }))}
              className={`px-2 py-1 rounded-lg font-semibold transition ${
                activeLayers.crowdsourced ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-400'
              }`}
            >
              📍 Crowdsourced
            </button>
          </div>

          {/* Active Navigation HUD if navigating */}
          {isNavigating && (
            <div className="absolute bottom-3 left-3 right-3 z-[400] bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-500/50 flex items-center justify-between shadow-2xl">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-600 rounded-xl text-white animate-pulse">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-400">SafePath Navigation Active</div>
                  <div className="text-sm font-extrabold text-white">
                    Step {navStepIndex + 1}: Stay along illuminated Outer Circle avenue
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Safety Index</div>
                <div className="text-base font-black text-emerald-400">94 / 100</div>
              </div>
            </div>
          )}
        </div>

        {/* Route Comparison Cards */}
        <div className="space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Route Comparison & Safety Score
          </span>

          {routesData?.routes.map((route) => {
            const isSafe = route.type === 'SAFE_PATH';
            const isSelected = route.id === selectedRouteId;

            return (
              <div
                key={route.id}
                onClick={() => setSelectedRouteId(route.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? isSafe
                      ? 'bg-emerald-950/30 border-emerald-500 shadow-lg shadow-emerald-950/50'
                      : 'bg-amber-950/30 border-amber-500 shadow-lg'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{isSafe ? '🛡️' : '⚡'}</span>
                    <h3 className="text-sm font-bold text-slate-200">{route.title}</h3>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    isSafe ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    Score: {route.safety_score}/100
                  </div>
                </div>

                <div className="flex items-center space-x-4 my-2 text-xs text-slate-400">
                  <span>🚶 {route.duration_min} mins</span>
                  <span>📏 {route.distance_km} km</span>
                  <span>🏥 {route.safe_havens_count} Safe Havens</span>
                </div>

                {/* Score Breakdown Bar */}
                <div className="space-y-1.5 my-3 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Street Lighting</span>
                    <span className="font-bold text-slate-300">{route.lighting_score}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${isSafe ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                      style={{ width: `${route.lighting_score}%` }}
                    />
                  </div>
                </div>

                {/* Key Highlights */}
                <div className="text-[11px] text-slate-300 space-y-1">
                  {route.highlights.slice(0, 2).map((h, i) => (
                    <div key={i} className="flex items-center space-x-1.5 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{h}</span>
                    </div>
                  ))}
                  {route.cautions.slice(0, 1).map((c, i) => (
                    <div key={i} className="flex items-center space-x-1.5 text-amber-400">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span className="truncate">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Crowdsourced Check-In Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-700 text-white shadow-2xl">
            <h3 className="text-lg font-bold">Submit Crowdsourced Safety Check-in</h3>
            <p className="text-xs text-slate-400 mb-4">
              Pin real-time hazards or safe havens to protect other community members.
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                <select
                  value={newReportCategory}
                  onChange={(e) => setNewReportCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200"
                >
                  <option value="POOR_LIGHTING">💡 Poor / Broken Street Lights</option>
                  <option value="SUSPICIOUS_ACTIVITY">⚠️ Isolated / Suspicious Area</option>
                  <option value="POLICE_PATROL">👮 Active Police Patrol / Booth</option>
                  <option value="SAFE_HAVEN">🛡️ Verified Safe Open Establishment</option>
                  <option value="HAZARD_OBSTACLE">🚧 Road Block / Physical Hazard</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Details & Landmarks</label>
                <textarea
                  required
                  rows={3}
                  value={newReportDesc}
                  onChange={(e) => setNewReportDesc(e.target.value)}
                  placeholder="e.g. Broken streetlight on corner of Block G alleyway, very dark..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow"
                >
                  Submit Pin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
