import { describe, it, expect, beforeEach, vi } from "vitest";
import { createWorld, step } from "../src/sim/world";
import { STAGE1_WAVES } from "../src/sim/stage1";
import { STAGE2_WAVES } from "../src/sim/stage2";
import { STAGE3_WAVES } from "../src/sim/stage3";
import { fireEnemyBullet } from "../src/sim/patterns";
import { GameApp } from "../src/core/loop";
import { GameEvent, NO_INPUT } from "../src/sim/types";
import { damageEnemy, spawnEnemy } from "../src/sim/enemies";
import { addManaUnits } from "../src/sim/player";

describe("Three-Stage Premium Campaign (v0.9.0)", () => {
  it("Stage 1 has exactly 53 normal enemies", () => {
    let count = 0;
    for (const w of STAGE1_WAVES) {
      if (w.kind !== "albatross" && w.kind !== "celestialGuardian") {
        count += w.count ?? 1;
      }
    }
    expect(count).toBe(53);
  });

  it("Stage 2 has exactly 70 normal enemies (33% increase over 53)", () => {
    let count = 0;
    for (const w of STAGE2_WAVES) {
      if (w.kind !== "kraken" && w.kind !== "leviathan") {
        count += w.count ?? 1;
      }
    }
    expect(count).toBe(70);
  });

  it("Stage 3 has exactly 94 normal enemies (33% increase over 70, 53 * 1.33^2)", () => {
    let count = 0;
    for (const w of STAGE3_WAVES) {
      if (w.kind !== "hollowStag" && w.kind !== "fateWeaver") {
        count += w.count ?? 1;
      }
    }
    expect(count).toBe(94);
  });

  it("Bullet speed multipliers: Stage 1 = 1.0x, Stage 2 = 1.2x, Stage 3 = 1.44x", () => {
    const w1 = createWorld({ seed: 42, startStage: 1 });
    const w2 = createWorld({ seed: 42, startStage: 2 });
    const w3 = createWorld({ seed: 42, startStage: 3 });

    fireEnemyBullet(w1, 360, 200, 100, false);
    fireEnemyBullet(w2, 360, 200, 100, false);
    fireEnemyBullet(w3, 360, 200, 100, false);

    const b1 = w1.bullets[0];
    const b2 = w2.bullets[0];
    const b3 = w3.bullets[0];

    expect(b1.vy).toBeCloseTo(100);
    expect(b2.vy).toBeCloseTo(120); // 100 * 1.2
    expect(b3.vy).toBeCloseTo(144); // 100 * 1.44
  });

  it("Transfers player progression across Stage 1 -> Stage 2 -> Stage 3", () => {
    const w1 = createWorld({ seed: 1234, startStage: 1 });
    w1.score = 45000;
    w1.player.lives = 4;
    w1.player.power = 3;
    w1.player.mana = 50;
    w1.player.manaUnits = 2000;

    const w2 = createWorld({ seed: 5678, startStage: 2 });
    w2.score = w1.score;
    w2.player.lives = w1.player.lives;
    w2.player.power = w1.player.power;
    w2.player.mana = w1.player.mana;
    w2.player.manaUnits = w1.player.manaUnits;

    expect(w2.currentStage).toBe(2);
    expect(w2.score).toBe(45000);
    expect(w2.player.manaUnits).toBe(2000);

    const w3 = createWorld({ seed: 9999, startStage: 3 });
    w3.score = w2.score + 35000;
    w3.player.lives = w2.player.lives;
    w3.player.power = w2.player.power;
    w3.player.mana = w2.player.mana;
    w3.player.manaUnits = w2.player.manaUnits;

    expect(w3.currentStage).toBe(3);
    expect(w3.score).toBe(80000);
    expect(w3.player.manaUnits).toBe(2000);
  });

  it("Rebalanced 1/40 mana system maintains 4000 units = 100% full charge", () => {
    const world = createWorld({ seed: 42, startAt: 10 });
    const p = world.player;
    expect(p.manaUnits).toBe(0);
    expect(p.mana).toBe(0);

    // Each charge source now awards 10x its previous mana amount.
    addManaUnits(p, 10);
    expect(p.manaUnits).toBe(100);
    expect(p.mana).toBe(2.5);

    addManaUnits(p, 2);
    expect(p.manaUnits).toBe(120);
    expect(p.mana).toBe(3);

    addManaUnits(p, 8);
    expect(p.manaUnits).toBe(200);
    expect(p.mana).toBe(5);

    addManaUnits(p, 25);
    expect(p.manaUnits).toBe(450);
    expect(p.mana).toBe(11.25);

    // Charge to 4000 units (100%)
    addManaUnits(p, 4000);
    expect(p.manaUnits).toBe(4000);
    expect(p.mana).toBe(100);

    // Ultimate trigger resets both manaUnits and mana to 0
    step(world, { ...NO_INPUT, ult: true });
    expect(p.manaUnits).toBe(0);
    expect(p.mana).toBe(0);
    expect(p.ultimateTimer).toBe(90);
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
  it("Aegis Orbs do not collide with incoming enemy bullets", () => {
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

    // The orb no longer parries a near miss; the shield remains intact.
    const bulletAfter = w.bullets.find((b) => b.id === 991);
    expect(bulletAfter?.alive).toBe(true);
    expect(w.player.aegisOrbs.every((orb) => orb.alive)).toBe(true);
    expect(events.some((e) => e.t === "hit" && e.id === 991)).toBe(false);
  });

  it("Gungnir Ultimate deals exactly 35 total damage over its 42 active ticks", () => {
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
    expect(w.player.ultimateTimer).toBe(90);

    // Initial 30 ticks: Awakening & Summoning (no damage yet)
    const target = w.enemies.find((e) => e.id === 501);
    expect(target?.hp).toBe(100);

    // Advance 30 ticks to tick 60
    for (let t = 0; t < 30; t++) {
      step(w, NO_INPUT);
    }
    expect(w.player.ultimateTimer).toBe(60);

    // Step through the 42 continuous beam damage ticks (ticks 60 -> 18)
    for (let t = 0; t < 42; t++) {
      step(w, NO_INPUT);
    }

    // 100 - 35 continuous damage = 65 HP remaining
    expect(target?.hp).toBe(65);
  });

  it("orb ignores a near miss without losing charges; pickup restores a previously used shield", () => {
    const w = createWorld({ seed: 777, startAt: 10 });
    expect(w.player.aegisOrbs.filter((o) => o.alive).length).toBe(2);

    // Place an enemy bullet right where Orb 0 will be on the step
    const orb0 = w.player.aegisOrbs[0];
    const nextAngle = (w.player.orbitSwords.angle + 0.08) % (Math.PI * 2);
    const ox = w.player.x + Math.cos(nextAngle + orb0.angleOffset) * 72;
    const oy = w.player.y + Math.sin(nextAngle + orb0.angleOffset) * 72;

    w.bullets.push({
      id: 9991,
      x: ox,
      y: oy,
      vx: 0,
      vy: 0,
      r: 6,
      owner: "enemy",
      alive: true,
      dmg: 1,
    });

    step(w, NO_INPUT);

    // A parry near the orb never consumes a shield; only a body hit does.
    expect(w.player.aegisOrbs.every((o) => o.alive)).toBe(true);
    // Simulate a previously used shield before testing the existing pickup.
    w.player.aegisOrbs[0].alive = false;
    w.player.aegisOrbs[0].hp = 0;

    // Aegis pickup restores the used shield
    w.pickups.push({
      id: 9992,
      kind: "aegis",
      x: w.player.x,
      y: w.player.y,
      age: 0,
      alive: true,
    });

    step(w, NO_INPUT);
    expect(w.player.aegisOrbs.filter((o) => o.alive).length).toBe(2);
  });

  it("POW pickup upgrades 3-lane power cyclically (center -> left -> right) beyond Lv 3", () => {
    const w = createWorld({ seed: 888, startAt: 10 });
    w.player.power = 3;
    expect(w.player.lanePower.center).toBe(1.0);
    expect(w.player.lanePower.left).toBe(1.0);
    expect(w.player.lanePower.right).toBe(1.0);
    expect(w.player.lanePower.nextLane).toBe("center");

    // Collect 1st POW -> upgrades center to 1.5x
    w.pickups.push({ id: 1, kind: "pow", x: w.player.x, y: w.player.y, age: 0, alive: true });
    step(w, NO_INPUT);
    expect(w.player.lanePower.center).toBe(1.5);
    expect(w.player.lanePower.nextLane).toBe("left");

    // Collect 2nd POW -> upgrades left to 1.5x
    w.pickups.push({ id: 2, kind: "pow", x: w.player.x, y: w.player.y, age: 0, alive: true });
    step(w, NO_INPUT);
    expect(w.player.lanePower.left).toBe(1.5);
    expect(w.player.lanePower.nextLane).toBe("right");

    // Collect 3rd POW -> upgrades right to 1.5x
    w.pickups.push({ id: 3, kind: "pow", x: w.player.x, y: w.player.y, age: 0, alive: true });
    step(w, NO_INPUT);
    expect(w.player.lanePower.right).toBe(1.5);
    expect(w.player.lanePower.nextLane).toBe("center");
  });

  it("Midboss defeat emits midbossDefeated and re-anchors stageTick to resume wave in 2s", () => {
    const w = createWorld({ seed: 999, startStage: 1, startAt: 34 });
    w.stageTick = 2100; // 35.0s
    w.waveCursor = 14; // Wave cursor pointing to the post-midboss wave at index 14 (at 48.0s)

    // Midboss enemy (albatross)
    const midboss = {
      id: 7001,
      kind: "albatross" as const,
      x: 360,
      y: 200,
      x0: 360,
      y0: 200,
      hp: 1,
      maxHp: 140,
      r: 90,
      alive: true,
      age: 0,
      flash: 0,
      parts: [],
      heading: 0,
      ground: false,
      path: "hover" as const,
      fireTimer: 999,
      formation: -1,
      sx: 0,
      sy: 200,
      mode: 1,
    };
    w.enemies.push(midboss);

    // Hit midboss to death via unified damage pipeline
    const events: GameEvent[] = [];
    damageEnemy(w, midboss, 10, events);

    expect(events.some((e) => e.t === "midbossDefeated")).toBe(true);
    expect(w.phase).toBe("play");

    // The stageTick should have been re-anchored to ~2.0s before the next wave (at 48.0s -> 46.0s = 2760 ticks)
    // rather than waiting 14 seconds!
    expect(w.stageTick).toBe(2760); // (48 - 2) * 60 = 2760
  });
});

describe("Aegis repair item availability", () => {
  it("offers a formation-clear repair reward in all three stages", () => {
    for (const waves of [STAGE1_WAVES, STAGE2_WAVES, STAGE3_WAVES]) {
      expect(waves.some((wave) => wave.reward === "aegis")).toBe(true);
    }
  });
  it("drops a repair pickup from each midboss", () => {
    for (const [stage, kind] of [[1, "albatross"], [2, "kraken"], [3, "hollowStag"]] as const) {
      const w = createWorld({ seed: 11, startAt: 1, startStage: stage });
      const midboss = spawnEnemy(w, kind, 360, 300, "hover");
      damageEnemy(w, midboss, midboss.maxHp + 1, []);
      expect(w.pickups.filter((item) => item.kind === "aegis")).toHaveLength(1);
    }
  });
});
