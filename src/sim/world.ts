import {
  checkGraze,
  checkMeleeHits,
  checkOrbitSwordHits,
  hitEnemy,
  hitPlayer,
  playerCollectsPickup,
} from "./collision";
import { ENEMY_DEFS, spawnEnemy, updateEnemyAI } from "./enemies";
import { createPlayer, killPlayer, updatePlayer } from "./player";
import { rand } from "./rng";
import { STAGE1_WAVES, WaveDef } from "./stage1";
import { STAGE2_WAVES } from "./stage2";
import {
  DT,
  Enemy,
  FIELD_H,
  FIELD_W,
  GameEvent,
  InputFrame,
  PickupKind,
  TICK_HZ,
  World,
  WorldOptions,
} from "./types";

export function createWorld(options?: WorldOptions): World {
  const seed = options?.seed ?? 2026001;
  const startAt = options?.startAt ?? 0;
  return {
    seed,
    rngState: seed,
    tick: Math.floor(startAt * TICK_HZ),
    stageTick: Math.floor(startAt * TICK_HZ),
    waveCursor: 0,
    phase: startAt > 0 ? "play" : "intro",
    phaseTimer: startAt > 0 ? 0 : 120, // 2s intro takeoff
    scrollY: Math.floor(startAt * 80),
    currentStage: options?.startStage ?? 1,
    difficulty: options?.difficulty ?? "normal",
    player: createPlayer(),
    enemies: [],
    bullets: [],
    pickups: [],
    formations: new Map(),
    score: 0,
    stats: { spawned: 0, killed: 0, shotsFired: 0, noMissBonus: 50000, grazes: 0 },
    nextId: 1,
    bossId: 0,
    bossPhase: 0,
    invulnerable: options?.invulnerable ?? false,
    hitstopTimer: 0,
    ended: false,
  };
}

export function step(world: World, input: InputFrame): GameEvent[] {
  const events: GameEvent[] = [];
  world.tick++;

  // Tactical hitstop (freeze-frame crunch on heavy melee strikes)
  if (world.hitstopTimer > 0) {
    world.hitstopTimer--;
    return events;
  }

  // Terminal states reject play input
  if (world.phase === "clear" || world.phase === "over") {
    world.ended = true;
    return events;
  }

  // Scroll background
  world.scrollY += 80 * DT;

  // Intro take-off phase
  if (world.phase === "intro") {
    world.phaseTimer--;
    // Player rises up from carrier deck
    world.player.y -= 1.2;
    if (world.phaseTimer <= 0) {
      world.phase = "play";
    }
    return events;
  }

  // Dying phase countdown
  if (world.phase === "dying") {
    world.phaseTimer--;
    if (world.phaseTimer <= 0) {
      world.phase = "over";
      world.ended = true;
      events.push({ t: "gameOver" });
    }
    updateBulletsAndPickups(world);
    return events;
  }

  // Clearing victory phase
  if (world.phase === "clearing") {
    world.phaseTimer--;
    if (world.phaseTimer % 20 === 0) {
      // Periodic victory fireworks/explosions
      const rx = FIELD_W / 2 + (rand(world) - 0.5) * 320;
      const ry = 220 + (rand(world) - 0.5) * 160;
      events.push({ t: "explode", size: "m", x: rx, y: ry });
    }
    if (world.phaseTimer <= 0) {
      world.phase = "clear";
      world.ended = true;
      // Calculate no-miss bonus
      if (world.player.deaths === 0) {
        world.score += world.stats.noMissBonus;
        events.push({ t: "bonus", amount: world.stats.noMissBonus, x: FIELD_W / 2, y: FIELD_H / 2 });
      }
      events.push({ t: "stageClear", stage: world.currentStage });
    }
    updateBulletsAndPickups(world);
    return events;
  }

  // Active Play / Boss Phase:
  // Advance stage tick only if no blocking boss (albatross, leviathan, kraken) is alive
  const bossAlive = world.enemies.some(
    (e) => (e.kind === "albatross" || e.kind === "leviathan" || e.kind === "kraken") && e.alive,
  );
  if (!bossAlive) {
    world.stageTick++;
    triggerStageWaves(world, events);
  }

  // Update Player
  updatePlayer(world, input, events);

  // Melee Swept Arc Collision
  checkMeleeHits(world, events);

  // Orbiting Aegis Swords Collision & Projectile Defense
  checkOrbitSwordHits(world, events);

  // Bullet Graze Check (Charges Ultimate Gauge)
  checkGraze(world, events);

  // Update Enemies
  for (const enemy of world.enemies) {
    if (!enemy.alive) continue;
    updateEnemyAI(enemy, world, events);

    // If an enemy escaped, record in formation
    if (!enemy.alive && enemy.formation > 0) {
      const f = world.formations.get(enemy.formation);
      if (f) f.escaped++;
    }
  }

  // Update Bullets
  updateBulletsAndPickups(world);

  // Collisions: Player bullets vs Enemies
  handlePlayerBulletCollisions(world, events);

  // Collisions: Enemy bullets vs Player
  handleEnemyBulletCollisions(world, events);

  // Collisions: Pickups vs Player
  handlePickupCollisions(world, events);

  // Clean dead entities
  world.enemies = world.enemies.filter((e) => e.alive);
  world.bullets = world.bullets.filter((b) => b.alive);
  world.pickups = world.pickups.filter((p) => p.alive);

  return events;
}

