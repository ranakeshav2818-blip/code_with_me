// Web Audio API Synthesizer & Speech Engine for GuardianAI
// Operates 100% offline without external audio assets

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Realistic telephone ringtone synthesizer (440Hz + 480Hz cadence)
export class PhoneRingtonePlayer {
  constructor() {
    this.ctx = null;
    this.intervalId = null;
    this.isPlaying = false;
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.ctx = getAudioContext();

    const playRingBurst = () => {
      if (!this.isPlaying) return;
      const now = this.ctx.currentTime;
      
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gainNode.gain.setValueAtTime(0.25, now + 1.8);
      gainNode.gain.linearRampToValueAtTime(0, now + 1.95);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.0);
      osc2.stop(now + 2.0);
    };

    playRingBurst();
    this.intervalId = setInterval(playRingBurst, 3500);

    // Vibration pattern if supported on mobile
    if (navigator.vibrate) {
      navigator.vibrate([1000, 1500, 1000, 1500]);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  }
}

// Emergency countdown and alert beeps
export function playBeep(freq = 880, duration = 0.15, type = 'sine') {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
}

// Tactical emergency siren sound
export function playEmergencySiren(duration = 2.5) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    const now = ctx.currentTime;
    
    // Warble between 600Hz and 950Hz
    for (let t = 0; t < duration; t += 0.5) {
      osc.frequency.setValueAtTime(600, now + t);
      osc.frequency.linearRampToValueAtTime(950, now + t + 0.25);
      osc.frequency.linearRampToValueAtTime(600, now + t + 0.5);
    }

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.setValueAtTime(0.18, now + duration - 0.2);
    gain.gain.linearRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);

    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
  } catch (e) {
    console.warn('Siren audio error:', e);
  }
}

// Speech synthesis for realistic incoming phone call dialog & voice alerts
export function speakText(text, pitch = 1.0, rate = 1.0, voiceGender = 'male') {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = pitch;
    utterance.rate = rate;
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Pick matching voice if available
      const preferred = voices.find(v => v.lang.startsWith('en') && (voiceGender === 'male' ? v.name.includes('Male') || v.name.includes('David') || v.name.includes('George') : v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Google')));
      if (preferred) utterance.voice = preferred;
    }
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('SpeechSynthesis error:', e);
  }
}

// MediaRecorder helper to capture 10-second ambient audio recording
export async function recordAmbientAudio(seconds = 10) {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return null;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks = [];

    return new Promise((resolve) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          // Stop mic tracks
          stream.getTracks().forEach(t => t.stop());
          resolve({
            blob: audioBlob,
            base64: reader.result,
            duration: seconds
          });
        };
      };

      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, seconds * 1000);
    });
  } catch (e) {
    console.warn('Ambient mic recording not permitted or supported:', e);
    return null;
  }
}
