import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneCall, PhoneOff, Phone, Volume2, Mic, Grid, 
  Lock, Calculator, FileText, ArrowLeft, ShieldAlert, CheckCircle2 
} from 'lucide-react';
import { PhoneRingtonePlayer, speakText, playBeep } from '../utils/audioSynth';

export default function FakeCallStealth({ 
  isOpen, 
  onClose, 
  mode = 'fake_call', // 'fake_call' or 'stealth'
  onSilentStealthSOS,
  voiceEnabled 
}) {
  // Fake Call States
  const [callState, setCallState] = useState('idle'); // idle, ringing, connected, ended
  const [callerPreset, setCallerPreset] = useState('dad');
  const [callSeconds, setCallSeconds] = useState(0);
  const [speakerOn, setSpeakerOn] = useState(true);

  // Stealth Calculator States
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [stealthSOSDispatched, setStealthSOSDispatched] = useState(false);

  const ringtonePlayerRef = useRef(null);
  const callTimerRef = useRef(null);

  const CALLER_PROFILES = {
    dad: {
      name: 'Dad ❤️',
      number: '+91 98111 22233',
      avatar: '👨‍🦳',
      speech: "Beta, where are you right now? I am parked right outside on the main road with the hazard lights on. Walk straight towards the bright intersection. Don't stop anywhere, I can see the building entrance. I'm right here in the white car, come quickly, keep the phone to your ear."
    },
    police: {
      name: 'Inspector Sharma (Control Room)',
      number: '112 / PCR-04',
      avatar: '👮‍♂️',
      speech: "This is Delhi Police PCR patrol 12. Citizen, please state your exact location. We have your GPS beacon on our mobile terminal. Our vehicle is turning onto your street now. Remain in visible sight of open shops."
    },
    boss: {
      name: 'Dr. Anita Desai (Director)',
      number: '+91 98222 33344',
      avatar: '👩‍💼',
      speech: "Hello Priya, we need you in the conference room urgently. Are you near the lobby? The entire board is waiting, please head straight in through the front gate."
    }
  };

  // Start Fake Call Trigger
  const triggerIncomingCall = (delaySec = 0) => {
    setCallState('scheduled');
    if (delaySec > 0) {
      setTimeout(() => {
        executeRinging();
      }, delaySec * 1000);
    } else {
      executeRinging();
    }
  };

  const executeRinging = () => {
    setCallState('ringing');
    if (!ringtonePlayerRef.current) {
      ringtonePlayerRef.current = new PhoneRingtonePlayer();
    }
    ringtonePlayerRef.current.start();
  };

  // Answer Call
  const handleAnswerCall = () => {
    if (ringtonePlayerRef.current) {
      ringtonePlayerRef.current.stop();
    }
    setCallState('connected');
    setCallSeconds(0);

    // Start timer
    callTimerRef.current = setInterval(() => {
      setCallSeconds(s => s + 1);
    }, 1000);

    // Speak caller dialogue
    const profile = CALLER_PROFILES[callerPreset];
    speakText(profile.speech, 1.0, 1.0, callerPreset === 'boss' ? 'female' : 'male');
  };

  // Decline / Hang Up
  const handleEndCall = () => {
    if (ringtonePlayerRef.current) {
      ringtonePlayerRef.current.stop();
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      onClose();
    }, 1000);
  };

  // Calculator Logic for Stealth Mode
  const handleCalcButton = (val) => {
    if (val === 'C') {
      setCalcDisplay('0');
      return;
    }

    if (val === '=') {
      // Secret stealth distress PIN check: 9999 or 112
      if (calcDisplay === '9999' || calcDisplay === '112') {
        playBeep(440, 0.05); // Silent haptic feedback
        setStealthSOSDispatched(true);
        if (onSilentStealthSOS) {
          onSilentStealthSOS({
            trigger_type: 'STEALTH_PIN',
            severity: 'CRITICAL',
            notes: 'Stealth Calculator Camouflage Distress PIN (9999) entered under duress.'
          });
        }
        setCalcDisplay('0');
        return;
      }

      try {
        // Safe evaluation
        const clean = calcDisplay.replace(/[^0-9+\-*/.]/g, '');
        // eslint-disable-next-line no-eval
        const res = Function(`'use strict'; return (${clean})`)();
        setCalcDisplay(String(res));
      } catch (e) {
        setCalcDisplay('Error');
      }
      return;
    }

    setCalcDisplay(prev => prev === '0' || prev === 'Error' ? val : prev + val);
  };

  useEffect(() => {
    return () => {
      if (ringtonePlayerRef.current) ringtonePlayerRef.current.stop();
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // ---------------- FULL SCREEN INCOMING / ACTIVE CALL SCREEN ----------------
  if (mode === 'fake_call' && (callState === 'ringing' || callState === 'connected')) {
    const profile = CALLER_PROFILES[callerPreset];
    const mins = Math.floor(callSeconds / 60);
    const secs = callSeconds % 60;
    const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    return (
      <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-8 sm:p-12 animate-in fade-in">
        {/* Top Caller Info */}
        <div className="text-center pt-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-5xl mb-4 shadow-2xl">
            {profile.avatar}
          </div>
          <h2 className="text-3xl font-extrabold tracking-wide">{profile.name}</h2>
          <p className="text-sm text-slate-400 mt-1">{profile.number}</p>
          <p className="text-xs text-emerald-400 mt-2 font-mono uppercase tracking-widest">
            {callState === 'ringing' ? 'Incoming Cellular Call...' : `In Call (${timeFormatted})`}
          </p>
        </div>

        {/* In-Call Keypad / Mute Buttons */}
        {callState === 'connected' && (
          <div className="grid grid-cols-3 gap-6 max-w-xs mx-auto text-center my-6">
            <div className="p-4 rounded-full bg-slate-900 border border-slate-800 flex flex-col items-center">
              <Mic className="w-6 h-6 text-slate-300" />
              <span className="text-[10px] text-slate-400 mt-1">Mute</span>
            </div>
            <div className="p-4 rounded-full bg-slate-900 border border-slate-800 flex flex-col items-center">
              <Grid className="w-6 h-6 text-slate-300" />
              <span className="text-[10px] text-slate-400 mt-1">Keypad</span>
            </div>
            <div 
              onClick={() => setSpeakerOn(!speakerOn)}
              className={`p-4 rounded-full border flex flex-col items-center cursor-pointer transition ${
                speakerOn ? 'bg-white text-black border-white' : 'bg-slate-900 text-slate-300 border-slate-800'
              }`}
            >
              <Volume2 className="w-6 h-6" />
              <span className="text-[10px] mt-1">Speaker</span>
            </div>
          </div>
        )}

        {/* Bottom Actions: Answer / Decline */}
        <div className="flex items-center justify-around pb-8 max-w-sm mx-auto w-full">
          {callState === 'ringing' ? (
            <>
              {/* Decline button */}
              <button
                onClick={handleEndCall}
                className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-xl shadow-red-900/50 active:scale-95 transition"
              >
                <PhoneOff className="w-8 h-8" />
              </button>

              {/* Accept button */}
              <button
                onClick={handleAnswerCall}
                className="w-20 h-20 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white shadow-xl shadow-emerald-900/50 active:scale-95 transition animate-bounce"
              >
                <Phone className="w-8 h-8" />
              </button>
            </>
          ) : (
            /* End call button */
            <button
              onClick={handleEndCall}
              className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-xl shadow-red-900/50 active:scale-95 transition"
            >
              <PhoneOff className="w-8 h-8" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------------- FULL SCREEN STEALTH CALCULATOR CAMOUFLAGE ----------------
  if (mode === 'stealth') {
    return (
      <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-4 sm:p-8 animate-in fade-in">
        {/* Top bar with disguised stealth exit */}
        <div className="flex items-center justify-between text-slate-600 text-xs px-2">
          <div className="flex items-center space-x-2">
            <Calculator className="w-4 h-4 text-slate-500" />
            <span>Standard Calculator</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs border border-slate-800"
          >
            Exit Disguise
          </button>
        </div>

        {/* Secret alert indication if PIN entered */}
        {stealthSOSDispatched && (
          <div className="p-2 rounded bg-red-950/40 border border-red-900/40 text-red-400 text-xs text-center font-mono animate-pulse">
            ✓ Silent emergency beacon dispatched to Command Dispatch
          </div>
        )}

        {/* Calculator Display */}
        <div className="p-6 text-right font-mono text-5xl font-light text-white tracking-wider overflow-x-auto">
          {calcDisplay}
        </div>

        {/* Calculator Keypad */}
        <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto w-full my-auto text-xl font-medium">
          {['C', '+/-', '%', '/'].map(btn => (
            <button
              key={btn}
              onClick={() => handleCalcButton(btn)}
              className="h-16 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition active:scale-95"
            >
              {btn}
            </button>
          ))}
          {['7', '8', '9', '*'].map(btn => (
            <button
              key={btn}
              onClick={() => handleCalcButton(btn)}
              className={`h-16 rounded-full transition active:scale-95 ${
                btn === '*' ? 'bg-amber-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {btn}
            </button>
          ))}
          {['4', '5', '6', '-'].map(btn => (
            <button
              key={btn}
              onClick={() => handleCalcButton(btn)}
              className={`h-16 rounded-full transition active:scale-95 ${
                btn === '-' ? 'bg-amber-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {btn}
            </button>
          ))}
          {['1', '2', '3', '+'].map(btn => (
            <button
              key={btn}
              onClick={() => handleCalcButton(btn)}
              className={`h-16 rounded-full transition active:scale-95 ${
                btn === '+' ? 'bg-amber-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {btn}
            </button>
          ))}
          <button
            onClick={() => handleCalcButton('0')}
            className="col-span-2 h-16 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-left pl-7 transition active:scale-95"
          >
            0
          </button>
          <button
            onClick={() => handleCalcButton('.')}
            className="h-16 rounded-full bg-slate-900 hover:bg-slate-800 text-white transition active:scale-95"
          >
            .
          </button>
          <button
            onClick={() => handleCalcButton('=')}
            className="h-16 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-bold transition active:scale-95"
          >
            =
          </button>
        </div>

        {/* Subtle Hint */}
        <p className="text-center text-[10px] text-slate-700 font-mono">
          Tip: Type 9999= for covert distress trigger
        </p>
      </div>
    );
  }

  // ---------------- SETUP MODAL (WHEN TRIGGERED FROM DASHBOARD) ----------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-700 text-white shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <PhoneCall className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold">Fake Call & Stealth Safe Exit</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xs font-bold">
            Close
          </button>
        </div>

        <p className="text-xs text-slate-400 my-4 leading-relaxed">
          Simulate a realistic incoming phone call with believable synthesized voice dialogue, allowing you to excuse yourself safely from unsafe encounters.
        </p>

        {/* Caller Select */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-300 block">Select Caller Persona</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(CALLER_PROFILES).map(([key, prof]) => (
              <button
                key={key}
                onClick={() => setCallerPreset(key)}
                className={`p-3 rounded-2xl border text-center transition ${
                  callerPreset === key 
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-2xl mb-1">{prof.avatar}</div>
                <div className="text-xs font-bold truncate">{prof.name.split(' ')[0]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Delay Actions */}
        <div className="grid grid-cols-3 gap-2 mt-6">
          <button
            onClick={() => triggerIncomingCall(0)}
            className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow"
          >
            Call Now
          </button>
          <button
            onClick={() => triggerIncomingCall(5)}
            className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold"
          >
            In 5 Secs
          </button>
          <button
            onClick={() => triggerIncomingCall(15)}
            className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold"
          >
            In 15 Secs
          </button>
        </div>
      </div>
    </div>
  );
}
