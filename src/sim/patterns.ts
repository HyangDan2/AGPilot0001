import { DT, Enemy, FIELD_H, FIELD_W, Player, World } from "./types";

export function updateEnemyPath(enemy: Enemy, player: Player): void {
  const t = enemy.age * DT; // seconds alive

  switch (enemy.path) {
    case "straight": {
      const speed = enemy.sy || 200;
      enemy.y = enemy.y0 + speed * t;
      enemy.heading = Math.PI; // nose facing downwards
      break;
    }

    case "swoopL": {
      // From top-left swooping into field, curving down-right
      const forwardSpeed = 190;
      enemy.y = enemy.y0 + forwardSpeed * t;
      enemy.x = enemy.x0 + Math.sin(t * 2.2) * 160 + t * 40;
      enemy.heading = Math.PI + Math.cos(t * 2.2) * 0.4;
      break;
    }

    case "swoopR": {
      // From top-right swooping into field, curving down-left
      const forwardSpeed = 190;
      enemy.y = enemy.y0 + forwardSpeed * t;
      enemy.x = enemy.x0 - Math.sin(t * 2.2) * 160 - t * 40;
      enemy.heading = Math.PI - Math.cos(t * 2.2) * 0.4;
      break;
    }

    case "sCurve": {
      const speed = 175;
      enemy.y = enemy.y0 + speed * t;
      enemy.x = enemy.x0 + Math.sin(t * 3.0) * 140;
      enemy.heading = Math.PI + Math.cos(t * 3.0) * 0.5;
      break;
    }

    case "dive": {
      // Phase 0: drift down, lock target. Phase 1: fast dive.
      if (enemy.mode === 0) {
        enemy.y = enemy.y0 + 130 * t;
        if (enemy.age > 45) {
          enemy.mode = 1;
          enemy.sx = (player.x - enemy.x) * 1.8;
        }
        enemy.heading = Math.PI;
      } else {
        enemy.x += enemy.sx * DT;
        enemy.y += 420 * DT;
        enemy.heading = Math.PI + Math.atan2(enemy.sx, 420);
      }
      break;
    }

    case "hover": {
      // Enter to y=240, hover and drift horizontally
      const targetY = enemy.sy || 240;
      if (enemy.y < targetY) {
        enemy.y += 180 * DT;
      } else if (enemy.kind === "leviathan" || enemy.kind === "albatross") {
        // Bosses stay engaged on screen until defeated
        enemy.x = enemy.x0 + Math.sin((t - 1.5) * 1.1) * 120;
      } else if (t < 9) {
        enemy.x = enemy.x0 + Math.sin((t - 1.5) * 1.4) * 180;
      } else {
        enemy.y -= 160 * DT; // regular planes retreat upwards
      }
      enemy.heading = Math.PI;
      break;
    }

    case "ground": {
      // Sea/ground unit scrolls with ocean (~60px/s)
      enemy.y += 65 * DT;
      enemy.heading = Math.PI;
      break;
    }

    case "loopL":
    case "loopR": {
      const dir = enemy.path === "loopL" ? -1 : 1;
      if (t < 1.5) {
        enemy.y += 200 * DT;
        enemy.heading = Math.PI;
      } else if (t < 3.2) {
        const loopAngle = (t - 1.5) * (Math.PI * 2 / 1.7);
        enemy.x += Math.sin(loopAngle) * dir * 180 * DT;
        enemy.y -= Math.cos(loopAngle) * 180 * DT;
        enemy.heading = Math.PI + loopAngle * dir;
      } else {
        enemy.y += 240 * DT;
        enemy.heading = Math.PI;
      }
      break;
    }
  }

  // Check if escaped out of field boundaries
  if (
    enemy.y > FIELD_H + 120 ||
    enemy.y < -300 ||
    enemy.x < -160 ||
    enemy.x > FIELD_W + 160
  ) {
    enemy.alive = false;
  }
}

export function fireEnemyBullet(
  world: World,
  x: number,
  y: number,
  speed: number,
  aimAtPlayer: boolean,
  angleOffset = 0,
): void {
  const p = world.player;
  let vx = 0;
  let vy = speed;

  if (aimAtPlayer && p.downTimer === 0) {
    const angle = Math.atan2(p.y - y, p.x - x) + angleOffset;
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;
  } else if (angleOffset !== 0) {
    const angle = Math.PI / 2 + angleOffset;
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;
  }

  world.bullets.push({
    id: world.nextId++,
    x,
    y,
    vx,
    vy,
    r: 6,
    dmg: 1,
    owner: "enemy",
    alive: true,
  });
}
