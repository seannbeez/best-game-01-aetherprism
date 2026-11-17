// Tiny WebAudio synth: no audio files, everything is an oscillator blip.
// Created lazily on the first user gesture so browsers allow it.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol || 0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  shoot() { this.tone(880, 0.12, 'triangle', 0.35, 220); }
  hit() { this.tone(320, 0.08, 'square', 0.22, 180); }
  shatter() {
    this.tone(1400, 0.25, 'sawtooth', 0.3, 200);
    this.tone(700, 0.3, 'triangle', 0.3, 120);
  }
  place() { this.tone(520, 0.1, 'sine', 0.4, 780); }
  rotate() { this.tone(440, 0.06, 'sine', 0.25, 560); }
  torpedo() { this.tone(180, 0.35, 'sawtooth', 0.35, 900); }
  nova() {
    this.tone(90, 0.5, 'sawtooth', 0.5, 40);
    this.tone(1200, 0.4, 'triangle', 0.3, 100);
  }
  horn() { this.tone(196, 0.7, 'sawtooth', 0.3, 147); this.tone(294, 0.7, 'triangle', 0.2, 220); }
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.35, 'triangle', 0.35), i * 130);
    });
  }
  defeat() {
    [392, 330, 262, 196].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.4, 'sawtooth', 0.25), i * 160);
    });
  }
}
