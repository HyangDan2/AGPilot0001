import {
  DT,
  FIELD_H,
  FIELD_W,
  GameEvent,
  InputFrame,
  Player,
  SlashDirection,
  World,
} from "./types";

export const PLAYER_SPEED = 420; // logical px / s
export const PLAYER_HIT_RADIUS = 10;
export const ROLL_DURATION_TICKS = 72; // ~1.2s at 60Hz
export const RESPAWN_INVULN_TICKS = 180; // 3s
export const DOWN_DURATION_TICKS = 60; // 1s before respawn

export function createPlayer(): Player {
  return {
    x: FIELD_W / 2,
    y: FIELD_H - 160,
    vx: 0,
    vy: 0,
    lives: 3,
    power: 1,
    rolls: 3,
    rollTimer: 0,
    invuln: 120, // initial launch invulnerability
    downTimer: 0,
    fireCooldown: 0,
    prevRoll: false,
    deaths: 0,
    slashDirection: "r2l", // alternates to "l2r" on first swing
    comboCount: 0,
    meleeSwing: null,
    mana: 0,
    maxMana: 100,
    ultimateTimer: 0,
    prevUlt: false,
    grazeCount: 0,
    orbitSwords: {
      angle: 0,
      active: true,
    },
  };
}

export function updatePlayer(
  world: World,
  input: InputFrame,
  events: GameEvent[],
): void {
  const p = world.player;

  // Orbiting swords rotation
  p.orbitSwords.angle = (p.orbitSwords.angle + 0.08) % (Math.PI * 2);

  // Handle respawn delay when down
  if (p.downTimer > 0) {
    p.downTimer--;
    if (p.downTimer === 0) {
      if (p.lives > 0) {
        p.x = FIELD_W / 2;
        p.y = FIELD_H - 160;
        p.vx = 0;
        p.vy = 0;
        p.invuln = RESPAWN_INVULN_TICKS;
        p.rolls = 3;
        events.push({ t: "respawn" });
      } else {
        world.phase = "dying";
        world.phaseTimer = 90;
      }
    }
    return;
  }

  // Handle ultimate skill (C key / ULT touch button)
  const ultTriggered = input.ult && !p.prevUlt;
  p.prevUlt = input.ult;

  if (p.ultimateTimer > 0) {
    p.ultimateTimer--;

    // Follow-up Divine Impact shockwave ticks (10 x 3 at ticks 60, 45, 30 for 70 total damage)
    if (p.ultimateTimer === 60 || p.ultimateTimer === 45 || p.ultimateTimer === 30) {
      const beamHalfWidth = 72;
      for (const enemy of world.enemies) {
        if (enemy.alive && Math.abs(enemy.x - p.x) <= beamHalfWidth + enemy.r && enemy.y <= p.y + 30) {
          enemy.hp -= 10;
          enemy.flash = 6;
          events.push({ t: "meleeHit", id: enemy.id, x: enemy.x, y: enemy.y, dmg: 10 });
          if (enemy.hp <= 0) {
            enemy.alive = false;
            world.stats.killed++;
            world.score += 250;
            events.push({ t: "explode", size: "m", x: enemy.x, y: enemy.y });
          }
        }
      }
    }
  }

  if (ultTriggered && p.mana >= 100 && p.ultimateTimer === 0 && p.downTimer === 0) {
    p.mana = 0;
    p.ultimateTimer = 90; // Multi-phase Gungnir Ultimate duration
    p.invuln = Math.max(p.invuln, 90);
    events.push({ t: "ultimate", x: p.x, y: p.y });

    // Cancel all active enemy bullets on screen
    for (const b of world.bullets) {
      if (b.alive && b.owner === "enemy") {
        b.alive = false;
        world.score += 100;
        events.push({ t: "hit", id: b.id, x: b.x, y: b.y });
      }
    }

    // Initial Divine Impact (40 damage)
    const beamHalfWidth = 72;
    for (const enemy of world.enemies) {
      if (enemy.alive && Math.abs(enemy.x - p.x) <= beamHalfWidth + enemy.r && enemy.y <= p.y + 30) {
        enemy.hp -= 40;
        enemy.flash = 12;
        events.push({ t: "meleeHit", id: enemy.id, x: enemy.x, y: enemy.y, dmg: 40 });
        if (enemy.hp <= 0) {
          enemy.alive = false;
          world.stats.killed++;
          world.score += 500;
          events.push({ t: "explode", size: "l", x: enemy.x, y: enemy.y });
        }
      }
    }
  }

  // Handle evasive roll (X / button)
  const rollTriggered = input.roll && !p.prevRoll;
  p.prevRoll = input.roll;

  if (rollTriggered && p.rolls > 0 && p.rollTimer === 0) {
    p.rolls--;
    p.rollTimer = ROLL_DURATION_TICKS;
    events.push({ t: "roll" });
  }

  if (p.rollTimer > 0) {
    p.rollTimer--;
  }

  if (p.invuln > 0) {
    p.invuln--;
  }

  // Movement: combine analog/keyboard (-1..1) with touch relative drag (dragDx/Dy)
  let kx = input.moveX;
  let ky = input.moveY;
  const len = Math.hypot(kx, ky);
  if (len > 1) {
    kx /= len;
    ky /= len;
  }

  const moveSpeed = p.rollTimer > 0 ? PLAYER_SPEED * 0.75 : PLAYER_SPEED;
  p.vx = kx * moveSpeed;
  p.vy = ky * moveSpeed;

  p.x += p.vx * DT + input.dragDx;
  p.y += p.vy * DT + input.dragDy;

  // Clamp within field
  const margin = 28;
  p.x = Math.max(margin, Math.min(FIELD_W - margin, p.x));
  p.y = Math.max(margin, Math.min(FIELD_H - margin, p.y));

  // Update active melee swing
  if (p.meleeSwing) {
    p.meleeSwing.duration--;
    if (p.meleeSwing.duration <= 0) {
      p.meleeSwing = null;
    }
  }

  // Firing
  if (p.fireCooldown > 0) {
    p.fireCooldown--;
  }

  // Cannot fire while rolling
  if (input.fire && p.fireCooldown === 0 && p.rollTimer === 0) {
    firePlayerWeapon(world, events);
  }
}