function triggerStageWaves(world: World, events: GameEvent[]): void {
  const currentSec = world.stageTick / TICK_HZ;
  const waves = world.currentStage === 2 ? STAGE2_WAVES : STAGE1_WAVES;

  while (world.waveCursor < waves.length) {
    const wave = waves[world.waveCursor];
    if (currentSec < wave.at) break;

    // Cap active on-screen enemies to prevent mobile frame drop and uncluttered combat
    const activeEnemies = world.enemies.filter((e) => e.alive).length;
    const isBoss = wave.kind === "albatross" || wave.kind === "leviathan" || wave.kind === "kraken";
    if (activeEnemies >= 16 && !isBoss) {
      // Delay wave spawn until screen cleared slightly
      break;
    }

    world.waveCursor++;
    spawnWave(world, wave, events);
  }
}

function spawnWave(world: World, wave: WaveDef, events: GameEvent[]): void {
  const formationId = wave.reward ? world.nextId++ : 0;
  const count = wave.count ?? 1;

  if (formationId > 0) {
    world.formations.set(formationId, {
      total: count,
      killed: 0,
      escaped: 0,
      reward: wave.reward ?? null,
      lastX: 360,
      lastY: 400,
    });
  }

  if (wave.kind === "leviathan" || wave.kind === "kraken") {
    world.phase = "boss";
    events.push({ t: "warning" });
  }

  const baseX = wave.x ?? FIELD_W / 2;
  const baseY = wave.y ?? -40;
  const spacing = wave.spacing ?? 36;
  const path = wave.path ?? "straight";

  if (wave.formation === "vee") {
    // V-formation: 1 leader, pairs behind and outward
    spawnEnemy(world, wave.kind, baseX, baseY, path, formationId);
    for (let i = 1; i <= Math.floor(count / 2); i++) {
      spawnEnemy(world, wave.kind, baseX - i * spacing, baseY - i * spacing, path, formationId);
      spawnEnemy(world, wave.kind, baseX + i * spacing, baseY - i * spacing, path, formationId);
    }
  } else if (wave.formation === "line") {
    // Single file line
    for (let i = 0; i < count; i++) {
      spawnEnemy(world, wave.kind, baseX, baseY - i * spacing, path, formationId);
    }
  } else {
    // Single or custom count
    for (let i = 0; i < count; i++) {
      const ox = count > 1 ? (i - (count - 1) / 2) * spacing : 0;
      spawnEnemy(world, wave.kind, baseX + ox, baseY, path, formationId);
    }
  }
}

