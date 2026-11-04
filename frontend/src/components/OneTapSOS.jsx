import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertOctagon, CheckCircle2, PhoneCall, Volume2, ShieldAlert, 
  MapPin, Clock, Radio, XCircle, Send, HeartPulse, RefreshCw, Lock
} from 'lucide-react';
import { playBeep, playEmergencySiren, recordAmbientAudio, speakText } from '../utils/audioSynth';
import { triggerEmergencySOS, cancelEmergencySOS } from '../utils/api';

export default function OneTapSOS({ 
  userProfile, 
  onTriggerSOS, 
  activeIncident, 
  onCancelActiveSOS,
  highContrast,
  voiceEnabled,
  onOpenFakeCall,
  onOpenStealth
}) {
  const [countdown, setCountdown] = useState(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [cancelPin, setCancelPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isRecordingAmbient, setIsRecordingAmbient] = useState(false);
  const [ambientAudioReady, setAmbientAudioReady] = useState(false);
  const [gpsLocation, setGpsLocation] = useState({ lat: 28.6304, lng: 77.2177, accuracy: 8.5, address: "Connaught Place, New Delhi" });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const countdownTimerRef = useRef(null);

  // Acquire live geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 10,
            address: `Live GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`
          });
          setIsLoadingLocation(false);
        },
        (err) => {
          console.warn('Geolocation fallback to Delhi Metro default:', err.message);
          setIsLoadingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  // Handle SOS Click
  const handleInitiateSOS = (triggerType = "MANUAL_ONE_TAP") => {
    if (activeIncident) return; // Already active

    // Start 5-second cancelable countdown
    setCountdown(5);
    setIsCountingDown(true);
    setPinError(false);
    setCancelPin('');

    playBeep(880, 0.2);
    if (voiceEnabled) {
      speakText("Emergency SOS initiated. Five second countdown. Press cancel if false alarm.", 1.1, 1.1);
    }

    let currentSec = 5;
    countdownTimerRef.current = setInterval(() => {
      currentSec -= 1;
      setCountdown(currentSec);
      playBeep(920, 0.15);

      if (currentSec <= 0) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setIsCountingDown(false);
        setCountdown(null);
        executeSOSDispatch(triggerType);
      }
    }, 1000);
  };

  // Immediate Cancel during countdown
  const handleAbortCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setIsCountingDown(false);
    setCountdown(null);
    playBeep(440, 0.1);
    if (voiceEnabled) {
      speakText("Emergency countdown aborted.", 1.0, 1.0);
    }
  };

  // Dispatch SOS to backend & start 10-second ambient recording
  const executeSOSDispatch = async (triggerType) => {
    playEmergencySiren(2.0);

    // Launch ambient 10-second audio recording
    setIsRecordingAmbient(true);
    recordAmbientAudio(10).then((audioData) => {
      setIsRecordingAmbient(false);
      setAmbientAudioReady(true);
    });

    const payload = {
      user_id: userProfile?.id || "USR-9921",
      trigger_type: triggerType,
      location: gpsLocation,
      severity: "CRITICAL",
      notes: "One-tap emergency trigger activated. Victim requires immediate response.",
      mesh_hop_count: 0
    };

    const res = await triggerEmergencySOS(payload);
    if (res?.incident) {
      onTriggerSOS(res.incident);
    }
  };

  // Safe Cancel of Active SOS
  const handleCancelActiveEmergency = async () => {
    if (cancelPin !== '1234' && cancelPin !== '') {
      // Optional verification
      setPinError(true);
      return;
    }
    if (activeIncident?.id) {
      await cancelEmergencySOS(activeIncident.id, "Safe PIN entered by user");
      onCancelActiveSOS(activeIncident.id);
    }
    setCancelPin('');
    setPinError(false);
  };

  return (
    <div className="w-full space-y-6">
      {/* Active Incident Warning Banner */}
      {activeIncident && (
        <div className={`p-4 rounded-2xl border ${
          highContrast 
            ? 'bg-black border-yellow-400 text-yellow-300' 
            : 'bg-gradient-to-r from-red-950/80 to-slate-900 border-red-500/50 text-white'
        } shadow-xl shadow-red-950/30 animate-pulse`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-red-600 rounded-xl text-white">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg text-red-400 uppercase tracking-wide">
                    Live SOS Beacon Active
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
                    {activeIncident.status || 'TRANSMITTING'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  ID: <span className="font-mono text-slate-200">{activeIncident.id}</span> • Trigger: {activeIncident.trigger_type}
                </p>
                <div className="flex items-center space-x-2 mt-1 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>{gpsLocation.address}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {isRecordingAmbient && (
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-red-900/60 border border-red-500 text-xs font-semibold text-red-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                  <span>Capturing 10s Ambient Audio</span>
                </div>
              )}
              <button
                onClick={handleCancelActiveEmergency}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-slate-100 transition shadow"
              >
                I Am Safe (End Emergency)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero One-Tap Emergency Button Section */}
      <div className={`relative overflow-hidden rounded-3xl border p-6 sm:p-10 text-center transition-all ${
        highContrast 
          ? 'bg-black border-yellow-400' 
          : 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 shadow-2xl'
      }`}>
        {/* Radar concentric rings behind button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-red-500 animate-ping"></div>
          <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-red-600"></div>
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border border-red-700"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6 bg-red-950/60 text-red-400 border border-red-800/60">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span>Instant Emergency Relay</span>
          </div>

          {/* Big Tactile Emergency Trigger Button */}
          <div className="relative my-4">
            {/* Outer pulsating ring */}
            <div className={`absolute -inset-4 sm:-inset-6 rounded-full opacity-75 blur-md transition-all ${
              activeIncident ? 'bg-red-600 animate-pulse' : 'bg-red-700/40 hover:bg-red-600/60'
            }`}></div>

            <button
              onClick={() => handleInitiateSOS("MANUAL_ONE_TAP")}
              disabled={Boolean(activeIncident) || isCountingDown}
              className={`relative w-44 h-44 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center transition-transform active:scale-95 transform hover:scale-105 shadow-2xl ${
                highContrast
                  ? 'bg-red-600 border-4 border-yellow-400 text-white font-black'
                  : 'bg-gradient-to-tr from-red-700 via-red-600 to-rose-600 border-4 border-red-400/40 text-white shadow-red-950'
              } ${activeIncident ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
              aria-label="One-tap Emergency SOS Button"
            >
              <AlertOctagon className="w-16 h-16 sm:w-20 sm:h-20 mb-2 drop-shadow-md text-white" />
              <span className="text-3xl sm:text-4xl font-black tracking-widest uppercase">SOS</span>
              <span className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase opacity-90 mt-1">
                {activeIncident ? 'Transmitting' : 'One-Tap Trigger'}
              </span>
            </button>
          </div>

          <p className="max-w-md text-xs sm:text-sm text-slate-400 mt-4 leading-relaxed">
            Press to initiate a 5-second silent emergency countdown. Automatically transmits live coordinates, 10-second ambient recording, and medical profile to emergency contacts and Police Command.
          </p>

          {/* Quick Helper Edge Features */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg mt-8">
            <button
              onClick={onOpenFakeCall}
              className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold transition"
            >
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>Fake Call Exit</span>
            </button>

            <button
              onClick={onOpenStealth}
              className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold transition"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Stealth Camouflage</span>
            </button>

            <div className="col-span-2 sm:col-span-1 flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-semibold">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span className="truncate">{gpsLocation.address.split(',')[0]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Silent Countdown Modal Popup */}
      {isCountingDown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className={`w-full max-w-md p-8 rounded-3xl border text-center shadow-2xl animate-in zoom-in-95 ${
            highContrast ? 'bg-black border-yellow-400 text-yellow-300' : 'bg-slate-900 border-red-500 text-white'
          }`}>
            <div className="w-16 h-16 mx-auto rounded-full bg-red-600/20 border border-red-500 flex items-center justify-center text-red-500 mb-4 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-black uppercase tracking-wider text-red-500">
              Silent SOS Countdown
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Dispatching live location and ambient audio alert in:
            </p>

            <div className="my-6">
              <span className="text-7xl font-black font-mono text-red-500 drop-shadow-lg">
                00:0{countdown}
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-6">
              If this was triggered accidentally, press the cancel button below before countdown reaches zero.
            </p>

            <button
              onClick={handleAbortCountdown}
              className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border-2 border-slate-500 text-white text-base font-extrabold uppercase tracking-wider shadow-lg transition active:scale-98"
            >
              Cancel SOS (False Alarm)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
