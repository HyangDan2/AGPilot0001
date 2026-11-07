import { damageEnemy } from "./enemies";
import { addManaUnits } from "./player";
import { Bullet, Enemy, GameEvent, Pickup, Player, World } from "./types";

export function circlesIntersect(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const r = r1 + r2;
  return dx * dx + dy * dy <= r * r;
}

export function hitPlayer(player: Player, bullet: Bullet): boolean {
  if (
    player.downTimer > 0 ||
    player.rollTimer > 0 ||
    player.invuln > 0 ||
    !bullet.alive ||
    bullet.owner !== "enemy"
  ) {
    return false;
  }
  return circlesIntersect(player.x, player.y, 10, bullet.x, bullet.y, bullet.r);
}

export function hitEnemy(enemy: Enemy, bullet: Bullet): boolean {
  if (!enemy.alive || !bullet.alive || bullet.owner !== "player") {
    return false;
  }

  // Multi-part boss hits
  if (enemy.parts.length > 0) {
    for (const part of enemy.parts) {
      if (
        part.alive &&
        circlesIntersect(
          enemy.x + part.dx,
          enemy.y + part.dy,
          part.r,
          bullet.x,
          bullet.y,
          bullet.r,
        )
      ) {
        return true;
      }
    }
  }

  return circlesIntersect(enemy.x, enemy.y, enemy.r, bullet.x, bullet.y, bullet.r);
}

export function checkMeleeHits(world: World, events: GameEvent[]): void {
  const p = world.player;
  if (!p.meleeSwing || p.downTimer > 0 || p.rollTimer > 0) {
    return;
  }

  const swing = p.meleeSwing;
  const MELEE_REACH = 130;
  const MELEE_ARC_COS = 0.342; // cos(70 deg) -> 140 deg frontal arc
  const meleeDamage = p.power >= 2 ? 3 : 2;

  for (const enemy of world.enemies) {
    if (!enemy.alive || swing.hitEnemyIds.includes(enemy.id)) {
      continue;
    }

    const dx = enemy.x - p.x;
    const dy = enemy.y - p.y;
    const dist = Math.hypot(dx, dy);

    // Frontal arc check (dy < 0 in screen space is ahead of player)
    const isCloseEnough = dist <= MELEE_REACH + enemy.r;
    const isFrontal = dist > 0 ? (-dy / dist) >= MELEE_ARC_COS : true;
    const isPointBlank = dist <= 36 + enemy.r;

    if (isCloseEnough && (isFrontal || isPointBlank)) {
      swing.hitEnemyIds.push(enemy.id);
      world.hitstopTimer = 2; // Tactile 2-tick hitstop

      events.push({
        t: "meleeHit",
        id: enemy.id,
        x: (p.x + enemy.x) / 2,
        y: (p.y + enemy.y) / 2,
        dmg: meleeDamage,
      });

      addManaUnits(p, 15);
      damageEnemy(world, enemy, meleeDamage, events, (p.x + enemy.x) / 2, (p.y + enemy.y) / 2);
    }
  }
}

export function checkGraze(world: World, events: GameEvent[]): void {
  const p = world.player;
  if (p.downTimer > 0 || p.rollTimer > 0) return;

  const GRAZE_INNER = 12; // hurtbox
  const GRAZE_OUTER = 36; // graze field

  for (const b of world.bullets) {
    if (!b.alive || b.owner !== "enemy" || b.grazed) continue;

    const dist = Math.hypot(b.x - p.x, b.y - p.y);
    if (dist > GRAZE_INNER && dist <= GRAZE_OUTER + b.r) {
      b.grazed = true;
      p.grazeCount++;
      addManaUnits(p, 10);
      world.score += 250;
      world.stats.grazes++;
      events.push({
        t: "graze",
        x: (p.x + b.x) / 2,
        y: (p.y + b.y) / 2,
        bulletId: b.id,
      });
    }
  }
}

export function checkOrbitSwordHits(world: World, events: GameEvent[]): void {
  const p = world.player;
  if (p.downTimer > 0 || !p.orbitSwords?.active) return;

  const swordRadius = 72;

  // 1. Destroy/parry enemy bullets using individual destructible Aegis Orbs
  for (const b of world.bullets) {
    if (!b.alive || b.owner !== "enemy") continue;

    for (const orb of p.aegisOrbs) {
      if (!orb.alive) continue;
      const ox = p.x + Math.cos(p.orbitSwords.angle + orb.angleOffset) * swordRadius;
      const oy = p.y + Math.sin(p.orbitSwords.angle + orb.angleOffset) * swordRadius;

      if (Math.hypot(b.x - ox, b.y - oy) <= 18 + b.r) {
        b.alive = false;
        orb.alive = false; // Destructible: this specific orb is broken!
        addManaUnits(p, 15);
        world.score += 250;
        events.push({ t: "orbDestroyed", id: orb.id, x: ox, y: oy });
        events.push({ t: "explode", size: "s", x: ox, y: oy });
        events.push({ t: "hit", id: b.id, x: b.x, y: b.y });
        break; // Only 1 orb destroyed per bullet!
      }
    }
  }

  // 2. Damage enemies contacting alive Aegis Orbs
  for (const orb of p.aegisOrbs) {
    if (!orb.alive) continue;
    const ox = p.x + Math.cos(p.orbitSwords.angle + orb.angleOffset) * swordRadius;
    const oy = p.y + Math.sin(p.orbitSwords.angle + orb.angleOffset) * swordRadius;

    for (const enemy of world.enemies) {
      if (enemy.alive && Math.hypot(enemy.x - ox, enemy.y - oy) <= 22 + enemy.r) {
        if (world.tick % 8 === 0) {
          addManaUnits(p, 1);
          damageEnemy(world, enemy, 1, events, ox, oy);
        }
      }
    }
  }
}

export function playerCollectsPickup(player: Player, pickup: Pickup): boolean {
  if (player.downTimer > 0 || !pickup.alive) {
    return false;
  }
  return circlesIntersect(player.x, player.y, 36, pickup.x, pickup.y, 22);
}
