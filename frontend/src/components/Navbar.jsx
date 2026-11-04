import React from 'react';
import { Shield, AlertTriangle, Radio, Activity, Eye, PhoneCall, User, Sun, Moon, Volume2, VolumeX, Battery } from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  activeSOS, 
  highContrast, 
  setHighContrast, 
  voiceEnabled, 
  setVoiceEnabled,
  batterySaver,
  setBatterySaver,
  onOpenProfile,
  isOnline = true
}) {
  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-200 ${
      highContrast 
        ? 'bg-black border-yellow-400 text-yellow-300' 
        : 'bg-slate-950/90 border-slate-800 text-slate-100'
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className={`relative p-2 rounded-xl flex items-center justify-center ${
              activeSOS 
                ? 'bg-red-600 text-white animate-pulse' 
                : highContrast 
                  ? 'bg-yellow-400 text-black font-black' 
                  : 'bg-gradient-to-tr from-red-600 to-indigo-600 text-white shadow-lg shadow-red-950/50'
            }`}>
              <Shield className="w-6 h-6" />
              {activeSOS && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight">Guardian<span className="text-red-500">AI</span></span>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider ${
                  highContrast 
                    ? 'border border-yellow-400 text-yellow-400' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  PWA 2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">All-in-One Real-Time Human Safety Ecosystem</p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <nav className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800" aria-label="Main Navigation">
            <button
              onClick={() => setCurrentTab('citizen')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentTab === 'citizen'
                  ? highContrast 
                    ? 'bg-yellow-400 text-black font-bold' 
                    : 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label="Citizen & Worker Personal Safety Mode"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden xs:inline">Citizen Safety</span>
            </button>

            <button
              onClick={() => setCurrentTab('command')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentTab === 'command'
                  ? highContrast 
                    ? 'bg-yellow-400 text-black font-bold' 
                    : 'bg-gradient-to-r from-indigo-600 to-blue-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label="Crisis Command and Rakshak Hazard Vision Portal"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="hidden xs:inline">Crisis Command</span>
              {activeSOS && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              )}
            </button>
          </nav>

          {/* Quick Actions & Accessibility Toggles */}
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            {/* Network / Mesh Status Indicator */}
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-900 border border-slate-800">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="text-slate-300">{isOnline ? 'Cloud Sync 4G/5G' : 'Sahayata BLE Mesh'}</span>
            </div>

            {/* Voice Prompts Toggle */}
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              title={voiceEnabled ? 'Voice Guidance Active' : 'Voice Guidance Muted'}
              className={`p-2 rounded-lg border transition-colors ${
                voiceEnabled 
                  ? 'bg-emerald-950/40 border-emerald-600 text-emerald-400' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              aria-label="Toggle voice guidance"
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* High Contrast Accessibility Toggle */}
            <button
              onClick={() => setHighContrast(!highContrast)}
              title={highContrast ? 'High Contrast Mode ON' : 'Standard Contrast Mode'}
              className={`p-2 rounded-lg border transition-colors ${
                highContrast 
                  ? 'bg-yellow-400 border-yellow-300 text-black' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              aria-label="Toggle high contrast accessibility mode"
            >
              <Sun className="w-4 h-4" />
            </button>

            {/* User Emergency Profile Button */}
            <button
              onClick={onOpenProfile}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-medium transition"
              aria-label="Open Medical ID and Emergency Contacts"
            >
              <User className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline">Medical ID</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
