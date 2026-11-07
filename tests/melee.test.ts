import { describe, expect, it } from "vitest";
import { spawnEnemy } from "../src/sim/enemies";
import { step } from "../src/sim/world";
import { createWorld } from "../src/sim/world";

describe("Alternating Left/Right Sword Combat (좌우 교대 검격)", () => {
  it("strictly alternates slash directions (L->R, R->L, L->R, R->L)", () => {
    const world = createWorld({ seed: 20261103, startAt: 1.0 }); // start in play phase
    const fireInput = { moveX: 0, moveY: 0, fire: true, roll: false, dragDx: 0, dragDy: 0 };

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

  it("hits enemies within 130px frontal reach exactly once per swing", () => {
    const world = createWorld({ seed: 20261103, startAt: 1.0 });
    const p = world.player;
    p.x = 360;
    p.y = 800;

    // Spawn an enemy right ahead of player (within 130px)
    const enemy = spawnEnemy(world, "condor", 360, 720, "straight"); // 80px distance ahead
    const initialHp = enemy.hp;

    const fireInput = { moveX: 0, moveY: 0, fire: true, roll: false, dragDx: 0, dragDy: 0 };
    const events = step(world, fireInput);

    // Melee hit should be detected
    const meleeHitEvents = events.filter((e) => e.t === "meleeHit");
    expect(meleeHitEvents.length).toBe(1);
    // In hybrid combat, enemy takes melee (2) + projectile (1) = 3 total damage
    expect(enemy.hp).toBe(initialHp - 3);
    expect(world.hitstopTimer).toBeGreaterThanOrEqual(1); // Hitstop triggered

    // Next tick with ongoing swing should NOT hit the same enemy again
    const nextEvents = step(world, { moveX: 0, moveY: 0, fire: false, roll: false, dragDx: 0, dragDy: 0 });
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

    const fireInput = { moveX: 0, moveY: 0, fire: true, roll: false, dragDx: 0, dragDy: 0 };
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

    const fireInput = { moveX: 0, moveY: 0, fire: true, roll: false, dragDx: 0, dragDy: 0 };
    const events = step(world, fireInput);

    const meleeHits = events.filter((e) => e.t === "meleeHit");
    expect(meleeHits.length).toBe(0);
    expect(enemy.hp).toBe(initialHp);
  });
});
