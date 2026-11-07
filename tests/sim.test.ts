import { describe, expect, it } from "vitest";
import { FIELD_H, FIELD_W, InputFrame, NO_INPUT } from "../src/sim/types";
import { createWorld, step } from "../src/sim/world";
import { spawnEnemy } from "../src/sim/enemies";

describe("Simulation Core", () => {
  it("initializes player and world correctly", () => {
    const world = createWorld({ seed: 42 });
    expect(world.phase).toBe("intro");
    expect(world.player.lives).toBe(3);
    expect(world.player.power).toBe(1);
    expect(world.player.rolls).toBe(3);
  });

  it("advances intro takeoff and enters active play", () => {
    const world = createWorld({ seed: 42 });
    for (let i = 0; i < 130; i++) {
      step(world, NO_INPUT);
    }
    expect(world.phase).toBe("play");
  });

  it("clamps player inside logical playfield", () => {
    const world = createWorld({ seed: 42, startAt: 1 });
    // Move hard left and up
    const leftUp: InputFrame = { moveX: -1, moveY: -1, dragDx: 0, dragDy: 0, fire: false, roll: false, ult: false };
    for (let i = 0; i < 300; i++) {
      step(world, leftUp);
    }
    expect(world.player.x).toBeGreaterThanOrEqual(28);
    expect(world.player.y).toBeGreaterThanOrEqual(28);

    // Move hard right and down
    const rightDown: InputFrame = { moveX: 1, moveY: 1, dragDx: 0, dragDy: 0, fire: false, roll: false, ult: false };
    for (let i = 0; i < 500; i++) {
      step(world, rightDown);
    }
    expect(world.player.x).toBeLessThanOrEqual(FIELD_W - 28);
    expect(world.player.y).toBeLessThanOrEqual(FIELD_H - 28);
  });

  it("fires bullets according to power level and cooldown", () => {
    const world = createWorld({ seed: 42, startAt: 1 });
    world.player.invuln = 0;

    // Power 1: single bullet
    const fireInput: InputFrame = { moveX: 0, moveY: 0, dragDx: 0, dragDy: 0, fire: true, roll: false, ult: false };
    step(world, fireInput);
    expect(world.bullets.length).toBe(1);
    expect(world.player.fireCooldown).toBeGreaterThan(0);

    // Immediate next tick should not fire due to cooldown
    step(world, fireInput);
    expect(world.bullets.length).toBe(1);

    // Upgrade to Power 2 (dual)
    world.player.power = 2;
    world.player.fireCooldown = 0;
    world.bullets = [];
    step(world, fireInput);
    expect(world.bullets.length).toBe(2);

    // Upgrade to Power 3 (3-way)
    world.player.power = 3;
    world.player.fireCooldown = 0;
    world.bullets = [];
    step(world, fireInput);
    expect(world.bullets.length).toBe(3);
  });

  it("executes evasive roll with invulnerability and uses 1 roll", () => {
    const world = createWorld({ seed: 42, startAt: 1 });
    expect(world.player.rolls).toBe(3);

    const rollInput: InputFrame = { moveX: 0, moveY: 0, dragDx: 0, dragDy: 0, fire: false, roll: true, ult: false };
    const events = step(world, rollInput);

    expect(events.some((e) => e.t === "roll")).toBe(true);
    expect(world.player.rolls).toBe(2);
    expect(world.player.rollTimer).toBeGreaterThan(0);

    // Roll prevents weapon firing
    const rollAndFire: InputFrame = { moveX: 0, moveY: 0, dragDx: 0, dragDy: 0, fire: true, roll: false, ult: false };
    step(world, rollAndFire);
    expect(world.bullets.length).toBe(0);
  });

  it("awards POW item when wiping an entire red formation", () => {
    const world = createWorld({ seed: 42, startAt: 1 });
    const formationId = 999;
    world.formations.set(formationId, {
      total: 3,
      killed: 0,
      escaped: 0,
      reward: "pow",
      lastX: 360,
      lastY: 400,
    });

    // Spawn 3 red kestrels
    const e1 = spawnEnemy(world, "kestrelRed", 300, 200, "straight", formationId);
    const e2 = spawnEnemy(world, "kestrelRed", 360, 200, "straight", formationId);
    const e3 = spawnEnemy(world, "kestrelRed", 420, 200, "straight", formationId);

    // Kill 1st enemy
    world.bullets.push({
      id: 1,
      x: e1.x,
      y: e1.y,
      vx: 0,
      vy: -100,
      r: 10,
      dmg: 1,
      owner: "player",
      alive: true,
    });
    step(world, NO_INPUT);
    expect(world.pickups.length).toBe(0);

    // Kill 2nd enemy
    world.bullets.push({
      id: 2,
      x: e2.x,
      y: e2.y,
      vx: 0,
      vy: -100,
      r: 10,
      dmg: 1,
      owner: "player",
      alive: true,
    });
    step(world, NO_INPUT);
    expect(world.pickups.length).toBe(0);

    // Kill 3rd (final) enemy -> drops POW!
    world.bullets.push({
      id: 3,
      x: e3.x,
      y: e3.y,
      vx: 0,
      vy: -100,
      r: 10,
      dmg: 1,
      owner: "player",
      alive: true,
    });
    step(world, NO_INPUT);
    expect(world.pickups.length).toBe(1);
    expect(world.pickups[0].kind).toBe("pow");

    // Player collects the pickup
    world.player.x = world.pickups[0].x;
    world.player.y = world.pickups[0].y;
    step(world, NO_INPUT);
    expect(world.player.power).toBe(2);
  });

  it("is 100% deterministic given identical seed and input sequence", () => {
    const runSim = () => {
      const w = createWorld({ seed: 777123, startAt: 0 });
      let eventLog = "";
      for (let i = 0; i < 200; i++) {
        const input: InputFrame = {
          moveX: Math.sin(i * 0.1),
          moveY: Math.cos(i * 0.05),
          dragDx: 0,
          dragDy: 0,
          fire: i % 10 === 0,
          roll: i === 60,
          ult: i === 120,
        };
        const events = step(w, input);
        for (const e of events) {
          eventLog += `${e.t},`;
        }
      }
      return {
        score: w.score,
        px: w.player.x,
        py: w.player.y,
        eventLog,
      };
    };

    const res1 = runSim();
    const res2 = runSim();
    expect(res1).toEqual(res2);
  });
});
