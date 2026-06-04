// CredVault — Web Audio oscillator notifications (no audio files)
// Uses AudioContext to synthesize beeps. Volume is controlled globally.

let _ctx: AudioContext | null = null
let _volume = 0.3   // 0–1, configurable

function ctx(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new AudioContext()
  }
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

function playTone(opts: {
  frequency:  number
  duration:   number
  type?:      OscillatorType
  ramp?:      'up' | 'down' | 'none'
  startDelay?: number
}): void {
  const { frequency, duration, type = 'sine', ramp = 'down', startDelay = 0 } = opts
  const ac   = ctx()
  const osc  = ac.createOscillator()
  const gain = ac.createGain()

  osc.type      = type
  osc.frequency.setValueAtTime(frequency, ac.currentTime + startDelay)
  osc.connect(gain)
  gain.connect(ac.destination)

  const t = ac.currentTime + startDelay
  const vol = _volume

  if (ramp === 'down') {
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  } else if (ramp === 'up') {
    gain.gain.setValueAtTime(0.001, t)
    gain.gain.exponentialRampToValueAtTime(vol, t + duration * 0.8)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  } else {
    gain.gain.setValueAtTime(vol, t)
    gain.gain.setValueAtTime(0.001, t + duration - 0.01)
  }

  osc.start(t)
  osc.stop(t + duration + 0.01)
}

export function setAudioVolume(v: number): void {
  _volume = Math.max(0, Math.min(1, v))
}

export function getAudioVolume(): number { return _volume }

/** Two descending tones — vault auto-locked */
export function playAutoLock(): void {
  playTone({ frequency: 440, duration: 0.2, type: 'square', ramp: 'down' })
  playTone({ frequency: 330, duration: 0.25, type: 'square', ramp: 'down', startDelay: 0.2 })
}

/** Harsh high-low burst — breach detected */
export function playBreachDetected(): void {
  for (let i = 0; i < 3; i++) {
    const delay = i * 0.18
    playTone({ frequency: 880, duration: 0.08, type: 'sawtooth', ramp: 'none', startDelay: delay })
    playTone({ frequency: 220, duration: 0.08, type: 'sawtooth', ramp: 'none', startDelay: delay + 0.09 })
  }
}

/** Single urgent blip — TOTP expiring soon (< 5 s) */
export function playTotpExpiring(): void {
  playTone({ frequency: 660, duration: 0.1, type: 'triangle', ramp: 'down' })
  playTone({ frequency: 660, duration: 0.1, type: 'triangle', ramp: 'down', startDelay: 0.15 })
}
