import { damageEnemy } from "./enemies";
import {
  addManaUnits,
  PLAYER_BODY_HITBOX_RX,
  PLAYER_BODY_HITBOX_RY,
  PLAYER_BODY_HITBOX_OFFSET_Y,
} from "./player";
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

/**
 * An ellipse centered over Eira's armored torso, enlarged by projectile radius.
 * Weapon, braid, wings and skirt are deliberately excluded from the hurtbox.
 */
export function playerBodyIntersectsCircle(
  player: Player,
  x: number,
  y: number,
  radius: number,
): boolean {
  const dx = (x - player.x) / (PLAYER_BODY_HITBOX_RX + radius);
  const dy = (y - (player.y + PLAYER_BODY_HITBOX_OFFSET_Y)) /
    (PLAYER_BODY_HITBOX_RY + radius);
  return dx * dx + dy * dy <= 1;
}

/** Enemy body/major living parts, not their visual trails or oversized sprite boxes. */
export function enemyBodyTouchesPlayer(player: Player, enemy: Enemy): boolean {
  if (!enemy.alive) return false;
  const mainRadius = enemy.parts.length > 0 ? Math.min(enemy.r, 48) : enemy.r;
  if (playerBodyIntersectsCircle(player, enemy.x, enemy.y, mainRadius)) return true;
  return enemy.parts.some((part) =>
    part.alive &&
    playerBodyIntersectsCircle(
      player,
      enemy.x + part.dx,
      enemy.y + part.dy,
      Math.min(part.r, 28),
    ),
  );
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
  return playerBodyIntersectsCircle(player, bullet.x, bullet.y, bullet.r);
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
  const MELEE_REACH = 108; // +20% from 90px
  const MELEE_ARC_COS = Math.cos((60 * Math.PI) / 180); // 120 deg frontal arc
  const meleeDamage = p.power >= 2 ? 3 : 2;

  for (const enemy of world.enemies) {
    if (!enemy.alive || swing.hitEnemyIds.includes(enemy.id)) {
      continue;
    }

    // Clamp the enemy radius to avoid long-range hits on enormous boss hitboxes.
    // Living boss parts are checked independently to keep blade/body contact precise.
    const targets = [
      { x: enemy.x, y: enemy.y, r: Math.min(enemy.r, enemy.parts.length ? 42 : 28) },
      ...enemy.parts.filter((part) => part.alive).map((part) => ({
        x: enemy.x + part.dx,
        y: enemy.y + part.dy,
        r: Math.min(part.r, 28),
      })),
    ];
    const inBladeRange = targets.some(({ x, y, r }) => {
      const dx = x - p.x;
      const dy = y - p.y;
      const dist = Math.hypot(dx, dy);
      const frontal = dist === 0 || -dy / dist >= MELEE_ARC_COS;
      return dist <= MELEE_REACH + r && (frontal || dist <= 22 + r);
    });

    if (inBladeRange) {
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

  const GRAZE_OUTER = 36; // graze field, excluding the enlarged body hurtbox

  for (const b of world.bullets) {
    if (!b.alive || b.owner !== "enemy" || b.grazed) continue;

    const dist = Math.hypot(b.x - p.x, b.y - (p.y + PLAYER_BODY_HITBOX_OFFSET_Y));
    if (!playerBodyIntersectsCircle(p, b.x, b.y, b.r) &&
        dist <= GRAZE_OUTER + b.r) {
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

  // Aegis orbs no longer collide with or intercept enemy bullets.
  // Only a true hit on Eira's armored torso consumes one shield charge.
  // The surviving orbs keep their offensive collision with enemies.
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
