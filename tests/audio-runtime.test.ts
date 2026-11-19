import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioRuntime } from "../src/audio/runtime";
import { GameApp } from "../src/core/loop";
import { GameEvent } from "../src/sim/types";

/** Length of the VALKYRIE EIRA trailer theme used as the game's music bed. */
const TRACK_SECONDS = 172.245;

class FakeAudioParam {
  value = 1;
  setValueAtTime(v: number): this {
    this.value = v;
    return this;
  }
  linearRampToValueAtTime(v: number): this {
    this.value = v;
    return this;
  }
  exponentialRampToValueAtTime(v: number): this {
    this.value = v;
    return this;
  }
  setTargetAtTime(v: number): this {
    this.value = v;
    return this;
  }
  cancelScheduledValues(): this {
    return this;
  }
}

class FakeGainNode {
  gain = new FakeAudioParam();
  connect(): void {}
  disconnect(): void {}
}

class FakeBufferSource {
  buffer: { duration: number } | null = null;
  loop = false;
  startOffset = 0;
  stopCalls = 0;
  connect(): void {}
  disconnect(): void {}
  start(_when: number, offset = 0): void {
    this.startOffset = offset;
  }
  stop(): void {
    this.stopCalls += 1;
  }
}

class FakeMediaContext {
  currentTime = 0;
  state: AudioContextState = "running";
  sampleRate = 48000;
  destination = {};
  sources: FakeBufferSource[] = [];

  createGain(): FakeGainNode {
    return new FakeGainNode();
  }
  createBufferSource(): FakeBufferSource {
    const source = new FakeBufferSource();
    this.sources.push(source);
    return source;
  }
  createAnalyser(): { fftSize: number; connect: () => void } {
    return { fftSize: 256, connect: () => {} };
  }
  async decodeAudioData(): Promise<{ duration: number }> {
    return { duration: TRACK_SECONDS };
  }
}

const MANIFEST = {
  version: 1,
  formats: ["ogg", "m4a"],
  sounds: {
    bgm_main: { base: "assets/audio/bgm_main" },
    jingle_clear: { base: "assets/audio/jingle_clear" },
    jingle_gameover: { base: "assets/audio/jingle_gameover" },
    sfx_warning: { base: "assets/audio/sfx_warning" },
  },
};

function fakeFetch(): (input: RequestInfo | URL) => Promise<Response> {
  return () =>
    Promise.resolve({
      ok: true,
      json: async () => MANIFEST,
      arrayBuffer: async () => new ArrayBuffer(8),
    } as unknown as Response);
}

interface Harness {
  audio: AudioRuntime;
  ctx: FakeMediaContext;
  loopingSources: () => FakeBufferSource[];
}

async function createHarness(): Promise<Harness> {
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = { AudioContext: function FakeAudioContext() {} };
  const ctx = new FakeMediaContext();
  const audio = new AudioRuntime({
    createContext: () => ctx as unknown as AudioContext,
    fetchImpl: fakeFetch(),
  });
  audio.init();
  await audio.whenReady();
  return {
    audio,
    ctx,
    loopingSources: () => ctx.sources.filter((s) => s.loop),
  };
}

