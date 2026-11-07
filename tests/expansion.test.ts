import { describe, expect, it } from "vitest";
import { createWorld, step } from "../src/sim/world";
import { NO_INPUT } from "../src/sim/types";

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
      path: "hover",
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

    // All enemy bullets must be destroyed
    expect(world.bullets.filter((b) => b.owner === "enemy" && b.alive).length).toBe(0);

    // Enemy in beam corridor received 30 damage
    const enemy = world.enemies.find((e) => e.id === 201);
    expect(enemy?.hp).toBe(20); // 50 - 30
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
});
