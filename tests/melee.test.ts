import { describe, expect, it } from "vitest";
import { spawnEnemy } from "../src/sim/enemies";
import { checkMeleeHits } from "../src/sim/collision";
import { step } from "../src/sim/world";
import { createWorld } from "../src/sim/world";

describe("Alternating Left/Right Sword Combat (좌우 교대 검격)", () => {
  it("strictly alternates slash directions (L->R, R->L, L->R, R->L)", () => {
    const world = createWorld({ seed: 20261103, startAt: 1.0 }); // start in play phase
    const fireInput = { moveX: 0, moveY: 0, fire: true, roll: false, ult: false, dragDx: 0, dragDy: 0 };

    const directions: string[] = [];

    // Press fire across multiple cooldown intervals
    for (let i = 0; i < 200; i++) {
      const events = step(world, fireInput);
      for (const ev of events) {
        if (ev.t === "meleeSlash") {
          directions.push(ev.direction);
        }
      }
    }

    expect(directions.length).toBeGreaterThanOrEqual(4);
    // Verify alternation: [l2r, r2l, l2r, r2l, ...]
    for (let i = 0; i < directions.length; i++) {
      const expected = i % 2 === 0 ? "l2r" : "r2l";
      expect(directions[i]).toBe(expected);
    }
  });

  it("hits enemies within 108px frontal reach exactly once per swing", () => {
    const world = createWorld({ seed: 20261103, startAt: 1.0 });
    const p = world.player;
    p.x = 360;
    p.y = 800;

    // Spawn an enemy right ahead of player (within 108px)
    const enemy = spawnEnemy(world, "condor", 360, 720, "straight"); // 80px distance ahead
    const initialHp = enemy.hp;

    const fireInput = { moveX: 0, moveY: 0, fire: true, roll: false, ult: false, dragDx: 0, dragDy: 0 };
    const events = step(world, fireInput);

    // Melee hit should be detected
    const meleeHitEvents = events.filter((e) => e.t === "meleeHit");
    expect(meleeHitEvents.length).toBe(1);
    // In hybrid combat, enemy takes melee (2) + projectile (1) = 3 total damage
    expect(enemy.hp).toBe(initialHp - 3);
    expect(world.hitstopTimer).toBeGreaterThanOrEqual(1); // Hitstop triggered

    // Next tick with ongoing swing should NOT hit the same enemy again
    const nextEvents = step(world, { moveX: 0, moveY: 0, fire: false, roll: false, ult: false, dragDx: 0, dragDy: 0 });
    const duplicateHits = nextEvents.filter((e) => e.t === "meleeHit");
    expect(duplicateHits.length).toBe(0);
  });

  it("deals enhanced damage 3 when power level >= 2", () => {
    const world = createWorld({ seed: 20261103, startAt: 1.0 });
    const p = world.player;
    p.x = 360;
    p.y = 800;
    p.power = 2; // Enhanced power

    const enemy = spawnEnemy(world, "condor", 360, 720, "straight");
    const initialHp = enemy.hp;

    const fireInput = { moveX: 0, moveY: 0, fire: true, roll: false, ult: false, dragDx: 0, dragDy: 0 };
    const events = step(world, fireInput);

    const hit = events.find((e) => e.t === "meleeHit");
    expect(hit).toBeDefined();
    if (hit && hit.t === "meleeHit") {
      expect(hit.dmg).toBe(3);
    }
    // Hybrid combat with dual cannons (2x1 + 3 melee = 5 damage)
    expect(enemy.hp).toBe(initialHp - 5);
  });

  it("does not melee hit enemies behind player", () => {
    const world = createWorld({ seed: 20261103, startAt: 1.0 });
    const p = world.player;
    p.x = 360;
    p.y = 600;

    // Enemy is behind player (y = 700 > 600)
    const enemy = spawnEnemy(world, "kestrel", 360, 700, "straight");
    const initialHp = enemy.hp;

    const fireInput = { moveX: 0, moveY: 0, fire: true, roll: false, ult: false, dragDx: 0, dragDy: 0 };
    const events = step(world, fireInput);

    const meleeHits = events.filter((e) => e.t === "meleeHit");
    expect(meleeHits.length).toBe(0);
    expect(enemy.hp).toBe(initialHp);
  });
});

describe("Two-hit melee rhythm", () => {
  it("performs two fast swings followed by a longer recovery without slowing projectile shots", () => {
    const w = createWorld({ seed: 20261108, startAt: 1.0 });
    const held = { moveX: 0, moveY: 0, fire: true, roll: false, ult: false, dragDx: 0, dragDy: 0 };
    const slashes: Array<{ tick: number; direction: string }> = [];
    let shots = 0;
    for (let i = 0; i < 85; i++) {
      const events = step(w, held);
      for (const e of events) {
        if (e.t === "meleeSlash") slashes.push({ tick: w.tick, direction: e.direction });
        if (e.t === "shot") shots++;
      }
    }
    expect(slashes.slice(0, 7).map(s => s.direction)).toEqual([
      "l2r", "r2l", "l2r", "r2l", "l2r", "r2l", "l2r",
    ]);
    const t = slashes.map(s => s.tick);
    // 8 ticks between the two hits, 18 ticks before the next pair.
    // startAt: 1 initializes the world at tick 60; assert relative cadence.
    expect(t.slice(0, 7).map((tick) => tick - t[0])).toEqual([0, 8, 26, 34, 52, 60, 78]);
    expect(shots).toBeGreaterThan(slashes.length); // ranged fire stays continuous
  });

  it("rolling cancels a pending melee combo", () => {
    const w = createWorld({ seed: 20261108, startAt: 1.0 });
    const held = { moveX: 0, moveY: 0, fire: true, roll: false, ult: false, dragDx: 0, dragDy: 0 };
    step(w, held);
    expect(w.player.meleeComboStep).toBe(1);
    const ev = step(w, { ...held, roll: true });
    expect(ev.some(e => e.t === "roll")).toBe(true);
    expect(w.player.meleeComboStep).toBe(0);
    expect(w.player.meleeSwing).toBeNull();
  });
});

describe("Short-range melee collision contract", () => {
  it("hits a close target but rejects distant and lateral targets", () => {
    const w = createWorld({ seed: 11, startAt: 1 });
    w.player.x = 360;
    w.player.y = 800;
    const near = spawnEnemy(w, "kestrel", 360, 720, "straight");
    const distant = spawnEnemy(w, "kestrelRed", 360, 652, "straight");
    const lateral = spawnEnemy(w, "harrier", 465, 745, "straight");
    w.player.meleeSwing = { id: 999, direction: "l2r", tick: 0, duration: 8, hitEnemyIds: [] };
    checkMeleeHits(w, []);
    expect(near.hp).toBeLessThan(1);
    expect(distant.hp).toBe(1);
    expect(lateral.hp).toBe(3);
  });

  it("does not hit distant boss just because its collision radius is huge", () => {
    const w = createWorld({ seed: 12, startAt: 1 });
    w.player.x = 360;
    w.player.y = 800;
    const boss = spawnEnemy(w, "leviathan", 360, 570, "hover");
    const hp = boss.hp;
    w.player.meleeSwing = { id: 1000, direction: "l2r", tick: 0, duration: 8, hitEnemyIds: [] };
    checkMeleeHits(w, []);
    expect(boss.hp).toBe(hp);
  });
});
