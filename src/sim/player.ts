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
import { damageEnemy } from "./enemies";

export const PLAYER_SPEED = 420; // logical px / s
export const PLAYER_HIT_RADIUS = 10;
export const ROLL_DURATION_TICKS = 72; // ~1.2s at 60Hz
// Two quick sword attacks (8 ticks apart) followed by an 18-tick recovery.
// Projectile shooting cadence is kept independent of the sword combo.
export const MELEE_COMBO_GAP_TICKS = 8;
export const MELEE_COMBO_RECOVERY_TICKS = 18;
export const RESPAWN_INVULN_TICKS = 180; // 3s
export const DOWN_DURATION_TICKS = 60; // 1s before respawn
export const MANA_GAIN_MULTIPLIER = 10; // Faster ULT charge from every source
export const ULTIMATE_TOTAL_DAMAGE = 35; // Half of previous 70 across 42 active ticks
export const AEGIS_SHIELD_INVULN_TICKS = 45; // 0.75s after a body hit consumes a shield

export function addManaUnits(player: Player, amount: number): void {
  if (player.manaUnits === undefined || (player.mana > 0 && player.manaUnits === 0)) {
    player.manaUnits = player.mana * 40;
  }
  player.manaUnits = Math.min(4000, player.manaUnits + amount * MANA_GAIN_MULTIPLIER);
  player.mana = player.manaUnits / 40;
}

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
    meleeCooldown: 0,
    meleeComboStep: 0,
    manaUnits: 0,
    mana: 0,
    maxMana: 100,
    ultimateTimer: 0,
    prevUlt: false,
    grazeCount: 0,
    aegisOrbs: [
      { id: 1, angleOffset: 0, alive: true, hp: 1 },
      { id: 2, angleOffset: Math.PI, alive: true, hp: 1 },
    ],
    lanePower: {
      center: 1.0,
      left: 1.0,
      right: 1.0,
      nextLane: "center",
    },
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

    // Active Beam Phase (42 ticks: from timer 60 down to 19)
    if (p.ultimateTimer <= 60 && p.ultimateTimer >= 19) {
      // Clear enemy bullets at start of Active Beam (tick 60)
      if (p.ultimateTimer === 60) {
        for (const b of world.bullets) {
          if (b.alive && b.owner === "enemy") {
            b.alive = false;
            world.score += 100;
            events.push({ t: "hit", id: b.id, x: b.x, y: b.y });
          }
        }
      }

      // Exact 35 total damage, distributed deterministically across 42 active ticks.
      const elapsed = 60 - p.ultimateTimer; // 0..41
      const dmg = Math.floor((ULTIMATE_TOTAL_DAMAGE * (elapsed + 1)) / 42) -
        Math.floor((ULTIMATE_TOTAL_DAMAGE * elapsed) / 42);

      if (dmg > 0) {
        const beamHalfWidth = 72;
        for (const enemy of world.enemies) {
          if (!enemy.alive) continue;
          if (Math.abs(enemy.x - p.x) <= beamHalfWidth + enemy.r && enemy.y <= p.y + 30) {
            damageEnemy(world, enemy, dmg, events, enemy.x, enemy.y);
          }
          // Boss parts damage
          if (enemy.parts.length > 0) {
            for (const part of enemy.parts) {
              if (!part.alive) continue;
              const px = enemy.x + part.dx;
              const py = enemy.y + part.dy;
              if (Math.abs(px - p.x) <= beamHalfWidth + part.r && py <= p.y + 30) {
                part.hp -= dmg;
                part.flash = 6;
                if (part.hp <= 0) {
                  part.alive = false;
                  world.score += 500;
                  events.push({ t: "explode", size: "m", x: px, y: py });
                }
              }
            }
          }
        }
      }
    }
  }

  if (ultTriggered && (p.manaUnits >= 4000 || p.mana >= 100) && p.ultimateTimer === 0 && p.downTimer === 0) {
    p.manaUnits = 0;
    p.mana = 0;
    p.ultimateTimer = 90; // Multi-phase Gungnir Ultimate duration: 15 Awakening + 15 Summoning + 42 Active + 18 Recovery
    p.invuln = Math.max(p.invuln, 90);
    events.push({ t: "ultimate", x: p.x, y: p.y });
  }

  // Handle evasive roll (X / button)
  const rollTriggered = input.roll && !p.prevRoll;
  p.prevRoll = input.roll;

  if (rollTriggered && p.rolls > 0 && p.rollTimer === 0) {
    p.rolls--;
    p.rollTimer = ROLL_DURATION_TICKS;
    // Evasion takes precedence over a sword combo.
    p.meleeSwing = null;
    p.meleeComboStep = 0;
    p.meleeCooldown = 0;
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

  // Melee timing is independent from automatic projectile fire.
  // First slash -> 8 ticks -> second slash -> 18 ticks of recovery.
  if (p.meleeCooldown > 0) p.meleeCooldown--;
  if (input.fire && p.meleeCooldown === 0 && p.rollTimer === 0) {
    fireMeleeSwing(world, events);
    p.meleeCooldown = p.meleeComboStep === 1
      ? MELEE_COMBO_GAP_TICKS
      : MELEE_COMBO_RECOVERY_TICKS;
  }
  // Releasing fire after the first slash cancels the pending pair instead of
  // surprising the player with a delayed second slash on the next press.
  if (!input.fire && p.meleeCooldown === 0) p.meleeComboStep = 0;

  // Projectile shots keep their original, unaffected cooldown.
  if (p.fireCooldown > 0) p.fireCooldown--;
  if (input.fire && p.fireCooldown === 0 && p.rollTimer === 0) {
    firePlayerWeapon(world, events);
  }
}

