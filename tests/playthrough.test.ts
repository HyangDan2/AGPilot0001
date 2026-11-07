import { describe, expect, it } from "vitest";
import { GameEvent, InputFrame } from "../src/sim/types";
import { createWorld, step } from "../src/sim/world";

describe("Stage 1 Headless Playthrough Gate", () => {
  it("plays through stage 1 and clears Celestial Guardian boss", () => {
    // Start at sec 55 right before final boss Celestial Guardian
    const world = createWorld({ seed: 20261103, startAt: 55, invulnerable: true });
    expect(world.phase).toBe("play");

    const events: GameEvent[] = [];
    let cleared = false;
    let sawBoss = false;

    // Simulate up to 200 seconds of combat at 60 Hz
    const maxTicks = 200 * 60;
    for (let tick = 0; tick < maxTicks; tick++) {
      // AI Autopilot: aim at nearest enemy, fire continuously
      let targetX = world.player.x;
      let minDist = Infinity;

      for (const enemy of world.enemies) {
        if (!enemy.alive) continue;
        if (enemy.kind === "celestialGuardian" || enemy.kind === "leviathan") sawBoss = true;
        const d = Math.hypot(enemy.x - world.player.x, enemy.y - world.player.y);
        if (d < minDist) {
          minDist = d;
          targetX = enemy.x;
        }
      }

      // Smooth tracking towards target
      let moveX = 0;
      if (Math.abs(targetX - world.player.x) > 10) {
        moveX = targetX > world.player.x ? 1 : -1;
      }

      const input: InputFrame = {
        moveX,
        moveY: 0,
        dragDx: 0,
        dragDy: 0,
        fire: true, // Auto-fire continuously
        roll: tick % 300 === 0, // Occasional evasive roll
        ult: false,
      };

      const tickEvents = step(world, input);
      for (const e of tickEvents) {
        events.push(e);
        if (e.t === "stageClear") {
          cleared = true;
          break;
        }
      }

      if (cleared) break;
    }

    expect(sawBoss).toBe(true);
    expect(cleared).toBe(true);
    expect(world.phase).toBe("clear");
    expect(world.score).toBeGreaterThan(30000);
  });

  it("survives early combat (0-25s) with normal player lives without test invulnerability", () => {
    const world = createWorld({ seed: 20261103, startAt: 0, invulnerable: false });
    expect(world.phase).toBe("intro");

    for (let tick = 0; tick < 25 * 60; tick++) {
      let targetX = world.player.x;
      let minDist = Infinity;
      for (const enemy of world.enemies) {
        if (!enemy.alive) continue;
        const d = Math.hypot(enemy.x - world.player.x, enemy.y - world.player.y);
        if (d < minDist) {
          minDist = d;
          targetX = enemy.x;
        }
      }

      let moveX = 0;
      if (Math.abs(targetX - world.player.x) > 10) {
        moveX = targetX > world.player.x ? 1 : -1;
      }

      const input: InputFrame = {
        moveX,
        moveY: 0,
        dragDx: 0,
        dragDy: 0,
        fire: true,
        roll: false,
        ult: false,
      };

      step(world, input);
    }

    // Player survived without losing all lives and scored
    expect(world.player.lives).toBeGreaterThanOrEqual(1);
    expect(world.score).toBeGreaterThan(1000);
    expect(world.stats.killed).toBeGreaterThan(5);
  });
});
