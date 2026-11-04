import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import OneTapSOS from './components/OneTapSOS';
import SunoAudioDistress from './components/SunoAudioDistress';
import SafePathRouting from './components/SafePathRouting';
import SahayataMesh from './components/SahayataMesh';
import RakshakHazardVision from './components/RakshakHazardVision';
import BiometricsWearable from './components/BiometricsWearable';
import FakeCallStealth from './components/FakeCallStealth';
import CrisisControlDashboard from './components/CrisisControlDashboard';
import UserProfileModal from './components/UserProfileModal';
import { getUserProfile, fetchHealth } from './utils/api';
import { speakText, playBeep } from './utils/audioSynth';
import { 
  Shield, Mic, Compass, Radio, Watch, Eye, AlertTriangle, 
  PhoneCall, Lock, Heart, CheckCircle2, ChevronRight, Activity
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState('citizen'); // 'citizen' or 'command'
  const [citizenSubView, setCitizenSubView] = useState('sos'); // 'sos', 'audio', 'safepath', 'mesh', 'biometrics'
  const [commandSubView, setCommandSubView] = useState('crisis_map'); // 'crisis_map' or 'rakshak_vision'
  
  // Accessibility & Settings
  const [highContrast, setHighContrast] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [batterySaver, setBatterySaver] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Active Emergency SOS state
  const [activeIncident, setActiveIncident] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [fakeCallModalOpen, setFakeCallModalOpen] = useState(false);
  const [fakeCallMode, setFakeCallMode] = useState('fake_call'); // 'fake_call' or 'stealth'

  // Network and Profile Initialization
  useEffect(() => {
    async function init() {
      const prof = await getUserProfile();
      setUserProfile(prof);
      const health = await fetchHealth();
      setIsOnline(health.status !== 'OFFLINE_MODE');
    }
    init();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Connect to WebSocket for real-time dispatch updates
  useEffect(() => {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.host}/ws/crisis-control`;
    let ws = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SOS_TRIGGERED' && data.incident) {
            // New SOS triggered
            if (data.incident.user_id === userProfile?.id) {
              setActiveIncident(data.incident);
            }
          } else if (data.type === 'STATUS_CHANGED' && activeIncident?.id === data.incident_id) {
            setActiveIncident(prev => prev ? { ...prev, status: data.status, responder_assigned: data.responder_assigned } : null);
          }
        } catch (e) {}
      };
    } catch (err) {}

    return () => {
      if (ws) ws.close();
    };
  }, [userProfile, activeIncident]);

  const handleTriggerSOS = (incident) => {
    setActiveIncident(incident);
    if (voiceEnabled) {
      speakText("Emergency SOS active. Live GPS beacon broadcasting to emergency responders.", 1.0, 1.1);
    }
  };

  const handleCancelActiveSOS = (incidentId) => {
    setActiveIncident(null);
    if (voiceEnabled) {
      speakText("Emergency cancelled. Responders stood down.", 1.0, 1.0);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${
      highContrast 
        ? 'bg-black text-yellow-300' 
        : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Top Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeSOS={Boolean(activeIncident)}
        highContrast={highContrast}
        setHighContrast={setHighContrast}
        voiceEnabled={voiceEnabled}
        setVoiceEnabled={setVoiceEnabled}
        batterySaver={batterySaver}
        setBatterySaver={setBatterySaver}
        onOpenProfile={() => setIsProfileOpen(true)}
        isOnline={isOnline}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ===================== CITIZEN SAFETY MODE ===================== */}
        {currentTab === 'citizen' && (
          <div className="space-y-6">
            {/* Sub-view Navigation Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none" aria-label="Feature Tabs">
              <button
                onClick={() => setCitizenSubView('sos')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  citizenSubView === 'sos'
                    ? 'bg-red-600 text-white shadow-md shadow-red-950'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>One-Tap SOS</span>
              </button>

              <button
                onClick={() => setCitizenSubView('audio')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  citizenSubView === 'audio'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Mic className="w-4 h-4 text-sky-400" />
                <span>SunoAI Audio Distress</span>
              </button>

              <button
                onClick={() => setCitizenSubView('safepath')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  citizenSubView === 'safepath'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>SafePath Navigation</span>
              </button>

              <button
                onClick={() => setCitizenSubView('mesh')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  citizenSubView === 'mesh'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Radio className="w-4 h-4 text-blue-400" />
                <span>Sahayata Offline Mesh</span>
              </button>

              <button
                onClick={() => setCitizenSubView('biometrics')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  citizenSubView === 'biometrics'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Watch className="w-4 h-4 text-rose-400" />
                <span>Wearable Biometrics</span>
              </button>
            </div>

            {/* Active Sub-view Rendering */}
            {citizenSubView === 'sos' && (
              <OneTapSOS
                userProfile={userProfile}
                onTriggerSOS={handleTriggerSOS}
                activeIncident={activeIncident}
                onCancelActiveSOS={handleCancelActiveSOS}
                highContrast={highContrast}
                voiceEnabled={voiceEnabled}
                onOpenFakeCall={() => { setFakeCallMode('fake_call'); setFakeCallModalOpen(true); }}
                onOpenStealth={() => { setFakeCallMode('stealth'); setFakeCallModalOpen(true); }}
              />
            )}

            {citizenSubView === 'audio' && (
              <SunoAudioDistress
                onTriggerDistressSOS={handleTriggerSOS}
                highContrast={highContrast}
                voiceEnabled={voiceEnabled}
              />
            )}

            {citizenSubView === 'safepath' && (
              <SafePathRouting
                highContrast={highContrast}
                voiceEnabled={voiceEnabled}
              />
            )}

            {citizenSubView === 'mesh' && (
              <SahayataMesh
                onTriggerMeshSOS={handleTriggerSOS}
                highContrast={highContrast}
                voiceEnabled={voiceEnabled}
              />
            )}

            {citizenSubView === 'biometrics' && (
              <BiometricsWearable
                onTriggerBiometricSOS={handleTriggerSOS}
                highContrast={highContrast}
                voiceEnabled={voiceEnabled}
              />
            )}
          </div>
        )}

        {/* ===================== CRISIS COMMAND & RAKSHAK PORTAL ===================== */}
        {currentTab === 'command' && (
          <div className="space-y-6">
            {/* Command Sub-view Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setCommandSubView('crisis_map')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  commandSubView === 'crisis_map'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Crisis Command & AI Triage Dispatch</span>
              </button>

              <button
                onClick={() => setCommandSubView('rakshak_vision')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  commandSubView === 'rakshak_vision'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Eye className="w-4 h-4 text-rose-400" />
                <span>Rakshak CCTV Hazard Vision Portal</span>
              </button>
            </div>

            {commandSubView === 'crisis_map' && (
              <CrisisControlDashboard
                highContrast={highContrast}
                voiceEnabled={voiceEnabled}
              />
            )}

            {commandSubView === 'rakshak_vision' && (
              <RakshakHazardVision
                highContrast={highContrast}
                voiceEnabled={voiceEnabled}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals & Overlays */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userProfile={userProfile}
        onSaveProfile={(updated) => setUserProfile(updated)}
      />

      <FakeCallStealth
        isOpen={fakeCallModalOpen}
        onClose={() => setFakeCallModalOpen(false)}
        mode={fakeCallMode}
        onSilentStealthSOS={handleTriggerSOS}
        voiceEnabled={voiceEnabled}
      />
    </div>
  );
}
