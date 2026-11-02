import { Bullet, Enemy, Pickup, Player } from "./types";

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

export function playerCollectsPickup(player: Player, pickup: Pickup): boolean {
  if (player.downTimer > 0 || !pickup.alive) {
    return false;
  }
  return circlesIntersect(player.x, player.y, 36, pickup.x, pickup.y, 22);
}
