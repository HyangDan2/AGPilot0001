import { describe, expect, it } from "vitest";
import { updateEnemyPath } from "../src/sim/patterns";
import { Enemy, PathKind, Player } from "../src/sim/types";

describe("Enemy Flight Patterns Continuity", () => {
  const dummyPlayer: Player = {
    x: 360,
    y: 1000,
    vx: 0,
    vy: 0,
    lives: 3,
    power: 1,
    rolls: 3,
    rollTimer: 0,
    invuln: 0,
    downTimer: 0,
    fireCooldown: 0,
    prevRoll: false,
    deaths: 0,
    slashDirection: "r2l",
    comboCount: 0,
    meleeSwing: null,
    mana: 0,
    maxMana: 100,
    ultimateTimer: 0,
    prevUlt: false,
    grazeCount: 0,
    orbitSwords: { angle: 0, active: true },
    aegisOrbs: [
      { id: 0, angleOffset: 0, alive: true, hp: 1 },
      { id: 1, angleOffset: Math.PI, alive: true, hp: 1 },
    ],
    lanePower: { center: 1.0, left: 1.0, right: 1.0, nextLane: "center" },
  };

  const allPaths: PathKind[] = [
    "straight",
    "swoopL",
    "swoopR",
    "sCurve",
    "dive",
    "hover",
    "ground",
    "loopL",
    "loopR",
  ];

  for (const path of allPaths) {
    it(`guarantees position continuity without teleportation jumps for path: ${path}`, () => {
      const enemy: Enemy = {
        id: 1,
        kind: path === "hover" ? "kestrel" : "kestrelRed",
        x: 360,
        y: -40,
        x0: 360,
        y0: -40,
        path,
        age: 0,
        hp: 10,
        maxHp: 10,
        r: 20,
        ground: false,
        fireTimer: 0,
        flash: 0,
        heading: Math.PI,
        formation: 0,
        sx: 0,
        sy: 240, // targetY for hover
        mode: 0,
        parts: [],
        alive: true,
      };

      let prevX = enemy.x;
      let prevY = enemy.y;

      // Simulate 360 ticks (6 seconds)
      const MAX_STEP_PX = 14; // 14px at 60Hz = 840 px/s (well above normal 200-450 px/s, catches any teleportation snap)

      for (let tick = 0; tick < 360; tick++) {
        enemy.age++;
        updateEnemyPath(enemy, dummyPlayer);

        if (!enemy.alive) break;

        const dx = Math.abs(enemy.x - prevX);
        const dy = Math.abs(enemy.y - prevY);
        const dist = Math.hypot(dx, dy);

        expect(
          dist,
          `Path ${path} teleported at tick ${tick}: jump dist = ${dist.toFixed(2)}px (prev: ${prevX.toFixed(1)},${prevY.toFixed(1)} -> curr: ${enemy.x.toFixed(1)},${enemy.y.toFixed(1)})`,
        ).toBeLessThanOrEqual(MAX_STEP_PX);

        prevX = enemy.x;
        prevY = enemy.y;
      }
    });
  }

  it("guarantees boss hover stays engaged continuously", () => {
    const boss: Enemy = {
      id: 99,
      kind: "leviathan",
      x: 360,
      y: -100,
      x0: 360,
      y0: -100,
      path: "hover",
      age: 0,
      hp: 100,
      maxHp: 100,
      r: 60,
      ground: false,
      fireTimer: 0,
      flash: 0,
      heading: Math.PI,
      formation: 0,
      sx: 0,
      sy: 220,
      mode: 0,
      parts: [],
      alive: true,
    };

    let prevX = boss.x;
    let prevY = boss.y;

    for (let tick = 0; tick < 600; tick++) {
      boss.age++;
      updateEnemyPath(boss, dummyPlayer);
      expect(boss.alive).toBe(true);

      const dist = Math.hypot(boss.x - prevX, boss.y - prevY);
      expect(dist).toBeLessThanOrEqual(14);

      prevX = boss.x;
      prevY = boss.y;
    }
  });
});
