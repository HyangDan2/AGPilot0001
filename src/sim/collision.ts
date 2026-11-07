import { ENEMY_DEFS } from "./enemies";
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
      enemy.hp -= meleeDamage;
      enemy.flash = 8;
      world.hitstopTimer = 2; // Tactile 2-tick hitstop

      events.push({
        t: "meleeHit",
        id: enemy.id,
        x: (p.x + enemy.x) / 2,
        y: (p.y + enemy.y) / 2,
        dmg: meleeDamage,
      });
      events.push({
        t: "hit",
        id: enemy.id,
        x: enemy.x,
        y: enemy.y,
      });

      if (enemy.hp <= 0) {
        enemy.alive = false;
        world.stats.killed++;
        world.score += ENEMY_DEFS[enemy.kind]?.score ?? 100;
        events.push({
          t: "explode",
          size: enemy.kind === "leviathan" ? "l" : enemy.kind === "albatross" || enemy.kind === "condor" ? "m" : "s",
          x: enemy.x,
          y: enemy.y,
        });

        if (enemy.formation > 0) {
          const f = world.formations.get(enemy.formation);
          if (f) {
            f.killed++;
            f.lastX = enemy.x;
            f.lastY = enemy.y;
            if (f.killed === f.total && f.reward) {
              world.pickups.push({
                id: world.nextId++,
                kind: f.reward,
                x: f.lastX,
                y: f.lastY,
                age: 0,
                alive: true,
              });
              events.push({ t: "pickup", kind: f.reward, x: f.lastX, y: f.lastY });
            }
          }
        }
      }
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
      p.mana = Math.min(p.maxMana, p.mana + 10);
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
  if (p.downTimer > 0 || !p.orbitSwords.active) return;

  const swordRadius = 72;
  const angles = [p.orbitSwords.angle, p.orbitSwords.angle + Math.PI];

  for (const ang of angles) {
    const sx = p.x + Math.cos(ang) * swordRadius;
    const sy = p.y + Math.sin(ang) * swordRadius;

    // Destroy/parry enemy bullets near sword
    for (const b of world.bullets) {
      if (b.alive && b.owner === "enemy") {
        if (Math.hypot(b.x - sx, b.y - sy) <= 22 + b.r) {
          b.alive = false;
          world.score += 50;
          events.push({ t: "hit", id: b.id, x: b.x, y: b.y });
        }
      }
    }

    // Damage enemies contacting the orbiting swords
    for (const enemy of world.enemies) {
      if (enemy.alive && Math.hypot(enemy.x - sx, enemy.y - sy) <= 24 + enemy.r) {
        if (world.tick % 8 === 0) {
          enemy.hp -= 1;
          enemy.flash = 4;
          p.mana = Math.min(p.maxMana, p.mana + 1);
          events.push({ t: "hit", id: enemy.id, x: sx, y: sy });
          if (enemy.hp <= 0) {
            enemy.alive = false;
            world.stats.killed++;
            events.push({ t: "explode", size: "s", x: enemy.x, y: enemy.y });
          }
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
