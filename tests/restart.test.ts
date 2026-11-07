import { describe, expect, it } from "vitest";
import { createWorld, step } from "../src/sim/world";
import { NO_INPUT } from "../src/sim/types";

describe("Game Lifecycle and Determinism", () => {
  it("maintains determinism across multiple instances without Math.random leakage", () => {
    const seed = 987654321;
    const w1 = createWorld({ seed, startAt: 0 });
    const w2 = createWorld({ seed, startAt: 0 });

    for (let i = 0; i < 300; i++) {
      const e1 = step(w1, NO_INPUT);
      const e2 = step(w2, NO_INPUT);

      expect(e1.length).toBe(e2.length);
      expect(w1.score).toBe(w2.score);
      expect(w1.rngState).toBe(w2.rngState);
      expect(w1.player.x).toBe(w2.player.x);
      expect(w1.player.y).toBe(w2.player.y);
      expect(w1.enemies.length).toBe(w2.enemies.length);
    }
  });

  it("resets world properly when starting a new game session", () => {
    const w1 = createWorld({ seed: 100 });
    // Advance into combat
    for (let i = 0; i < 200; i++) {
      step(w1, { moveX: 0, moveY: 0, dragDx: 0, dragDy: 0, fire: true, roll: false, ult: false });
    }
    expect(w1.tick).toBe(200);

    // New session
    const w2 = createWorld({ seed: 200 });
    expect(w2.tick).toBe(0);
    expect(w2.phase).toBe("intro");
    expect(w2.score).toBe(0);
    expect(w2.player.lives).toBe(3);
  });
});
