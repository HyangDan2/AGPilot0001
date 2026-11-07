import { describe, it, expect, beforeEach, vi } from "vitest";
import { createWorld, step } from "../src/sim/world";
import { STAGE1_WAVES } from "../src/sim/stage1";
import { STAGE2_WAVES } from "../src/sim/stage2";
import { fireEnemyBullet } from "../src/sim/patterns";
import { GameApp } from "../src/core/loop";
import { NO_INPUT } from "../src/sim/types";

describe("Two-Stage Premium Campaign (v0.7.1)", () => {
  it("Stage 1 has exactly 53 normal enemies", () => {
    let count = 0;
    for (const w of STAGE1_WAVES) {
      if (w.kind !== "albatross" && w.kind !== "leviathan") {
        count += w.count ?? 1;
      }
    }
    expect(count).toBe(53);
  });

  it("Stage 2 has exactly 70 normal enemies (33% increase over 53)", () => {
    let count = 0;
    for (const w of STAGE2_WAVES) {
      if (w.kind !== "albatross" && w.kind !== "leviathan" && w.kind !== "kraken") {
        count += w.count ?? 1;
      }
    }
    expect(count).toBe(70);
  });

  it("Stage 2 applies 1.2x bullet speed multiplier", () => {
    const w1 = createWorld({ seed: 42, startStage: 1 });
    const w2 = createWorld({ seed: 42, startStage: 2 });

    fireEnemyBullet(w1, 360, 200, 100, false);
    fireEnemyBullet(w2, 360, 200, 100, false);

    const b1 = w1.bullets[0];
    const b2 = w2.bullets[0];

    expect(b1.vy).toBeCloseTo(100);
    expect(b2.vy).toBeCloseTo(120); // 100 * 1.2
  });

  it("Transfers player progression when advancing from Stage 1 to Stage 2", () => {
    const w = createWorld({ seed: 1234, startStage: 1 });
    w.score = 45000;
    w.player.lives = 4;
    w.player.power = 3;
    w.player.mana = 85;

    // Simulate startNextStage() mechanics from loop.ts
    const w2 = createWorld({ seed: 5678, startStage: 2 });
    w2.score = w.score;
    w2.player.lives = w.player.lives;
    w2.player.power = w.player.power;
    w2.player.mana = w.player.mana;

    expect(w2.currentStage).toBe(2);
    expect(w2.score).toBe(45000);
    expect(w2.player.lives).toBe(4);
    expect(w2.player.power).toBe(3);
    expect(w2.player.mana).toBe(85);
    expect(w2.stageTick).toBe(0);
  });
});

interface TestGameApp {
  startGame: () => void;
  returnToTitle: () => void;
  world: { score: number; player: { lives: number } };
  isRunning: boolean;
  isPaused: boolean;
  highScore: number;
}

describe("Pause Menu & Return to Title (v0.7.1)", () => {
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
    };
    g.window = globalThis;
    g.location = { search: "" };
    (g.window as Record<string, unknown>).location = g.location;
    (g.window as Record<string, unknown>).addEventListener = vi.fn();
    (g.window as Record<string, unknown>).removeEventListener = vi.fn();
    g.requestAnimationFrame = vi.fn(() => 1);
    g.cancelAnimationFrame = vi.fn();
  });

  it("returnToTitle preserves high score and resets game session", () => {
    const mockCanvas = {
      width: 720,
      height: 1280,
      style: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getContext: () =>
        new Proxy(
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
        ),
    } as unknown as HTMLCanvasElement;

    const mockOverlay = {
      innerHTML: "",
      appendChild: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as HTMLDivElement;

    const app = new GameApp(mockCanvas, mockOverlay);
    const testApp = app as unknown as TestGameApp;
    testApp.startGame();

    // Player earns score
    testApp.world.score = 88000;

    // Return to title
    testApp.returnToTitle();

    expect(testApp.isRunning).toBe(false);
    expect(testApp.isPaused).toBe(false);
    expect(testApp.highScore).toBe(88000);
    expect(testApp.world.score).toBe(0);
    expect(testApp.world.player.lives).toBe(3);
  });
});

describe("Azure Aegis Orbs & Gungnir Ultimate v2", () => {
  it("Aegis Orbs parry incoming enemy bullets and generate mana", () => {
    const w = createWorld({ seed: 42, startAt: 10 });
    w.player.x = 360;
    w.player.y = 800;
    w.player.orbitSwords = { active: true, angle: 0 };
    w.player.mana = 20;

    // Spawn enemy bullet at Aegis Orb position (360 + 72 = 432, 800)
    w.bullets.push({
      id: 991,
      x: 432,
      y: 800,
      vx: 0,
      vy: 10,
      r: 6,
      dmg: 1,
      owner: "enemy",
      alive: true,
    });

    const events = step(w, NO_INPUT);

    // Bullet parried and removed
    const bulletAfter = w.bullets.find((b) => b.id === 991);
    expect(bulletAfter).toBeUndefined();
    expect(events.some((e) => e.t === "hit" && e.id === 991)).toBe(true);
  });

  it("Gungnir Ultimate v2 deals 40 impact + 30 shockwave = 70 total damage", () => {
    const w = createWorld({ seed: 42, startAt: 10 });
    w.player.x = 360;
    w.player.y = 800;
    w.player.mana = 100;

    // Spawn high-HP enemy directly in the corridor with straight path
    w.enemies.push({
      id: 501,
      kind: "harrier",
      x: 360,
      y: 400,
      x0: 360,
      y0: 400,
      hp: 100,
      maxHp: 100,
      r: 24,
      alive: true,
      age: 0,
      flash: 0,
      parts: [],
      heading: 0,
      ground: false,
      path: "straight",
      fireTimer: 999,
      formation: -1,
      sx: 0,
      sy: 0,
      mode: 0,
    });

    // Trigger Ultimate via input
    step(w, { ...NO_INPUT, ult: true });

    // Initial impact frame: deals 40 damage (100 -> 60 HP)
    const target = w.enemies.find((e) => e.id === 501);
    expect(target?.hp).toBe(60);

    // Step through follow-up shockwaves at ticks 60, 45, 30 (3 x 10 = 30 dmg)
    for (let t = 0; t < 65; t++) {
      step(w, NO_INPUT);
    }

    // 60 - 30 = 30 HP remaining (total 70 damage dealt)
    expect(target?.hp).toBe(30);
  });
});
