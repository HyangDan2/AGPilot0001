import { AudioRuntime } from "../audio/runtime";
import { createKeyboardHandler } from "../input/keyboard";
import { createTouchHandler } from "../input/touch";
import { GameRenderer } from "../render/renderer";
import { DT, GameEvent, InputFrame, World } from "../sim/types";
import { createWorld, step } from "../sim/world";
import { loadHighScore, loadSettings, saveHighScore, saveSettings } from "../storage";
import { UIManager } from "../ui/overlays";

export class GameApp {
  private world: World;
  private renderer: GameRenderer;
  private audio: AudioRuntime;
  private ui: UIManager;
  private keyboard: ReturnType<typeof createKeyboardHandler>;
  private touch: ReturnType<typeof createTouchHandler>;

  private isRunning = false;
  private isPaused = false;
  private rafId: number | null = null;
  private settings = loadSettings();
  private highScore = loadHighScore();
  private lastTime = 0;
  private accumulator = 0;

  constructor(
    canvas: HTMLCanvasElement,
    uiContainer: HTMLElement,
  ) {
    this.renderer = new GameRenderer(canvas);
    this.renderer.reducedMotion = this.settings.reducedMotion;
    this.audio = new AudioRuntime();
    this.audio.setMuted(this.settings.muted);

    this.keyboard = createKeyboardHandler();
    this.touch = createTouchHandler(canvas);

    this.world = createWorld();

    this.ui = new UIManager(uiContainer, {
      onStart: () => this.startGame(),
      onResume: () => this.togglePause(),
      onRestart: () => this.restartGame(),
      onToggleMute: () => this.toggleMute(),
      onToggleReducedMotion: () => this.toggleReducedMotion(),
      onRoll: () => {
        // Roll triggered via UI button
      },
    });

    this.ui.showTitle(this.highScore, this.settings.muted, this.settings.reducedMotion);

    // Initial render of title backdrop
    this.renderer.render(this.world);

    // Pause on tab visibility change or blur
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.isRunning && !this.isPaused) {
        this.togglePause();
      }
    });

    // Expose test hooks only if ?test=1
    if (new URLSearchParams(window.location.search).get("test") === "1") {
      this.setupTestHooks();
    }
  }

  private startLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isRunning = false;
  }

  private startGame(): void {
    this.audio.init();
    this.audio.playBGM("bgm_stage");
    this.world = createWorld({ seed: Date.now() });
    this.ui.showInGameHUD(this.settings.muted);
    this.startLoop();
  }

  private restartGame(): void {
    this.audio.playBGM("bgm_stage");
    this.world = createWorld({ seed: Date.now() });
    this.ui.showInGameHUD(this.settings.muted);
    this.startLoop();
  }

  private togglePause(): void {
    if (!this.isRunning) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.ui.showPauseMenu();
    } else {
      this.ui.hidePauseMenu();
      this.lastTime = performance.now();
      // Ensure RAF is still active if coming back from background
      if (this.rafId === null) {
        this.rafId = requestAnimationFrame((t) => this.loop(t));
      }
    }
  }

  private toggleMute(): void {
    this.settings.muted = !this.settings.muted;
    saveSettings(this.settings);
    this.audio.setMuted(this.settings.muted);
    if (!this.isRunning) {
      this.ui.showTitle(this.highScore, this.settings.muted, this.settings.reducedMotion);
    } else {
      const btn = document.getElementById("btn-ingame-mute");
      if (btn) btn.textContent = this.settings.muted ? "🔇" : "🔊";
    }
  }

  private toggleReducedMotion(): void {
    this.settings.reducedMotion = !this.settings.reducedMotion;
    saveSettings(this.settings);
    this.renderer.reducedMotion = this.settings.reducedMotion;
    this.ui.showTitle(this.highScore, this.settings.muted, this.settings.reducedMotion);
  }

  private loop(now: number): void {
    this.rafId = null;
    if (!this.isRunning) return;

    if (this.isPaused) {
      this.rafId = requestAnimationFrame((t) => this.loop(t));
      return;
    }

    const delta = Math.min((now - this.lastTime) / 1000, 0.2);
    this.lastTime = now;
    this.accumulator += delta;

    const key = this.keyboard.sample();
    const touch = this.touch.sample();

    if (key.pause) {
      this.togglePause();
      this.rafId = requestAnimationFrame((t) => this.loop(t));
      return;
    }

    const input: InputFrame = {
      moveX: key.moveX,
      moveY: key.moveY,
      dragDx: touch.dragDx,
      dragDy: touch.dragDy,
      fire: key.fire || touch.fire,
      roll: key.roll || touch.roll,
    };

    while (this.accumulator >= DT) {
      const events = step(this.world, input);
      this.handleSimEvents(events);
      this.renderer.handleEvents(events);
      this.audio.handleEvents(events);
      this.accumulator -= DT;

      // Reset one-shot roll trigger for subsequent ticks in the same frame
      input.roll = false;
    }

    this.renderer.render(this.world);
    if (this.isRunning) {
      this.rafId = requestAnimationFrame((t) => this.loop(t));
    }
  }

  private handleSimEvents(events: GameEvent[]): void {
    for (const e of events) {
      if (e.t === "gameOver") {
        this.stopLoop();
        saveHighScore(this.world.score);
        this.highScore = loadHighScore();
        this.ui.showGameOver(this.world.score, this.highScore);
      } else if (e.t === "stageClear") {
        this.stopLoop();
        saveHighScore(this.world.score);
        this.highScore = loadHighScore();
        this.ui.showVictory(
          this.world.score,
          this.highScore,
          this.world.stats.killed,
          this.world.stats.spawned,
          this.world.player.deaths === 0 ? this.world.stats.noMissBonus : 0,
        );
      }
    }
  }

  private setupTestHooks(): void {
    (window as unknown as { __testHook: unknown }).__testHook = {
      getWorld: () => this.world,
      stepOnce: (input: InputFrame) => step(this.world, input),
      startWithSeed: (seed: number, startAt?: number) => {
        this.world = createWorld({ seed, startAt });
        this.startLoop();
      },
      getAudioAnalyser: () => this.audio.analyser,
      setAudioMuted: (m: boolean) => this.audio.setMuted(m),
    };
  }
}