function firePlayerWeapon(world: World, events: GameEvent[]): void {
  const p = world.player;
  const shotSpeed = 960; // px/s upward

  // Alternating sword slash: LEFT -> RIGHT -> LEFT -> RIGHT (1:L->R, 2:R->L, 3:L->R, 4:R->L)
  const nextDir: SlashDirection = p.slashDirection === "l2r" ? "r2l" : "l2r";
  p.slashDirection = nextDir;
  p.comboCount = (p.comboCount % 4) + 1;
  const swingId = world.nextId++;
  p.meleeSwing = {
    id: swingId,
    direction: nextDir,
    tick: world.tick,
    duration: 8,
    hitEnemyIds: [],
  };
  events.push({
    t: "meleeSlash",
    direction: nextDir,
    swingId,
    x: p.x,
    y: p.y - 20,
  });

  if (p.power === 1) {
    p.fireCooldown = 9; // ~6.6 shots/sec
    world.bullets.push({
      id: world.nextId++,
      x: p.x,
      y: p.y - 28,
      vx: 0,
      vy: -shotSpeed,
      r: 6,
      dmg: 1,
      owner: "player",
      alive: true,
    });
    events.push({ t: "shot", level: 1 });
  } else if (p.power === 2) {
    p.fireCooldown = 8;
    // Dual parallel cannons
    world.bullets.push(
      {
        id: world.nextId++,
        x: p.x - 16,
        y: p.y - 24,
        vx: 0,
        vy: -shotSpeed,
        r: 6,
        dmg: 1,
        owner: "player",
        alive: true,
      },
      {
        id: world.nextId++,
        x: p.x + 16,
        y: p.y - 24,
        vx: 0,
        vy: -shotSpeed,
        r: 6,
        dmg: 1,
        owner: "player",
        alive: true,
      },
    );
    events.push({ t: "shot", level: 2 });
  } else {
    p.fireCooldown = 8;
    // 3-way spread
    const spreadVx = 180;
    world.bullets.push(
      {
        id: world.nextId++,
        x: p.x,
        y: p.y - 28,
        vx: 0,
        vy: -shotSpeed,
        r: 7,
        dmg: 1,
        owner: "player",
        alive: true,
      },
      {
        id: world.nextId++,
        x: p.x - 14,
        y: p.y - 22,
        vx: -spreadVx,
        vy: -shotSpeed * 0.96,
        r: 6,
        dmg: 1,
        owner: "player",
        alive: true,
      },
      {
        id: world.nextId++,
        x: p.x + 14,
        y: p.y - 22,
        vx: spreadVx,
        vy: -shotSpeed * 0.96,
        r: 6,
        dmg: 1,
        owner: "player",
        alive: true,
      },
    );
    events.push({ t: "shot", level: 3 });
  }

  world.stats.shotsFired++;
}

export function killPlayer(world: World, events: GameEvent[]): void {
  const p = world.player;
  if (p.downTimer > 0 || p.rollTimer > 0 || p.invuln > 0 || world.invulnerable) {
    return;
  }

  p.lives--;
  p.deaths++;
  p.downTimer = DOWN_DURATION_TICKS;
  if (p.power > 1) {
    p.power = (p.power - 1) as 1 | 2;
  }
  events.push({ t: "playerDown", x: p.x, y: p.y });
  events.push({ t: "explode", size: "l", x: p.x, y: p.y });
}
