import { GameEvent } from "../sim/types";

export type BGMId = "bgm_title" | "bgm_stage" | "bgm_stage1" | "bgm_stage2" | "bgm_stage3" | "bgm_midboss" | "bgm_boss";

export class AudioRuntime {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  public analyser: AnalyserNode | null = null;
  private isMuted = false;

  private bufferCache = new Map<string, AudioBuffer>();
  private activeBgmSource: AudioBufferSourceNode | null = null;
  private activeBgmGain: GainNode | null = null;
  private currentBgmId: BGMId | null = null;
  public currentStage: 1 | 2 | 3 = 1;
  private manifestLoaded = false;
  private preferredExt = "ogg";

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  public init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;

      this.bgmGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.setMuted(this.isMuted);

      // Determine audio codec support
      const audioEl = document.createElement("audio");
      if (audioEl.canPlayType("audio/ogg; codecs=vorbis")) {
        this.preferredExt = "ogg";
      } else {
        this.preferredExt = "m4a";
      }

      this.preloadAudio();
    } catch {
      // Audio not supported in this environment
    }
  }

  private async preloadAudio(): Promise<void> {
    if (this.manifestLoaded || !this.ctx) return;
    try {
      const res = await fetch("./assets/audio.json");
      if (!res.ok) return;
      const manifest = await res.json();
      this.manifestLoaded = true;

      for (const [id, sound] of Object.entries<{ base: string }>(manifest.sounds)) {
        this.loadSoundBuffer(id, `./${sound.base}.${this.preferredExt}`);
      }
    } catch {
      // Offline fallback: procedural synth
    }
  }

  private async loadSoundBuffer(id: string, url: string): Promise<void> {
    if (!this.ctx || this.bufferCache.has(id)) return;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const arrayBuf = await res.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arrayBuf);
      this.bufferCache.set(id, decoded);

      // If this was pending current BGM, start it
      const resolvedCurrent = this.currentBgmId === "bgm_stage1" ? "bgm_stage" : this.currentBgmId;
      if (resolvedCurrent === id && !this.activeBgmSource) {
        this.playBgmInternal(id);
      }
    } catch {
      // Decode error fallback
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.75, this.ctx.currentTime);
    }
    if (!muted && this.currentBgmId && !this.activeBgmSource) {
      this.playBgmInternal(this.currentBgmId, 0.3);
    }
  }

  public playBGM(id: BGMId, crossfadeDuration = 0.35): void {
    const resolvedId = id === "bgm_stage1" ? "bgm_stage" : id;
    if (this.currentBgmId === resolvedId && this.activeBgmSource) return;
    this.currentBgmId = resolvedId;

    if (!this.ctx || !this.bgmGain) return;

    // Smoothly crossfade: fade out previous BGM source
    if (this.activeBgmSource && this.activeBgmGain) {
      const oldSrc = this.activeBgmSource;
      const oldGain = this.activeBgmGain;
      const now = this.ctx.currentTime;
      try {
        oldGain.gain.setValueAtTime(oldGain.gain.value, now);
        oldGain.gain.linearRampToValueAtTime(0.0001, now + crossfadeDuration);
        setTimeout(() => {
          try {
            oldSrc.stop();
            oldSrc.disconnect();
            oldGain.disconnect();
          } catch {
            // Ignore stop error
          }
        }, crossfadeDuration * 1000 + 40);
      } catch {
        try {
          oldSrc.stop();
        } catch {
          // Ignore stop error
        }
      }
      this.activeBgmSource = null;
      this.activeBgmGain = null;
    } else if (this.activeBgmSource) {
      this.stopBGM(crossfadeDuration);
    }

    this.playBgmInternal(resolvedId, crossfadeDuration);
  }

  public stopBGM(fadeDuration = 0.25): void {
    if (this.activeBgmSource && this.activeBgmGain && this.ctx) {
      const oldSrc = this.activeBgmSource;
      const oldGain = this.activeBgmGain;
      const now = this.ctx.currentTime;
      try {
        oldGain.gain.setValueAtTime(oldGain.gain.value, now);
        oldGain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
        setTimeout(() => {
          try {
            oldSrc.stop();
            oldSrc.disconnect();
            oldGain.disconnect();
          } catch {
            // Ignore stop error
          }
        }, fadeDuration * 1000 + 40);
      } catch {
        try {
          oldSrc.stop();
        } catch {
          // Ignore stop error
        }
      }
      this.activeBgmSource = null;
      this.activeBgmGain = null;
    } else if (this.activeBgmSource) {
      try {
        this.activeBgmSource.stop();
        this.activeBgmSource.disconnect();
      } catch {
        // Ignore stop error
      }
      this.activeBgmSource = null;
    }
  }

  private playBgmInternal(id: string, fadeDuration = 0.35): void {
    if (!this.ctx || !this.bgmGain || this.isMuted) return;
    const resolvedId = id === "bgm_stage1" ? "bgm_stage" : id;
    const buf = this.bufferCache.get(resolvedId);
    if (!buf) return; // Wait for buffer or fallback

    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const trackGain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      trackGain.gain.setValueAtTime(0.0001, now);
      trackGain.gain.linearRampToValueAtTime(1.0, now + fadeDuration);
      src.connect(trackGain);
      trackGain.connect(this.bgmGain);
      src.start(0);
      this.activeBgmSource = src;
      this.activeBgmGain = trackGain;
    } catch {
      // Play error
    }
  }

  public handleEvents(events: GameEvent[]): void {
    if (!this.ctx || this.isMuted || this.ctx.state !== "running") return;

    for (const e of events) {
      switch (e.t) {
        case "shot":
          this.playAudioOrSynth(`sfx_shot${e.level}`, () => this.synthShot(e.level));
          break;
        case "hit":
          this.playAudioOrSynth("sfx_hit", () => this.synthHit());
          break;
        case "explode":
          this.playAudioOrSynth(`sfx_explode_${e.size}`, () => this.synthExplosion(e.size));
          break;
        case "pickup":
          this.playAudioOrSynth("sfx_pickup", () => this.synthPickup());
          break;
        case "roll":
          this.playAudioOrSynth("sfx_roll", () => this.synthRoll());
          break;
        case "graze":
          this.playAudioOrSynth("sfx_graze", () => this.synthGraze());
          break;
        case "ultimate":
          this.playAudioOrSynth("sfx_ultimate", () => this.synthUltimate());
          break;
        case "meleeSlash":
          this.playAudioOrSynth("sfx_slash", () => this.synthSlash());
          break;
        case "meleeHit":
          this.playAudioOrSynth("sfx_melee_hit", () => this.synthMeleeHit());
          break;
        case "playerDown":
          this.playAudioOrSynth("sfx_explode_l", () => this.synthExplosion("l"));
          break;
        case "warning":
          this.playBGM(e.isMidboss ? "bgm_midboss" : "bgm_boss");
          this.playAudioOrSynth("sfx_warning", () => this.synthWarning());
          break;
        case "midbossDefeated": {
          const stageBgm: BGMId = this.currentStage === 3 ? "bgm_stage3" : this.currentStage === 2 ? "bgm_stage2" : "bgm_stage";
          this.playBGM(stageBgm);
          break;
        }
        case "stageClear":
          this.stopBGM();
          this.playAudioOrSynth("jingle_clear", () => this.synthVictoryFanfare());
          break;
        case "gameOver":
          this.stopBGM();
          this.playAudioOrSynth("jingle_gameover", () => this.synthGameOver());
          break;
      }
    }
  }

  private playAudioOrSynth(id: string, fallbackSynth: () => void): void {
    const buf = this.bufferCache.get(id);
    if (buf && this.ctx && this.sfxGain) {
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.sfxGain);
        src.start(0);
        return;
      } catch {
        // Fall back to synth on source creation error
      }
    }
    fallbackSynth();
  }

  // Procedural synth fallbacks
  private synthShot(level: 1 | 2 | 3): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    const startFreq = level === 3 ? 1020 : level === 2 ? 880 : 760;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  private synthHit(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.04);

    gain.gain.setValueAtTime(0.14, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  private synthExplosion(size: "s" | "m" | "l" | "boss"): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const duration = size === "boss" ? 1.0 : size === "l" ? 0.6 : size === "m" ? 0.35 : 0.2;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(size === "boss" ? 500 : 380, t);
    filter.frequency.exponentialRampToValueAtTime(30, t + duration);

    const gain = this.ctx.createGain();
    const peakVol = size === "boss" ? 0.45 : size === "l" ? 0.35 : 0.24;
    gain.gain.setValueAtTime(peakVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
  }

  private synthPickup(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const st = t + idx * 0.04;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.2, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(st);
      osc.stop(st + 0.13);
    });
  }

  private synthRoll(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(640, t + 0.3);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.6);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.65);
  }

  private synthGraze(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1760, t);
    osc.frequency.exponentialRampToValueAtTime(2640, t + 0.06);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  private synthUltimate(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // Deep thunder resonance + ascending angelic chords
    const chord = [130.81, 261.63, 392.0, 523.25, 1046.5];
    chord.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = idx === 0 ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.8);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 1.25);
    });
  }

  private synthSlash(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(580, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  private synthMeleeHit(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.linearRampToValueAtTime(90, t + 0.07);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  private synthWarning(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const st = t + i * 0.5;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, st);
      osc.frequency.linearRampToValueAtTime(700, st + 0.4);
      gain.gain.setValueAtTime(0.22, st);
      gain.gain.linearRampToValueAtTime(0.001, st + 0.45);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(st);
      osc.stop(st + 0.48);
    }
  }

  private synthVictoryFanfare(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const notes = [
      { f: 523.25, d: 0.16 },
      { f: 659.25, d: 0.16 },
      { f: 783.99, d: 0.22 },
      { f: 1046.5, d: 0.7 },
    ];
    let offset = 0;
    notes.forEach((n) => {
      const st = t + offset;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(n.f, st);
      gain.gain.setValueAtTime(0.25, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + n.d);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(st);
      osc.stop(st + n.d + 0.05);
      offset += n.d + 0.05;
    });
  }

  private synthGameOver(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const notes = [
      { f: 440.0, d: 0.35 },
      { f: 415.3, d: 0.35 },
      { f: 392.0, d: 0.4 },
      { f: 349.2, d: 0.9 },
    ];
    let offset = 0;
    notes.forEach((n) => {
      const st = t + offset;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(n.f, st);
      gain.gain.setValueAtTime(0.24, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + n.d);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(st);
      osc.stop(st + n.d + 0.05);
      offset += n.d + 0.05;
    });
  }
}
