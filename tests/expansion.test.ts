import { describe, expect, it } from "vitest";
import { createWorld, step } from "../src/sim/world";
import { NO_INPUT } from "../src/sim/types";
import { STAGE2_WAVES } from "../src/sim/stage2";
import { fireEnemyBullet } from "../src/sim/patterns";

describe("Expansion Combat Mechanics", () => {
  it("grazes enemy bullets within 12~36px to grant score and mana", () => {
    const world = createWorld({ seed: 42, startAt: 10 });
    world.player.x = 360;
    world.player.y = 800;
    world.player.mana = 20;

    // Bullet flying near Eira (distance 25px: x=385, y=800)
    world.bullets.push({
      id: 999,
      x: 385,
      y: 800,
      vx: 0,
      vy: 100,
      r: 4,
      dmg: 1,
      owner: "enemy",
      alive: true,
    });

    const events = step(world, NO_INPUT);
    const grazeEvents = events.filter((e) => e.t === "graze");

    expect(grazeEvents.length).toBe(1);
    expect(world.player.grazeCount).toBe(1);
    expect(world.player.mana).toBe(30); // 20 + 10
    expect(world.stats.grazes).toBe(1);
    expect(world.bullets.find((b) => b.id === 999)?.grazed).toBe(true);

    // Second step should not re-graze same bullet
    step(world, NO_INPUT);
    expect(world.player.grazeCount).toBe(1);
  });

  it("orbiting aegis swords parry enemy bullets and damage nearby enemies", () => {
    const world = createWorld({ seed: 42, startAt: 10 });
    world.player.x = 360;
    world.player.y = 800;
    world.player.orbitSwords.angle = 0; // Sword 1 at (360 + 72, 800) = (432, 800)

    // Place an enemy bullet right at the sword position
    world.bullets.push({
      id: 888,
      x: 432,
      y: 800,
      vx: 0,
      vy: 100,
      r: 4,
      dmg: 1,
      owner: "enemy",
      alive: true,
    });

    const bulletBefore = world.bullets.find((b) => b.id === 888);
    expect(bulletBefore?.alive).toBe(true);

    const events = step(world, NO_INPUT);
    const bulletAfter = world.bullets.find((b) => b.id === 888);
    // Bullet was parried and removed or marked dead
    expect(bulletAfter).toBeUndefined();
    expect(events.some((e) => e.t === "hit" && e.id === 888)).toBe(true);
  });

  it("activates Gungnir Judgement ultimate when mana >= 100", () => {
    const world = createWorld({ seed: 42, startAt: 10 });
    world.player.x = 360;
    world.player.y = 800;
    world.player.mana = 100;

    // Spawn 3 enemy bullets on screen
    world.bullets.push(
      { id: 101, x: 200, y: 500, vx: 0, vy: 100, r: 4, dmg: 1, owner: "enemy", alive: true },
      { id: 102, x: 500, y: 600, vx: 0, vy: 100, r: 4, dmg: 1, owner: "enemy", alive: true },
      { id: 103, x: 360, y: 700, vx: 0, vy: 100, r: 4, dmg: 1, owner: "enemy", alive: true }
    );

    // Spawn an enemy ahead in the beam corridor
    world.enemies.push({
      id: 201,
      kind: "harrier",
      x: 360,
      y: 400,
      x0: 360,
      y0: 400,
      path: "straight",
      age: 0,
      hp: 50,
      maxHp: 50,
      r: 24,
      ground: false,
      fireTimer: 999,
      flash: 0,
      heading: 0,
      formation: -1,
      sx: 0,
      sy: 0,
      mode: 0,
      parts: [],
      alive: true,
    });

    const ultInput = { ...NO_INPUT, ult: true };
    const events = step(world, ultInput);

    expect(events.some((e) => e.t === "ultimate")).toBe(true);
    expect(world.player.mana).toBe(0);
    expect(world.player.ultimateTimer).toBe(90);
    expect(world.player.invuln).toBeGreaterThanOrEqual(90);

    // Step 30 ticks through Awakening & Summoning to reach active beam at tick 60
    for (let t = 0; t < 30; t++) {
      step(world, NO_INPUT);
    }
    expect(world.player.ultimateTimer).toBe(60);

    // At tick 60 (beam active start), bullet wipe triggers
    expect(world.bullets.filter((b) => b.owner === "enemy" && b.alive).length).toBe(0);

    // Step through the 42 continuous beam damage ticks (ticks 60 -> 18)
    for (let t = 0; t < 42; t++) {
      step(world, NO_INPUT);
    }

    // Enemy with 50 HP in corridor must be completely destroyed by the 70 total continuous damage
    const deadEnemy = world.enemies.find((e) => e.id === 201);
    expect(deadEnemy).toBeUndefined();
  });

  it("does not activate ultimate without full mana", () => {
    const world = createWorld({ seed: 42, startAt: 10 });
    world.player.mana = 95;

    const ultInput = { ...NO_INPUT, ult: true };
    const events = step(world, ultInput);

    expect(events.some((e) => e.t === "ultimate")).toBe(false);
    expect(world.player.mana).toBe(95);
    expect(world.player.ultimateTimer).toBe(0);
  });

  it("verifies Stage 2 has exactly 70 normal enemies and 1.2x bullet speed", () => {
    const normalCount = STAGE2_WAVES
      .filter((w) => w.kind !== "albatross" && w.kind !== "leviathan" && w.kind !== "kraken")
      .reduce((sum, w) => sum + (w.count ?? 1), 0);
    expect(normalCount).toBe(70);

    // Bullet speed test
    const w1 = createWorld({ seed: 42, startStage: 1 });
    fireEnemyBullet(w1, 360, 100, 200, false);
    const b1 = w1.bullets[0];

    const w2 = createWorld({ seed: 42, startStage: 2 });
    fireEnemyBullet(w2, 360, 100, 200, false);
    const b2 = w2.bullets[0];

    expect(b2.vy).toBeCloseTo(b1.vy * 1.2, 2);
  });
});
