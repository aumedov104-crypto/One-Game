// Procedural Web Audio API SFX + Atmospheric Modern Chill-Synth Soundtrack
class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  // Music sequencer state
  private musicTimer: number | null = null;
  private musicPlaying = false;
  private musicPaused = false;
  private stepIdx = 0;
  private musicMaster: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // 8-bar cinematic progression (Fmaj9 -> G6 -> Em7 -> Am9 -> Dm9 -> G13 -> Cmaj9 -> E7sus4/B)
  // Warm, sophisticated harmony — never repetitive nursery-rhyme loops
  private readonly chords: Array<{ bass: number; pad: number[]; arp: number[] }> = [
    { bass: 87.31, pad: [174.61, 220.0, 261.63, 329.63, 392.0], arp: [349.23, 440.0, 523.25, 659.25] }, // Fmaj9
    { bass: 98.0, pad: [196.0, 246.94, 293.66, 329.63, 440.0], arp: [392.0, 493.88, 587.33, 659.25] },   // G6
    { bass: 82.41, pad: [164.81, 196.0, 246.94, 293.66, 392.0], arp: [329.63, 392.0, 493.88, 587.33] }, // Em7
    { bass: 110.0, pad: [220.0, 261.63, 329.63, 392.0, 493.88], arp: [440.0, 523.25, 659.25, 783.99] }, // Am9
    { bass: 73.42, pad: [146.83, 174.61, 220.0, 261.63, 329.63], arp: [293.66, 349.23, 440.0, 523.25] }, // Dm9
    { bass: 98.0, pad: [196.0, 261.63, 293.66, 329.63, 440.0], arp: [392.0, 523.25, 587.33, 659.25] },  // G13sus4
    { bass: 130.81, pad: [196.0, 246.94, 293.66, 329.63, 440.0], arp: [392.0, 493.88, 587.33, 659.25] }, // Cmaj9
    { bass: 123.47, pad: [164.81, 220.0, 246.94, 329.63, 392.0], arp: [329.63, 440.0, 493.88, 659.25] }, // E7sus4/B
  ];

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.musicMaster && this.ctx) {
      this.musicMaster.gain.setTargetAtTime(
        muted || this.musicPaused ? 0.0001 : 0.24,
        this.ctx.currentTime,
        0.08
      );
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.musicMaster) {
      this.musicMaster = this.ctx.createGain();
      this.musicMaster.gain.value = this.muted || this.musicPaused ? 0.0001 : 0.24;
      this.musicMaster.connect(this.ctx.destination);

      // Warm echo delay bus for spacious ambient synth depth
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.value = 0.34;
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.32;
      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 1400;

      this.delayNode.connect(delayFilter);
      delayFilter.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      delayFilter.connect(this.musicMaster);

      // Noise buffer for soft brushed hi-hats
      const len = Math.floor(this.ctx.sampleRate * 0.08);
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return this.ctx;
  }

  unlock() {
    this.ensureCtx();
  }

  public startMusic() {
    if (this.musicPlaying) {
      this.setMusicPaused(false);
      return;
    }
    this.musicPlaying = true;
    this.musicPaused = false;
    this.ensureCtx();
    if (this.musicMaster && this.ctx) {
      this.musicMaster.gain.setTargetAtTime(
        this.muted ? 0.0001 : 0.24,
        this.ctx.currentTime,
        0.12
      );
    }

    const stepMs = 155; // ~96.7 BPM 16th-note groove
    const tickStep = () => {
      if (!this.musicPlaying) return;
      if (!this.muted && !this.musicPaused) {
        this.playMusicStep(this.stepIdx);
      }
      this.stepIdx = (this.stepIdx + 1) % 128; // Full 8-bar (128-step) phrase
      this.musicTimer = window.setTimeout(tickStep, stepMs);
    };
    this.musicTimer = window.setTimeout(tickStep, 60);
  }

  public stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public setMusicPaused(paused: boolean) {
    this.musicPaused = paused;
    if (this.musicMaster && this.ctx) {
      this.musicMaster.gain.setTargetAtTime(
        this.muted || paused ? 0.0001 : 0.24,
        this.ctx.currentTime,
        0.12
      );
    }
  }

  private playMusicStep(step: number) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.musicMaster || !this.delayNode) return;
    const now = ctx.currentTime;

    const bar = Math.floor(step / 16) % this.chords.length;
    const stepInBar = step % 16;
    const chord = this.chords[bar];

    // 1. Lush warm detuned synth pad at bar start (lowpass swept)
    if (stepInBar === 0) {
      const padFilter = ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.setValueAtTime(520, now);
      padFilter.frequency.linearRampToValueAtTime(1150, now + 1.1);
      padFilter.frequency.linearRampToValueAtTime(480, now + 2.4);
      padFilter.connect(this.musicMaster);

      for (const freq of chord.pad) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.026, now + 0.35);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 2.45);
        osc.connect(g);
        g.connect(padFilter);
        osc.start(now);
        osc.stop(now + 2.5);
      }
    }

    // 2. Deep warm sub/analog bass groove (syncopated electronic pattern)
    if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10 || (bar % 2 === 1 && stepInBar === 14)) {
      const osc = ctx.createOscillator();
      const filt = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      const freq = stepInBar === 14 ? chord.bass * 1.5 : chord.bass;
      osc.frequency.setValueAtTime(freq, now);

      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(340, now);
      filt.frequency.exponentialRampToValueAtTime(140, now + 0.35);

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.24, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      osc.connect(filt);
      filt.connect(g);
      g.connect(this.musicMaster);
      osc.start(now);
      osc.stop(now + 0.44);
    }

    // 3. Atmospheric plucked synth voice with echo delay (non-linear expressive phrasing)
    const arpPattern = [0, -1, 2, -1, 1, 3, -1, 2, 0, -1, 3, -1, 2, 1, -1, 3];
    const arpIdx = arpPattern[stepInBar];
    if (arpIdx >= 0 && (bar % 2 === 0 || stepInBar % 3 !== 1)) {
      const baseFreq = chord.arp[arpIdx % chord.arp.length];
      const freq = bar >= 4 && stepInBar === 10 ? baseFreq * 1.5 : baseFreq;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filt = ctx.createBiquadFilter();
      const g = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2, now);
      osc1.detune.setValueAtTime(-4, now);
      osc2.detune.setValueAtTime(4, now);

      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(2200, now);
      filt.frequency.exponentialRampToValueAtTime(650, now + 0.28);

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.085, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

      osc1.connect(filt);
      osc2.connect(filt);
      filt.connect(g);
      g.connect(this.musicMaster);
      g.connect(this.delayNode);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.36);
      osc2.stop(now + 0.36);
    }

    // 4. Deep tight electronic kick on 0 & 8
    if (stepInBar === 0 || stepInBar === 8) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(98, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.09);
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(g);
      g.connect(this.musicMaster);
      osc.start(now);
      osc.stop(now + 0.15);
    }

    // 5. Soft brushed hi-hat on off-beats
    if (this.noiseBuffer && (stepInBar % 4 === 2 || stepInBar === 15)) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(7500, now);
      const g = ctx.createGain();
      const amp = stepInBar === 15 ? 0.02 : 0.036;
      g.gain.setValueAtTime(amp, now);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.045);
      src.connect(hp);
      hp.connect(g);
      g.connect(this.musicMaster);
      src.start(now);
      src.stop(now + 0.05);
    }
  }

  private ensureSfxCtx(): AudioContext | null {
    if (this.muted) return null;
    return this.ensureCtx();
  }

  playShoot() {
    const ctx = this.ensureSfxCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playBounce() {
    const ctx = this.ensureSfxCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.05);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  playSnap() {
    const ctx = this.ensureSfxCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.055);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  playPop(index: number, combo: number) {
    const ctx = this.ensureSfxCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const base = 360 + Math.min(index, 10) * 42 + Math.min(combo, 6) * 35;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.45, now + 0.075);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  playDropScore(step: number) {
    const ctx = this.ensureSfxCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freq = 520 + Math.min(step, 12) * 55;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.08);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  playCrackIce() {
    const ctx = this.ensureSfxCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.08);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  playBomb() {
    const ctx = this.ensureSfxCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.34);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  playSwap() {
    const ctx = this.ensureSfxCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.05);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  playStar() {
    const ctx = this.ensureSfxCtx();
    if (!ctx) return;
    const notes = [587.33, 880, 1174.66];
    notes.forEach((f, idx) => {
      const now = ctx.currentTime + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    });
  }

  playCeilingDrop() {
    const ctx = this.ensureSfxCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.14);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  playWin() {
    const ctx = this.ensureSfxCtx();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const now = ctx.currentTime + i * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    });
  }

  playLose() {
    const ctx = this.ensureSfxCtx();
    if (!ctx) return;
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((f, i) => {
      const now = ctx.currentTime + i * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    });
  }

  playClick() {
    const ctx = this.ensureSfxCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export const soundEngine = new SoundEngine();