function updateBulletsAndPickups(world: World): void {
  // Move bullets
  for (const b of world.bullets) {
    if (!b.alive) continue;
    b.x += b.vx * DT;
    b.y += b.vy * DT;
    if (b.y < -50 || b.y > FIELD_H + 50 || b.x < -50 || b.x > FIELD_W + 50) {
      b.alive = false;
    }
  }

  // Move pickups (float gently down)
  for (const p of world.pickups) {
    if (!p.alive) continue;
    p.age++;
    p.y += 90 * DT;
    p.x += Math.sin(p.age * 0.08) * 0.7;
    if (p.y > FIELD_H + 50) {
      p.alive = false;
    }
  }
}

function handlePlayerBulletCollisions(world: World, events: GameEvent[]): void {
  for (const bullet of world.bullets) {
    if (!bullet.alive || bullet.owner !== "player") continue;

    for (const enemy of world.enemies) {
      if (!enemy.alive) continue;

      if (hitEnemy(enemy, bullet)) {
        bullet.alive = false;
        enemy.flash = 4;
        world.player.mana = Math.min(world.player.maxMana, world.player.mana + 2);
        events.push({ t: "hit", id: enemy.id, x: bullet.x, y: bullet.y });

        // Boss part damage first
        let partDamaged = false;
        if (enemy.parts.length > 0) {
          for (const part of enemy.parts) {
            if (part.alive && Math.hypot(bullet.x - (enemy.x + part.dx), bullet.y - (enemy.y + part.dy)) <= part.r + bullet.r) {
              part.hp -= bullet.dmg;
              part.flash = 4;
              partDamaged = true;
              if (part.hp <= 0) {
                part.alive = false;
                events.push({ t: "explode", size: "m", x: enemy.x + part.dx, y: enemy.y + part.dy });
              }
              break;
            }
          }
        }

        if (!partDamaged) {
          enemy.hp -= bullet.dmg;
        }

        // Enemy death
        if (enemy.hp <= 0 && enemy.alive) {
          killEnemy(world, enemy, events);
        }
        break;
      }
    }
  }
}

function killEnemy(world: World, enemy: Enemy, events: GameEvent[]): void {
  enemy.alive = false;
  world.stats.killed++;
  world.player.mana = Math.min(world.player.maxMana, world.player.mana + 8);
  const def = ENEMY_DEFS[enemy.kind];
  world.score += def.score;

  if (enemy.kind === "leviathan") {
    world.phase = "clearing";
    world.phaseTimer = 180;
  }

  const explSize =
    enemy.kind === "leviathan"
      ? "boss"
      : enemy.kind === "albatross" || enemy.kind === "condor"
        ? "l"
        : enemy.kind === "gunboat" || enemy.kind === "harrier"
          ? "m"
          : "s";
  events.push({ t: "explode", size: explSize, x: enemy.x, y: enemy.y });

  // Formation reward check
  if (enemy.formation > 0) {
    const f = world.formations.get(enemy.formation);
    if (f) {
      f.killed++;
      f.lastX = enemy.x;
      f.lastY = enemy.y;
      if (f.killed === f.total && f.reward) {
        spawnPickup(world, f.reward, f.lastX, f.lastY);
      }
    }
  }
}

function handleEnemyBulletCollisions(world: World, events: GameEvent[]): void {
  for (const bullet of world.bullets) {
    if (!bullet.alive || bullet.owner !== "enemy") continue;

    if (hitPlayer(world.player, bullet)) {
      bullet.alive = false;
      killPlayer(world, events);
      break;
    }
  }
}

function spawnPickup(
  world: World,
  kind: PickupKind,
  x: number,
  y: number,
): void {
  world.pickups.push({
    id: world.nextId++,
    kind,
    x,
    y,
    age: 0,
    alive: true,
  });
}

function handlePickupCollisions(world: World, events: GameEvent[]): void {
  const p = world.player;
  for (const item of world.pickups) {
    if (!item.alive) continue;

    if (playerCollectsPickup(p, item)) {
      item.alive = false;
      events.push({ t: "pickup", kind: item.kind, x: item.x, y: item.y });

      if (item.kind === "pow") {
        if (p.power < 3) {
          p.power = (p.power + 1) as 2 | 3;
        } else {
          world.score += 1000;
        }
      } else if (item.kind === "roll") {
        p.rolls = Math.min(6, p.rolls + 1);
      } else if (item.kind === "medal") {
        world.score += 5000;
      }
    }
  }
}
