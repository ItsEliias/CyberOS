let audioCtx: AudioContext | null = null;
let masterVolume = 0.5;
let soundsEnabled = false;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

interface ToneOptions {
  frequency?: number;
  type?: OscillatorType;
  duration?: number;
  volume?: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  detune?: number;
  delay?: number;
}

function playTone(options: ToneOptions): void {
  if (!soundsEnabled) return;
  const ctx = getCtx();
  const { frequency = 440, type = 'sine', duration = 0.2, volume = 0.3, attack = 0.01, decay = 0.1, sustain = 0.5, release = 0.1, detune = 0, delay = 0 } = options;

  const startTime = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  if (detune) oscillator.detune.setValueAtTime(detune, startTime);

  const vol = volume * masterVolume;
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(vol, startTime + attack);
  gainNode.gain.linearRampToValueAtTime(vol * sustain, startTime + attack + decay);
  gainNode.gain.setValueAtTime(vol * sustain, startTime + duration - release);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function playNoise(duration = 0.1, volume = 0.2, delay = 0): void {
  if (!soundsEnabled) return;
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 0.5;

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  const vol = volume * masterVolume;
  gainNode.gain.setValueAtTime(vol, ctx.currentTime + delay);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration);

  source.start(ctx.currentTime + delay);
}

export const SOUNDS = {
  finding() {
    playTone({ frequency: 880, type: 'sine', duration: 0.1, volume: 0.25, attack: 0.005, decay: 0.05, sustain: 0.3, release: 0.04 });
  },
  flag() {
    playTone({ frequency: 523, type: 'triangle', duration: 0.15, volume: 0.3, attack: 0.01, decay: 0.05, sustain: 0.6, release: 0.08 });
    playTone({ frequency: 659, type: 'triangle', duration: 0.15, volume: 0.3, attack: 0.01, decay: 0.05, sustain: 0.6, release: 0.08, delay: 0.1 });
    playTone({ frequency: 784, type: 'triangle', duration: 0.15, volume: 0.35, attack: 0.01, decay: 0.05, sustain: 0.6, release: 0.1, delay: 0.2 });
  },
  achievement() {
    playTone({ frequency: 392, type: 'triangle', duration: 0.12, volume: 0.3, attack: 0.01, decay: 0.04, sustain: 0.5, release: 0.06 });
    playTone({ frequency: 523, type: 'triangle', duration: 0.12, volume: 0.3, attack: 0.01, decay: 0.04, sustain: 0.5, release: 0.06, delay: 0.1 });
    playTone({ frequency: 659, type: 'triangle', duration: 0.12, volume: 0.3, attack: 0.01, decay: 0.04, sustain: 0.5, release: 0.06, delay: 0.2 });
    playTone({ frequency: 784, type: 'sine', duration: 0.25, volume: 0.4, attack: 0.02, decay: 0.08, sustain: 0.6, release: 0.1, delay: 0.3 });
  },
  sessionComplete() {
    playTone({ frequency: 440, type: 'sine', duration: 0.12, volume: 0.3, attack: 0.01, decay: 0.06, sustain: 0.4, release: 0.05 });
    playTone({ frequency: 550, type: 'sine', duration: 0.12, volume: 0.3, attack: 0.01, decay: 0.06, sustain: 0.4, release: 0.05, delay: 0.12 });
    playTone({ frequency: 660, type: 'sine', duration: 0.2, volume: 0.35, attack: 0.01, decay: 0.08, sustain: 0.5, release: 0.1, delay: 0.24 });
  },
  apiError() {
    playTone({ frequency: 330, type: 'sawtooth', duration: 0.1, volume: 0.2, attack: 0.005, decay: 0.04, sustain: 0.3, release: 0.05 });
    playTone({ frequency: 277, type: 'sawtooth', duration: 0.1, volume: 0.2, attack: 0.005, decay: 0.04, sustain: 0.3, release: 0.05, delay: 0.1 });
  },
  timerExpiry() {
    playTone({ frequency: 880, type: 'square', duration: 0.25, volume: 0.25, attack: 0.005, decay: 0.08, sustain: 0.5, release: 0.1 });
    playTone({ frequency: 660, type: 'square', duration: 0.25, volume: 0.25, attack: 0.005, decay: 0.08, sustain: 0.5, release: 0.1, delay: 0.3 });
  },
  focusToggle() {
    for (let i = 0; i < 8; i++) {
      playTone({ frequency: 200 + (i * 60), type: 'sine', duration: 0.08, volume: 0.12, attack: 0.005, decay: 0.02, sustain: 0.3, release: 0.05, delay: i * 0.018 });
    }
  },
  themeSwitch() {
    playNoise(0.05, 0.15);
  },
  click() {
    playTone({ frequency: 660, type: 'sine', duration: 0.04, volume: 0.15, attack: 0.002, decay: 0.01, sustain: 0.2, release: 0.02 });
  }
};

export function initSounds(settings: { soundEnabled?: boolean; volume?: number } = {}): void {
  soundsEnabled = settings.soundEnabled !== undefined ? settings.soundEnabled : false;
  masterVolume = settings.volume !== undefined ? (settings.volume / 100) : 0.5;
}

export function setSoundEnabled(enabled: boolean): void {
  soundsEnabled = !!enabled;
}

export function setSoundVolume(vol: number): void {
  masterVolume = Math.max(0, Math.min(1, vol / 100));
}