describe("AudioRuntime — VALKYRIE EIRA trailer theme", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(fakeFetch()));
  });

  it("starts the theme from the top and loops the whole track", async () => {
    const { audio, loopingSources } = await createHarness();
    audio.playBGM("bgm_main");

    expect(audio.getCurrentBgmId()).toBe("bgm_main");
    expect(audio.isBgmPlaying()).toBe(true);
    expect(loopingSources()).toHaveLength(1);
    expect(loopingSources()[0].startOffset).toBe(0);
    expect(audio.currentBgmPosition()).toBe(0);
  });

  it("keeps one continuous track through boss warning, midboss defeat, stage clear and the next stage", async () => {
    const { audio, ctx, loopingSources } = await createHarness();
    audio.playBGM("bgm_main");
    const bed = loopingSources()[0];

    ctx.currentTime = 10;
    audio.handleEvents([{ t: "warning", isMidboss: false }] as GameEvent[]);
    ctx.currentTime = 25;
    audio.handleEvents([{ t: "midbossDefeated", kind: "albatross" }] as GameEvent[]);
    ctx.currentTime = 60;
    audio.handleEvents([{ t: "stageClear", stage: 1 }] as GameEvent[]);

    expect(audio.getCurrentBgmId()).toBe("bgm_main");
    expect(audio.isBgmPlaying()).toBe(true);
    // No new music source was created and the original one was never stopped.
    expect(loopingSources()).toHaveLength(1);
    expect(loopingSources()[0]).toBe(bed);
    expect(bed.stopCalls).toBe(0);
    expect(audio.currentBgmPosition()).toBeCloseTo(60, 5);
  });

  it("stops the theme on game over and starts it again on retry", async () => {
    const { audio, loopingSources } = await createHarness();
    audio.playBGM("bgm_main");
    const bed = loopingSources()[0];

    vi.useFakeTimers();
    audio.handleEvents([{ t: "gameOver" }] as GameEvent[]);
    expect(audio.isBgmPlaying()).toBe(false);
    expect(audio.getCurrentBgmId()).toBeNull();
    // The short fade-out ends with the source actually stopped.
    vi.advanceTimersByTime(500);
    expect(bed.stopCalls).toBe(1);
    vi.useRealTimers();

    audio.playBGM("bgm_main");
    expect(audio.isBgmPlaying()).toBe(true);
    expect(loopingSources()).toHaveLength(2);
    expect(loopingSources()[1].startOffset).toBe(0);
  });

  it("pauses at the current position and resumes from that exact spot", async () => {
    const { audio, ctx, loopingSources } = await createHarness();
    audio.playBGM("bgm_main");

    ctx.currentTime = 42.5;
    expect(audio.currentBgmPosition()).toBeCloseTo(42.5, 5);

    audio.setGameplayPaused(true);
    expect(audio.isBgmPlaying()).toBe(false);
    expect(audio.currentBgmPosition()).toBeCloseTo(42.5, 5);

    // Time passing while paused must not advance the track.
    ctx.currentTime = 500;
    expect(audio.currentBgmPosition()).toBeCloseTo(42.5, 5);

    audio.setGameplayPaused(false);
    expect(audio.isBgmPlaying()).toBe(true);
    const resumed = loopingSources()[1];
    expect(resumed.startOffset).toBeCloseTo(42.5, 5);
    expect(audio.currentBgmPosition()).toBeCloseTo(42.5, 5);
  });

  it("wraps a resume position that runs past the end of the track", async () => {
    const { audio, ctx, loopingSources } = await createHarness();
    audio.playBGM("bgm_main");

    ctx.currentTime = 200; // 27.755s past the 172.245s track end
    audio.setGameplayPaused(true);
    expect(audio.currentBgmPosition()).toBeCloseTo(200 - TRACK_SECONDS, 5);

    audio.setGameplayPaused(false);
    expect(loopingSources()[1].startOffset).toBeCloseTo(200 - TRACK_SECONDS, 5);
  });

  it("muting never rewinds or restarts the music", async () => {
    const { audio, ctx, loopingSources } = await createHarness();
    audio.playBGM("bgm_main");
    ctx.currentTime = 12;

    audio.setMuted(true);
    expect(audio.isBgmPlaying()).toBe(true);
    expect(audio.currentBgmPosition()).toBeCloseTo(12, 5);

    ctx.currentTime = 18;
    audio.setMuted(false);
    expect(loopingSources()).toHaveLength(1);
    expect(audio.isBgmPlaying()).toBe(true);
    expect(audio.currentBgmPosition()).toBeCloseTo(18, 5);
  });
});

function make2dContext(): unknown {
  return new Proxy(
    {
      canvas: {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
    },
    {
      get: (target, prop) => {
        const rec = target as Record<string, unknown>;
        if (prop in target) return rec[prop as string];
        return () => {};
      },
    },
  );
}

interface TestGameApp {
  startGame: () => void;
  returnToTitle: () => void;
  isRunning: boolean;
}

describe("GameApp — title screen stays silent", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    const g = globalThis as unknown as Record<string, unknown>;
    g.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    };
    g.document = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getElementById: vi.fn(() => ({
        addEventListener: vi.fn(),
        remove: vi.fn(),
      })),
      createElement: vi.fn((tag: string) =>
        tag === "audio" ? { canPlayType: () => "" } : { width: 0, height: 0, style: {}, getContext: () => make2dContext() },
      ),
    };
    g.window = globalThis;
    g.location = { search: "" };
    (g.window as Record<string, unknown>).location = g.location;
    (g.window as Record<string, unknown>).addEventListener = vi.fn();
    (g.window as Record<string, unknown>).removeEventListener = vi.fn();
    g.requestAnimationFrame = vi.fn(() => 1);
    g.cancelAnimationFrame = vi.fn();
    vi.stubGlobal("fetch", vi.fn(fakeFetch()));
  });

  it("returnToTitle stops the trailer theme and starts no title music", async () => {
    const ctx = new FakeMediaContext();
    const audio = new AudioRuntime({
      createContext: () => ctx as unknown as AudioContext,
      fetchImpl: fakeFetch(),
    });

    const mockCanvas = {
      width: 720,
      height: 1280,
      style: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getContext: () => make2dContext(),
    } as unknown as HTMLCanvasElement;

    const mockOverlay = {
      innerHTML: "",
      appendChild: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as HTMLDivElement;

    const app = new GameApp(mockCanvas, mockOverlay, audio);
    const testApp = app as unknown as TestGameApp;

    testApp.startGame();
    await audio.whenReady();

    expect(audio.getCurrentBgmId()).toBe("bgm_main");
    expect(audio.isBgmPlaying()).toBe(true);

    testApp.returnToTitle();

    expect(audio.getCurrentBgmId()).toBeNull();
    expect(audio.isBgmPlaying()).toBe(false);
    expect(ctx.sources.filter((s) => s.loop)).toHaveLength(1);
  });
});