function fireMeleeSwing(world: World, events: GameEvent[]): void {
  const p = world.player;
  // LEFT -> RIGHT two-hit combo, then re-arm for the next pair.
  const nextDir: SlashDirection = p.slashDirection === "l2r" ? "r2l" : "l2r";
  p.slashDirection = nextDir;
  p.comboCount = (p.comboCount % 4) + 1;
  p.meleeComboStep = p.meleeComboStep === 0 ? 1 : 0;
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
}

function firePlayerWeapon(world: World, events: GameEvent[]): void {
  const p = world.player;
  const shotSpeed = 960; // px/s upward

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
    // 3-way spread with progressive lane power (Center, Left, Right)
    const spreadVx = 180;
    const cMult = p.lanePower?.center ?? 1.0;
    const lMult = p.lanePower?.left ?? 1.0;
    const rMult = p.lanePower?.right ?? 1.0;
    world.bullets.push(
      {
        id: world.nextId++,
        x: p.x,
        y: p.y - 28,
        vx: 0,
        vy: -shotSpeed,
        r: 7,
        dmg: 1 * cMult,
        owner: "player",
        alive: true,
        lane: "center",
        tier: Math.round((cMult - 1.0) / 0.5),
      },
      {
        id: world.nextId++,
        x: p.x - 14,
        y: p.y - 22,
        vx: -spreadVx,
        vy: -shotSpeed * 0.96,
        r: 6,
        dmg: 1 * lMult,
        owner: "player",
        alive: true,
        lane: "left",
        tier: Math.round((lMult - 1.0) / 0.5),
      },
      {
        id: world.nextId++,
        x: p.x + 14,
        y: p.y - 22,
        vx: spreadVx,
        vy: -shotSpeed * 0.96,
        r: 6,
        dmg: 1 * rMult,
        owner: "player",
        alive: true,
        lane: "right",
        tier: Math.round((rMult - 1.0) / 0.5),
      },
    );
    events.push({ t: "shot", level: 3 });
  }

  world.stats.shotsFired++;
}

/** Body-hit shielding: only a real player hurtbox collision consumes an Aegis orb. */
export function absorbPlayerHit(player: Player, events: GameEvent[]): boolean {
  const shield = player.aegisOrbs.find((orb) => orb.alive);
  if (!shield) return false;
  shield.alive = false;
  shield.hp = 0;
  player.invuln = Math.max(player.invuln, AEGIS_SHIELD_INVULN_TICKS);
  events.push({
    t: "shieldHit",
    id: shield.id,
    x: player.x,
    y: player.y,
    remaining: player.aegisOrbs.filter((orb) => orb.alive).length,
  });
  return true;
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
  // Reduce lane power by 0.5 on life loss (min 1.0)
  if (p.lanePower) {
    p.lanePower.center = Math.max(1.0, p.lanePower.center - 0.5);
    p.lanePower.left = Math.max(1.0, p.lanePower.left - 0.5);
    p.lanePower.right = Math.max(1.0, p.lanePower.right - 0.5);
  }
  // Restore Aegis Orbs on respawn
  if (p.aegisOrbs) {
    for (const orb of p.aegisOrbs) {
      orb.alive = true;
      orb.hp = 1;
    }
  }

  events.push({ t: "playerDown", x: p.x, y: p.y });
  events.push({ t: "explode", size: "l", x: p.x, y: p.y });
}
