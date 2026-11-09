import { describe, expect, it } from "vitest";
import { enemyBodyTouchesPlayer, hitPlayer, playerBodyIntersectsCircle, checkMeleeHits } from "../src/sim/collision";
import { checkEnemyBodyCollisions, createWorld, step } from "../src/sim/world";
import { spawnEnemy } from "../src/sim/enemies";
import { NO_INPUT } from "../src/sim/types";

describe("Eira torso hurtbox and one-hit enemy body contact", () => {
  it("uses a 19 x 25 oval centered on the torso, excluding wings/hair/skirt", () => {
    const w = createWorld({ seed: 41, startAt: 1 });
    const p = w.player;
    p.invuln = 0;
    expect(playerBodyIntersectsCircle(p, p.x + 18, p.y - 6, 0)).toBe(true);
    expect(playerBodyIntersectsCircle(p, p.x, p.y - 6 + 24, 0)).toBe(true);
    expect(playerBodyIntersectsCircle(p, p.x + 38, p.y - 6, 0)).toBe(false);
    expect(playerBodyIntersectsCircle(p, p.x, p.y + 45, 0)).toBe(false);
    const bullet = { id: 891, x: p.x + 21, y: p.y - 6, vx: 0, vy: 0,
      r: 4, dmg: 1, owner: "enemy" as const, alive: true };
    expect(hitPlayer(p, bullet)).toBe(true);
    bullet.x = p.x + 40;
    expect(hitPlayer(p, bullet)).toBe(false);
  });

  it("consumes one shield on ordinary enemy contact, once until separation", () => {
    const w = createWorld({ seed: 42, startAt: 1 });
    const p = w.player;
    p.invuln = 0;
    const e = spawnEnemy(w, "kestrel", p.x, p.y, "hover");
    const events = [];
    checkEnemyBodyCollisions(w, events);
    expect(events.filter((ev) => ev.t === "shieldHit")).toHaveLength(1);
    expect(p.aegisOrbs.filter((orb) => orb.alive)).toHaveLength(1);
    expect(p.lives).toBe(3);
    expect(p.invuln).toBe(45);
    p.invuln = 0; // emulate time passing while the bodies remain overlapped
    checkEnemyBodyCollisions(w, events);
    expect(p.aegisOrbs.filter((orb) => orb.alive)).toHaveLength(1);
    e.x = p.x + 200;
    checkEnemyBodyCollisions(w, events); // separation rearms the same enemy
    e.x = p.x;
    checkEnemyBodyCollisions(w, events);
    expect(p.aegisOrbs.filter((orb) => orb.alive)).toHaveLength(0);
    expect(events.filter((ev) => ev.t === "shieldHit")).toHaveLength(2);
    expect(p.lives).toBe(3);
  });

  it("boss body bypasses both Aegis shields and costs exactly one life", () => {
    const w = createWorld({ seed: 43, startAt: 1 });
    const p = w.player;
    p.invuln = 0;
    const boss = spawnEnemy(w, "albatross", p.x, p.y, "hover");
    expect(enemyBodyTouchesPlayer(p, boss)).toBe(true);
    const events = [];
    checkEnemyBodyCollisions(w, events);
    expect(p.lives).toBe(2);
    expect(p.deaths).toBe(1);
    expect(p.downTimer).toBeGreaterThan(0);
    expect(events.filter((ev) => ev.t === "playerDown")).toHaveLength(1);
    expect(events.some((ev) => ev.t === "shieldHit")).toBe(false);
    checkEnemyBodyCollisions(w, events);
    expect(p.lives).toBe(2);
  });

  it("roll or ULT invulnerability suppresses enemy collision damage", () => {
    const w = createWorld({ seed: 44, startAt: 1 });
    const p = w.player;
    p.invuln = 0;
    const boss = spawnEnemy(w, "kraken", p.x, p.y, "hover");
    p.rollTimer = 10;
    checkEnemyBodyCollisions(w, []);
    expect(p.lives).toBe(3);
    boss.x = p.x + 300;
    checkEnemyBodyCollisions(w, []);
    boss.x = p.x;
    p.rollTimer = 0;
    p.invuln = 90;
    checkEnemyBodyCollisions(w, []);
    expect(p.lives).toBe(3);
  });

  it("does not consume a shield for projectiles touching only Aegis orbs", () => {
    const w = createWorld({ seed: 45, startAt: 1 });
    const p = w.player;
    p.invuln = 0;
    w.bullets.push({
      id: 891, x: p.x + 72, y: p.y, vx: 0, vy: 0,
      r: 5, dmg: 1, owner: "enemy", alive: true,
    });
    step(w, NO_INPUT);
    expect(w.bullets.some((b) => b.id === 891 && b.alive)).toBe(true);
    expect(p.aegisOrbs.every((orb) => orb.alive)).toBe(true);
  });

  it("extends sword reach from 90 to 108px and accepts the wider 120-degree arc", () => {
    const w = createWorld({ seed: 46, startAt: 1 });
    const p = w.player;
    p.x = 360;
    p.y = 900;
    const target = spawnEnemy(w, "kestrel", 360, 784, "straight"); // 116px, within 108+24
    const outside = spawnEnemy(w, "kestrelRed", 360, 756, "straight"); // 144px, beyond 108+24
    const wide = spawnEnemy(w, "harrier", 462, 825, "straight"); // ~126px, 54 deg, within 120
    p.meleeSwing = { id: 777, direction: "l2r", tick: 0, duration: 8, hitEnemyIds: [] };
    checkMeleeHits(w, []);
    expect(target.hp).toBeLessThan(1);
    expect(outside.hp).toBe(1);
    expect(wide.hp).toBeLessThan(3);
  });
});
