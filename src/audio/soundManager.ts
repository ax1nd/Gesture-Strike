/**
 * Procedural Web Audio Synthesizer for GestureStrike.
 * Generates all arcade sound effects dynamically without external audio files.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private bgOscillator: OscillatorNode | null = null;
  private bgGain: GainNode | null = null;

  constructor() {
    // Lazily initialized on first user interaction
    const savedMute = localStorage.getItem('gesture_strike_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('gesture_strike_muted', String(muted));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.7, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // Laser shot synthesizer
  public playShoot(variant: 'NORMAL' | 'RAPID' | 'SPREAD' = 'NORMAL') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (variant === 'SPREAD') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(540, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.16);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.16);
    } else if (variant === 'RAPID') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.08);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.08);
    } else {
      // Normal cyber laser
      osc.type = 'sine';
      osc.frequency.setValueAtTime(980, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.12);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  }

  // Tactical gesture pinch trigger chirp
  public playPinchChirp() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(2400, t + 0.04);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  // Enemy / Object Explosion
  public playExplosion(intensity: 'SMALL' | 'MEDIUM' | 'LARGE' = 'MEDIUM') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const duration = intensity === 'LARGE' ? 0.6 : intensity === 'MEDIUM' ? 0.35 : 0.2;

    // Sub-bass thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    const startFreq = intensity === 'LARGE' ? 140 : 180;
    subOsc.frequency.setValueAtTime(startFreq, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + duration);
    subGain.gain.setValueAtTime(intensity === 'LARGE' ? 0.6 : 0.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + duration);

    // Filtered noise burst for crackle
    const bufferSize = this.ctx.sampleRate * duration;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(intensity === 'LARGE' ? 1200 : 800, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(intensity === 'LARGE' ? 0.45 : 0.25, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    whiteNoise.start(t);
    whiteNoise.stop(t + duration);
  }

  // Nova Bomb Screen Clear
  public playNovaBomb() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // Hypersonic charge sweep up
    const sweep = this.ctx.createOscillator();
    const sweepGain = this.ctx.createGain();
    sweep.type = 'sawtooth';
    sweep.frequency.setValueAtTime(100, t);
    sweep.frequency.exponentialRampToValueAtTime(1800, t + 0.35);
    sweepGain.gain.setValueAtTime(0.2, t);
    sweepGain.gain.linearRampToValueAtTime(0.5, t + 0.35);
    sweep.connect(sweepGain);
    sweepGain.connect(this.masterGain);
    sweep.start(t);
    sweep.stop(t + 0.35);

    // Massive bass blast after sweep
    setTimeout(() => {
      if (!this.ctx || !this.masterGain) return;
      const tBlast = this.ctx.currentTime;
      const blastOsc = this.ctx.createOscillator();
      const blastGain = this.ctx.createGain();
      blastOsc.type = 'triangle';
      blastOsc.frequency.setValueAtTime(220, tBlast);
      blastOsc.frequency.exponentialRampToValueAtTime(25, tBlast + 0.9);
      blastGain.gain.setValueAtTime(0.8, tBlast);
      blastGain.gain.exponentialRampToValueAtTime(0.001, tBlast + 0.9);
      blastOsc.connect(blastGain);
      blastGain.connect(this.masterGain);
      blastOsc.start(tBlast);
      blastOsc.stop(tBlast + 0.9);
    }, 350);
  }

  // Harmonic combo streak sound that steps up the pentatonic scale
  public playCombo(comboCount: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];
    const pitch = scale[Math.min(comboCount, scale.length - 1)];

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, t + 0.14);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  // Shield deflection chime
  public playShieldDeflect() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, t);
    osc.frequency.exponentialRampToValueAtTime(523.25, t + 0.2);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Powerup acquisition arpeggio
  public playPowerup() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const notes = [440, 554.37, 659.25, 880];
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const noteTime = t + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.25, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.1);
    });
  }

  // Player hit damage crunch
  public playPlayerHit() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.25);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Boss warning klaxon
  public playWarning() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const startT = t + i * 0.2;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(740, startT);
      osc.frequency.exponentialRampToValueAtTime(520, startT + 0.15);
      gain.gain.setValueAtTime(0.3, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(startT);
      osc.stop(startT + 0.15);
    }
  }
}

export const soundManager = new SoundManager();
