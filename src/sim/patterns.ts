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
      const targetY = enemy.sy || 240;
      if (enemy.mode === 0) {
        // ENTER: descend towards target Y
        enemy.y += 180 * DT;
        enemy.heading = Math.PI;
        if (enemy.y >= targetY) {
          enemy.y = targetY;
          enemy.mode = 1;
          enemy.sx = 0; // hold timer
        }
      } else if (enemy.mode === 1) {
        // HOLD / SWEEP: horizontal drifting
        enemy.sx += DT;
        const holdTime = enemy.sx;
        const isBoss =
          enemy.kind === "celestialGuardian" ||
          enemy.kind === "leviathan" ||
          enemy.kind === "albatross" ||
          enemy.kind === "kraken" ||
          enemy.kind === "hollowStag" ||
          enemy.kind === "fateWeaver";
        if (isBoss) {
          // Bosses stay engaged on screen until defeated
          enemy.x = enemy.x0 + Math.sin(holdTime * 1.1) * 120;
          enemy.heading = Math.PI - Math.cos(holdTime * 1.1) * 0.15;
        } else {
          // Regular enemies hold and sweep for 6.5s then exit
          enemy.x = enemy.x0 + Math.sin(holdTime * 1.4) * 180;
          enemy.heading = Math.PI - Math.cos(holdTime * 1.4) * 0.2;
          if (holdTime >= 6.5) {
            enemy.mode = 2; // EXIT
          }
        }
      } else {
        // EXIT: retreat upwards smoothly
        enemy.y -= 160 * DT;
        enemy.heading = 0;
      }
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
      const loopDuration = 1.6;
      const omega = (Math.PI * 2) / loopDuration;
      const radius = 80;

      if (enemy.mode === 0) {
        // ENTER: descend
        enemy.y += 200 * DT;
        enemy.heading = Math.PI;
        if (t >= 1.2) {
          enemy.mode = 1;
          enemy.sx = 0; // loop timer
          enemy.x0 = enemy.x;
          enemy.y0 = enemy.y;
        }
      } else if (enemy.mode === 1) {
        // SWEEP: execute full 360 circle
        enemy.sx += DT;
        const tau = enemy.sx;
        const angle = omega * tau;

        enemy.x = enemy.x0 + dir * radius * (1 - Math.cos(angle));
        enemy.y = enemy.y0 + radius * Math.sin(angle);
        enemy.heading = Math.PI + dir * angle;

        if (tau >= loopDuration) {
          enemy.mode = 2; // EXIT
          enemy.x = enemy.x0;
          enemy.y = enemy.y0;
          enemy.heading = Math.PI;
        }
      } else {
        // EXIT: continue downward descent
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
  const stageSpeedMultiplier = world.currentStage === 3 ? 1.44 : world.currentStage === 2 ? 1.2 : 1.0;
  const actualSpeed = speed * stageSpeedMultiplier;
  let vx = 0;
  let vy = actualSpeed;

  if (aimAtPlayer && p.downTimer === 0) {
    const angle = Math.atan2(p.y - y, p.x - x) + angleOffset;
    vx = Math.cos(angle) * actualSpeed;
    vy = Math.sin(angle) * actualSpeed;
  } else if (angleOffset !== 0) {
    const angle = Math.PI / 2 + angleOffset;
    vx = Math.cos(angle) * actualSpeed;
    vy = Math.sin(angle) * actualSpeed;
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
