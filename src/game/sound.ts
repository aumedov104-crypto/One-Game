// Procedural Web Audio API SFX + Lush Cinematic Orchestral Soundtrack
class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  // Cinematic score sequencer state
  private musicTimer: number | null = null;
  private musicPlaying = false;
  private musicPaused = false;
  private stepIdx = 0;
  private musicMaster: GainNode | null = null;
  private hallBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // 8-bar emotional cinematic progression in D minor / F major:
  // Dm9 -> Bbmaj7 -> Fadd9 -> Csus4/E -> Gm9 -> Bbmaj7 -> C6 -> A7sus4
  private readonly score: Array<{
    bass: number;
    strings: number[];
    harp: number[];
    melody: Record<number, { freq: number; dur: number }>;
  }> = [
    {
      bass: 73.42, // D2
      strings: [146.83, 220.0, 261.63, 329.63, 349.23], // Dm9
      harp: [293.66, 349.23, 440.0, 523.25, 659.25],
      melody: {
        0: { freq: 587.33, dur: 1.45 }, // D5
        6: { freq: 659.25, dur: 0.7 },  // E5
        8: { freq: 698.46, dur: 1.55 }, // F5
      },
    },
    {
      bass: 58.27, // Bb1
      strings: [116.54, 174.61, 220.0, 293.66, 349.23], // Bbmaj7
      harp: [233.08, 293.66, 349.23, 440.0, 587.33],
      melody: {
        0: { freq: 523.25, dur: 1.3 },  // C5
        6: { freq: 587.33, dur: 0.8 },  // D5
        10: { freq: 440.0, dur: 1.4 },  // A4
      },
    },
    {
      bass: 87.31, // F2
      strings: [174.61, 220.0, 261.63, 349.23, 392.0], // Fadd9
      harp: [261.63, 349.23, 392.0, 440.0, 523.25],
      melody: {
        0: { freq: 523.25, dur: 1.2 },  // C5
        4: { freq: 587.33, dur: 0.9 },  // D5
        8: { freq: 659.25, dur: 1.45 }, // E5
      },
    },
    {
      bass: 82.41, // E2 (Csus4/E)
      strings: [164.81, 196.0, 261.63, 349.23, 392.0],
      harp: [261.63, 329.63, 392.0, 440.0, 523.25],
      melody: {
        0: { freq: 783.99, dur: 1.45 }, // G5
        8: { freq: 659.25, dur: 1.25 }, // E5
        12: { freq: 587.33, dur: 0.85 }, // D5
      },
    },
    {
      bass: 98.0, // G2
      strings: [196.0, 233.08, 293.66, 349.23, 440.0], // Gm9
      harp: [293.66, 349.23, 440.0, 466.16, 587.33],
      melody: {
        0: { freq: 698.46, dur: 1.45 }, // F5
        6: { freq: 783.99, dur: 0.7 },  // G5
        8: { freq: 880.0, dur: 1.6 },   // A5 (soaring peak)
      },
    },
    {
      bass: 58.27, // Bb1
      strings: [116.54, 174.61, 220.0, 293.66, 349.23], // Bbmaj7
      harp: [233.08, 293.66, 349.23, 440.0, 587.33],
      melody: {
        0: { freq: 783.99, dur: 1.35 }, // G5
        8: { freq: 698.46, dur: 1.45 }, // F5
      },
    },
    {
      bass: 65.41, // C2
      strings: [130.81, 196.0, 220.0, 261.63, 329.63], // C6
      harp: [261.63, 329.63, 392.0, 440.0, 523.25],
      melody: {
        0: { freq: 659.25, dur: 1.5 },  // E5
        8: { freq: 587.33, dur: 1.4 },  // D5
      },
    },
    {
      bass: 55.0, // A1
      strings: [110.0, 164.81, 220.0, 293.66, 329.63], // A7sus4 -> gentle resolve
      harp: [220.0, 293.66, 329.63, 440.0, 523.25],
      melody: {
        0: { freq: 587.33, dur: 1.2 },  // D5
        6: { freq: 554.37, dur: 1.0 },  // C#5 (cinematic leading tone)
        11: { freq: 440.0, dur: 1.3 },  // A4
      },
    },
  ];

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.musicMaster && this.ctx) {
      this.musicMaster.gain.setTargetAtTime(
        muted || this.musicPaused ? 0.0001 : 0.25,
        this.ctx.currentTime,
        0.1
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
      this.musicMaster.gain.value = this.muted || this.musicPaused ? 0.0001 : 0.25;
      this.musicMaster.connect(this.ctx.destination);

      // Dual-tap Concert Hall Reverb Bus for warm cinematic space
      this.hallBus = this.ctx.createGain();
      this.hallBus.gain.value = 0.65;

      const tap1 = this.ctx.createDelay(1.0);
      tap1.delayTime.value = 0.26;
      const tap2 = this.ctx.createDelay(1.0);
      tap2.delayTime.value = 0.41;

      const fb1 = this.ctx.createGain();
      fb1.gain.value = 0.36;
      const fb2 = this.ctx.createGain();
      fb2.gain.value = 0.32;

      const damp = this.ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 1450;

      this.hallBus.connect(tap1);
      this.hallBus.connect(tap2);
      tap1.connect(damp);
      tap2.connect(damp);
      damp.connect(fb1);
      fb1.connect(tap2);
      damp.connect(fb2);
      fb2.connect(tap1);
      damp.connect(this.musicMaster);

      // Soft noise buffer for cinematic cymbal/brush swells
      const len = Math.floor(this.ctx.sampleRate * 0.25);
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
        this.muted ? 0.0001 : 0.25,
        this.ctx.currentTime,
        0.15
      );
    }

    const stepMs = 210; // ~71.4 BPM majestic cinematic tempo
    const tickStep = () => {
      if (!this.musicPlaying) return;
      if (!this.muted && !this.musicPaused) {
        this.playCinematicStep(this.stepIdx);
      }
      this.stepIdx = (this.stepIdx + 1) % 128; // Full 8-bar orchestral phrase
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
        this.muted || paused ? 0.0001 : 0.25,
        this.ctx.currentTime,
        0.15
      );
    }
  }

  private playCinematicStep(step: number) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.musicMaster || !this.hallBus) return;
    const now = ctx.currentTime;

    const bar = Math.floor(step / 16) % this.score.length;
    const stepInBar = step % 16;
    const phrase = this.score[bar];

    // 1. Lush Symphonic String Ensemble (slow expressive bow swell on bar start)
    if (stepInBar === 0) {
      const strFilter = ctx.createBiquadFilter();
      strFilter.type = 'lowpass';
      strFilter.frequency.setValueAtTime(620, now);
      strFilter.frequency.linearRampToValueAtTime(1450, now + 1.5);
      strFilter.frequency.linearRampToValueAtTime(700, now + 3.3);
      strFilter.connect(this.musicMaster);
      strFilter.connect(this.hallBus);

      phrase.strings.forEach((freq, idx) => {
        const oscA = ctx.createOscillator();
        const oscB = ctx.createOscillator();
        const g = ctx.createGain();

        oscA.type = 'sawtooth';
        oscB.type = 'triangle';
        oscA.frequency.setValueAtTime(freq, now);
        oscB.frequency.setValueAtTime(freq, now);
        oscA.detune.setValueAtTime((idx % 2 === 0 ? 1 : -1) * 6, now);
        oscB.detune.setValueAtTime((idx % 2 === 0 ? -1 : 1) * 5, now);

        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.022, now + 0.72);
        g.gain.exponentialRampToValueAtTime(0.001, now + 3.45);

        oscA.connect(g);
        oscB.connect(g);
        g.connect(strFilter);
        oscA.start(now);
        oscB.start(now);
        oscA.stop(now + 3.5);
        oscB.stop(now + 3.5);
      });

      // 2. Deep Contrabass / Cello Foundation Pedal
      const bassOsc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const bassFilt = ctx.createBiquadFilter();
      const bassGain = ctx.createGain();

      bassOsc.type = 'sawtooth';
      subOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(phrase.bass, now);
      subOsc.frequency.setValueAtTime(phrase.bass, now);

      bassFilt.type = 'lowpass';
      bassFilt.frequency.setValueAtTime(220, now);
      bassFilt.frequency.linearRampToValueAtTime(140, now + 3.2);

      bassGain.gain.setValueAtTime(0.001, now);
      bassGain.gain.linearRampToValueAtTime(0.24, now + 0.35);
      bassGain.gain.exponentialRampToValueAtTime(0.002, now + 3.35);

      bassOsc.connect(bassFilt);
      subOsc.connect(bassGain);
      bassFilt.connect(bassGain);
      bassGain.connect(this.musicMaster);

      bassOsc.start(now);
      subOsc.start(now);
      bassOsc.stop(now + 3.4);
      subOsc.stop(now + 3.4);
    }

    // 3. Soft Cinematic Timpani / Orchestral Boom on major phrase anchors (bars 0 & 4)
    if (stepInBar === 0 && (bar === 0 || bar === 4)) {
      const timp = ctx.createOscillator();
      const tg = ctx.createGain();
      timp.type = 'sine';
      timp.frequency.setValueAtTime(84, now);
      timp.frequency.exponentialRampToValueAtTime(38, now + 0.45);
      tg.gain.setValueAtTime(0.001, now);
      tg.gain.linearRampToValueAtTime(0.26, now + 0.025);
      tg.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
      timp.connect(tg);
      tg.connect(this.musicMaster);
      tg.connect(this.hallBus);
      timp.start(now);
      timp.stop(now + 1.0);

      if (this.noiseBuffer) {
        const nSrc = ctx.createBufferSource();
        nSrc.buffer = this.noiseBuffer;
        const nFilt = ctx.createBiquadFilter();
        nFilt.type = 'bandpass';
        nFilt.frequency.setValueAtTime(1100, now);
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.001, now);
        ng.gain.linearRampToValueAtTime(0.032, now + 0.06);
        ng.gain.exponentialRampToValueAtTime(0.0005, now + 0.24);
        nSrc.connect(nFilt);
        nFilt.connect(ng);
        ng.connect(this.hallBus);
        nSrc.start(now);
        nSrc.stop(now + 0.25);
      }
    }

    // 4. Flowing Concert Piano & Celestial Harp Arpeggio
    const harpSeq = [0, -1, 1, 2, -1, 3, 4, -1, 2, 3, -1, 4, 2, -1, 1, 3];
    const hIdx = harpSeq[stepInBar];
    if (hIdx >= 0) {
      const hFreq = phrase.harp[hIdx % phrase.harp.length];
      const p1 = ctx.createOscillator();
      const p2 = ctx.createOscillator();
      const pf = ctx.createBiquadFilter();
      const pg = ctx.createGain();

      p1.type = 'triangle';
      p2.type = 'sine';
      p1.frequency.setValueAtTime(hFreq, now);
      p2.frequency.setValueAtTime(hFreq * 2, now);

      pf.type = 'lowpass';
      pf.frequency.setValueAtTime(2400, now);
      pf.frequency.exponentialRampToValueAtTime(700, now + 0.8);

      pg.gain.setValueAtTime(0.001, now);
      pg.gain.linearRampToValueAtTime(0.068, now + 0.018);
      pg.gain.exponentialRampToValueAtTime(0.0008, now + 1.15);

      p1.connect(pf);
      p2.connect(pf);
      pf.connect(pg);
      pg.connect(this.musicMaster);
      pg.connect(this.hallBus);

      p1.start(now);
      p2.start(now);
      p1.stop(now + 1.2);
      p2.stop(now + 1.2);
    }

    // 5. Soaring Solo Horn / Legato Cello Lead Theme with Gentle Vibrato
    const note = phrase.melody[stepInBar];
    if (note) {
      const leadA = ctx.createOscillator();
      const leadB = ctx.createOscillator();
      const vib = ctx.createOscillator();
      const vibGain = ctx.createGain();
      const leadFilt = ctx.createBiquadFilter();
      const leadGain = ctx.createGain();

      leadA.type = 'triangle';
      leadB.type = 'sawtooth';
      leadA.frequency.setValueAtTime(note.freq, now);
      leadB.frequency.setValueAtTime(note.freq, now);

      vib.type = 'sine';
      vib.frequency.setValueAtTime(4.8, now);
      vibGain.gain.setValueAtTime(0, now);
      vibGain.gain.linearRampToValueAtTime(3.2, now + 0.35);
      vib.connect(vibGain);
      vibGain.connect(leadA.frequency);
      vibGain.connect(leadB.frequency);

      leadFilt.type = 'lowpass';
      leadFilt.frequency.setValueAtTime(950, now);
      leadFilt.frequency.linearRampToValueAtTime(1850, now + 0.32);
      leadFilt.frequency.linearRampToValueAtTime(880, now + note.dur);

      leadGain.gain.setValueAtTime(0.0005, now);
      leadGain.gain.linearRampToValueAtTime(0.075, now + 0.16);
      leadGain.gain.exponentialRampToValueAtTime(0.001, now + note.dur);

      leadA.connect(leadFilt);
      leadB.connect(leadFilt);
      leadFilt.connect(leadGain);
      leadGain.connect(this.musicMaster);
      leadGain.connect(this.hallBus);

      leadA.start(now);
      leadB.start(now);
      vib.start(now);
      leadA.stop(now + note.dur + 0.05);
      leadB.stop(now + note.dur + 0.05);
      vib.stop(now + note.dur + 0.05);
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
