import { GameEvent } from "../sim/types";

/**
 * The game plays exactly one music bed: the VALKYRIE EIRA trailer theme.
 * It starts with a run and keeps playing across stages and boss encounters.
 */
export type BGMId = "bgm_main";

export interface AudioRuntimeOptions {
  /** Test/alternate seam for the Web Audio context. */
  createContext?: () => AudioContext | null;
  /** Test/alternate seam for loading the audio manifest. */
  fetchImpl?: (input: RequestInfo | URL) => Promise<Response>;
}

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
  /** Track position (seconds) to resume from — kept in sync while playing. */
  private bgmOffset = 0;
  /** ctx.currentTime at which the active source was started. */
  private bgmStartedAt = 0;
  private gameplayPaused = false;
  private manifestLoaded = false;
  private loadPromise: Promise<void> | null = null;
  private preferredExt = "ogg";

  constructor(private readonly options: AudioRuntimeOptions = {}) {
    // AudioContext will be initialized on user interaction
  }

  public init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const ctx = this.options.createContext ? this.options.createContext() : AudioCtx ? new AudioCtx() : null;
      if (!ctx) return;
      this.ctx = ctx;
      this.masterGain = ctx.createGain();
      this.bgmGain = ctx.createGain();
      this.sfxGain = ctx.createGain();

      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;

      this.bgmGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(ctx.destination);

      this.setMuted(this.isMuted);

      // Determine audio codec support
      try {
        const audioEl = document.createElement("audio");
        this.preferredExt = audioEl.canPlayType("audio/ogg; codecs=vorbis") ? "ogg" : "m4a";
      } catch {
        this.preferredExt = "m4a";
      }

      this.loadPromise = this.preloadAudio();
    } catch {
      // Audio not supported in this environment
    }
  }

  /** Resolves once the manifest and every sound it lists have been decoded. */
  public async whenReady(): Promise<void> {
    await this.loadPromise;
  }

  private async preloadAudio(): Promise<void> {
    if (this.manifestLoaded || !this.ctx) return;
    try {
      const doFetch = this.options.fetchImpl ?? ((input: RequestInfo | URL) => fetch(input));
      const res = await doFetch("./assets/audio.json");
      if (!res.ok) return;
      const manifest = await res.json();
      this.manifestLoaded = true;

      const loads: Promise<void>[] = [];
      for (const [id, sound] of Object.entries<{ base: string }>(manifest.sounds)) {
        loads.push(this.loadSoundBuffer(id, `./${sound.base}.${this.preferredExt}`));
      }
      await Promise.all(loads);
    } catch {
      // Offline fallback: procedural synth
    }
  }

  private async loadSoundBuffer(id: string, url: string): Promise<void> {
    if (!this.ctx || this.bufferCache.has(id)) return;
    try {
      const doFetch = this.options.fetchImpl ?? ((input: RequestInfo | URL) => fetch(input));
      const res = await doFetch(url);
      if (!res.ok) return;
      const arrayBuf = await res.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arrayBuf);
      this.bufferCache.set(id, decoded);

      // If this was the pending current BGM, start it where the run expects it.
      if (this.currentBgmId === id && !this.activeBgmSource && !this.gameplayPaused) {
        this.startBgmSource(id, 0.3, this.bgmOffset);
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
  }

  /**
   * Pause returns the music to the exact position it was at, instead of letting
   * it keep running under a muted gain. Mute is a separate concern: it only
   * moves the master gain, so unmuting never rewinds or restarts the track.
   */
  public setGameplayPaused(paused: boolean): void {
    if (this.gameplayPaused === paused) return;
    this.gameplayPaused = paused;
    if (paused) {
      this.pauseBgm();
    } else {
      this.resumeBgm();
    }
  }

  public isGameplayPaused(): boolean {
    return this.gameplayPaused;
  }

  public isBgmPlaying(): boolean {
    return this.activeBgmSource !== null;
  }

  public getCurrentBgmId(): BGMId | null {
    return this.currentBgmId;
  }

  /** Current playback position in seconds, wrapped to the track length. */
  public currentBgmPosition(): number {
    const duration = this.bgmDuration();
    if (!this.ctx || !this.activeBgmSource) {
      return duration > 0 ? this.bgmOffset % duration : this.bgmOffset;
    }
    const elapsed = this.bgmOffset + Math.max(0, this.ctx.currentTime - this.bgmStartedAt);
    return duration > 0 ? elapsed % duration : elapsed;
  }

  private bgmDuration(): number {
    if (!this.currentBgmId) return 0;
    return this.bufferCache.get(this.currentBgmId)?.duration ?? 0;
  }

  private pauseBgm(): void {
    if (!this.activeBgmSource) return;
    this.bgmOffset = this.currentBgmPosition();
    this.haltBgmSource(0.06);
  }

  private resumeBgm(): void {
    if (!this.currentBgmId || this.activeBgmSource) return;
    this.startBgmSource(this.currentBgmId, 0.18, this.bgmOffset);
  }

  public playBGM(id: BGMId, fadeDuration = 0.35): void {
    // Same track still playing (or paused mid-track): let it continue so that
    // boss warnings, stage clears and next-stage starts never restart the music.
    if (this.currentBgmId === id && (this.activeBgmSource || this.gameplayPaused)) return;

    const switching = this.currentBgmId !== null && this.activeBgmSource !== null;
    this.currentBgmId = id;

    if (!this.ctx || !this.bgmGain) return;

    if (this.activeBgmSource) {
      this.haltBgmSource(switching ? fadeDuration : 0.06);
    }
    this.bgmOffset = 0;
    if (this.gameplayPaused) return;
    this.startBgmSource(id, fadeDuration, 0);
  }

  public stopBGM(fadeDuration = 0.25): void {
    if (this.activeBgmSource) {
      this.haltBgmSource(fadeDuration);
    }
    this.currentBgmId = null;
    this.bgmOffset = 0;
  }

  /** Fades the active source out and stops it, without touching the saved offset. */
  private haltBgmSource(fadeDuration: number): void {
    const src = this.activeBgmSource;
    const gain = this.activeBgmGain;
    this.activeBgmSource = null;
    this.activeBgmGain = null;
    if (!src) return;

    const stopNow = () => {
      try {
        src.stop();
      } catch {
        // Already stopped
      }
      try {
        src.disconnect();
      } catch {
        // Already disconnected
      }
      try {
        gain?.disconnect();
      } catch {
        // Already disconnected
      }
    };

    if (!gain || !this.ctx || fadeDuration <= 0) {
      stopNow();
      return;
    }

    const now = this.ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
    } catch {
      stopNow();
      return;
    }
    setTimeout(stopNow, fadeDuration * 1000 + 40);
  }

  private startBgmSource(id: BGMId, fadeDuration = 0.35, offset = 0): void {
    if (!this.ctx || !this.bgmGain || this.activeBgmSource) return;
    const buf = this.bufferCache.get(id);
    if (!buf) return; // Wait for the buffer to arrive; loadSoundBuffer starts it

    try {
      const duration = buf.duration || 0;
      const startOffset = duration > 0 ? ((offset % duration) + duration) % duration : Math.max(0, offset);

      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const trackGain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      if (fadeDuration > 0) {
        trackGain.gain.setValueAtTime(0.0001, now);
        trackGain.gain.linearRampToValueAtTime(1.0, now + fadeDuration);
      } else {
        trackGain.gain.setValueAtTime(1.0, now);
      }
      src.connect(trackGain);
      trackGain.connect(this.bgmGain);
      src.start(now, startOffset);
      this.activeBgmSource = src;
      this.activeBgmGain = trackGain;
      this.bgmStartedAt = now;
      this.bgmOffset = startOffset;
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
          // Boss warning only layers a siren over the ongoing trailer theme.
          this.playAudioOrSynth("sfx_warning", () => this.synthWarning());
          break;
        case "midbossDefeated":
          // Music keeps running; no track change on midboss defeat.
          break;
        case "stageClear":
          // The theme carries across the clear screen into the next stage.
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
