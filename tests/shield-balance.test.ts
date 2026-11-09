import { describe, expect, it } from "vitest";
import { addManaUnits, AEGIS_SHIELD_INVULN_TICKS, createPlayer, ULTIMATE_TOTAL_DAMAGE } from "../src/sim/player";
import { createWorld, step } from "../src/sim/world";
import { NO_INPUT } from "../src/sim/types";

describe("ULT charging and body-hit Aegis protection", () => {
  it("increases all mana sources tenfold, clamps at 100%, and halves ULT damage", () => {
    const p = createPlayer();
    addManaUnits(p, 2); // old +2 = 0.05%
    expect(p.manaUnits).toBe(20);
    expect(p.mana).toBe(0.5);
    addManaUnits(p, 15); // old +15 = 0.375%
    expect(p.mana).toBe(4.25);
    addManaUnits(p, 4000);
    expect(p.manaUnits).toBe(4000);
    expect(p.mana).toBe(100);
    expect(ULTIMATE_TOTAL_DAMAGE).toBe(35);
  });

  it("decrements one shield for a body-hit bullet, never a life, then grants 45 ticks of safety", () => {
    const w = createWorld({ seed: 20261109, startAt: 10 });
    w.player.invuln = 0;
    const initialLives = w.player.lives;
    const shot = (id: number) => w.bullets.push({
      id, x: w.player.x, y: w.player.y, vx: 0, vy: 0, r: 5,
      dmg: 1, owner: "enemy", alive: true,
    });
    shot(9001);
    shot(9002);
    const events = step(w, NO_INPUT);
    const hits = events.filter((e) => e.t === "shieldHit");
    expect(hits.length).toBe(1);
    expect(w.player.aegisOrbs.filter((orb) => orb.alive).length).toBe(1);
    expect(w.player.lives).toBe(initialLives);
    expect(w.player.invuln).toBe(AEGIS_SHIELD_INVULN_TICKS);
    expect(w.player.downTimer).toBe(0);
    expect(events.some((e) => e.t === "playerDown")).toBe(false);
    // A later hit during shield invulnerability must not consume another charge.
    const protectedEvents = step(w, NO_INPUT);
    expect(protectedEvents.some((e) => e.t === "shieldHit")).toBe(false);
    expect(w.player.aegisOrbs.filter((orb) => orb.alive).length).toBe(1);
  });

  it("takes a normal life hit after both shields are depleted", () => {
    const w = createWorld({ seed: 20261109, startAt: 10 });
    w.player.invuln = 0;
    const shoot = (id: number) => {
      w.bullets.push({
        id, x: w.player.x, y: w.player.y, vx: 0, vy: 0, r: 5,
        dmg: 1, owner: "enemy", alive: true,
      });
      return step(w, NO_INPUT);
    };
    shoot(9111);
    w.player.invuln = 0; // advance directly to the next vulnerable state
    shoot(9112);
    expect(w.player.aegisOrbs.every((o) => !o.alive)).toBe(true);
    w.player.invuln = 0;
    const events = shoot(9113);
    expect(w.player.lives).toBe(2);
    expect(events.some((e) => e.t === "playerDown")).toBe(true);
    expect(events.some((e) => e.t === "shieldHit")).toBe(false);
  });

  it("ignores orb-only near misses and keeps shields safe during Roll invulnerability", () => {
    const w = createWorld({ seed: 20261109, startAt: 10 });
    w.player.invuln = 0;
    const angle = (w.player.orbitSwords.angle + 0.08) % (2 * Math.PI);
    w.bullets.push({
      id: 9222,
      x: w.player.x + Math.cos(angle) * 72,
      y: w.player.y + Math.sin(angle) * 72,
      vx: 0, vy: 0, r: 5, dmg: 1, owner: "enemy", alive: true,
    });
    const first = step(w, NO_INPUT);
    expect(first.some((e) => e.t === "hit" && e.id === 9222)).toBe(false);
    expect(w.bullets.some((bullet) => bullet.id === 9222 && bullet.alive)).toBe(true);
    expect(w.player.aegisOrbs.filter((orb) => orb.alive).length).toBe(2);
    w.player.rollTimer = 10;
    w.bullets.push({
      id: 9223, x: w.player.x, y: w.player.y, vx: 0, vy: 0,
      r: 5, dmg: 1, owner: "enemy", alive: true,
    });
    const second = step(w, NO_INPUT);
    expect(second.some((e) => e.t === "shieldHit")).toBe(false);
    expect(w.player.aegisOrbs.filter((orb) => orb.alive).length).toBe(2);
  });
});
