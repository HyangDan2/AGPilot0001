import {
  Enemy,
  EnemyKind,
  GameEvent,
  PathKind,
  TICK_HZ,
  World,
} from "./types";
import { fireEnemyBullet, updateEnemyPath } from "./patterns";
import { rand } from "./rng";
import { STAGE1_WAVES } from "./stage1";
import { STAGE2_WAVES } from "./stage2";

export interface EnemyDef {
  kind: EnemyKind;
  hp: number;
  r: number;
  ground: boolean;
  score: number;
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  kestrel: { kind: "kestrel", hp: 1, r: 24, ground: false, score: 100 },
  kestrelRed: { kind: "kestrelRed", hp: 1, r: 24, ground: false, score: 150 },
  harrier: { kind: "harrier", hp: 3, r: 28, ground: false, score: 250 },
  condor: { kind: "condor", hp: 18, r: 52, ground: false, score: 800 },
  gunboat: { kind: "gunboat", hp: 14, r: 42, ground: true, score: 600 },
  albatross: { kind: "albatross", hp: 140, r: 90, ground: false, score: 5000 },
  leviathan: { kind: "leviathan", hp: 260, r: 180, ground: false, score: 20000 },
  golem: { kind: "golem", hp: 12, r: 44, ground: true, score: 700 },
  siren: { kind: "siren", hp: 4, r: 26, ground: false, score: 300 },
  kraken: { kind: "kraken", hp: 320, r: 190, ground: false, score: 30000 },
  seraph: { kind: "seraph", hp: 6, r: 30, ground: false, score: 500 },
  valkyrieQueen: { kind: "valkyrieQueen", hp: 450, r: 120, ground: false, score: 50000 },
};

export function spawnEnemy(
  world: World,
  kind: EnemyKind,
  x: number,
  y: number,
  path: PathKind = "straight",
  formationId = 0,
): Enemy {
  const def = ENEMY_DEFS[kind];
  const enemy: Enemy = {
    id: world.nextId++,
    kind,
    x,
    y,
    x0: x,
    y0: y,
    path,
    age: 0,
    hp: def.hp,
    maxHp: def.hp,
    r: def.r,
    ground: def.ground,
    fireTimer: 30 + Math.floor(rand(world) * 30),
    flash: 0,
    heading: Math.PI,
    formation: formationId,
    sx: 0,
    sy: 0,
    mode: 0,
    parts: [],
    alive: true,
  };

  // Configure boss parts if midboss / final boss
  if (kind === "albatross") {
    enemy.parts = [
      { name: "engineL", dx: -70, dy: 10, r: 30, hp: 40, maxHp: 40, alive: true, flash: 0 },
      { name: "engineR", dx: 70, dy: 10, r: 30, hp: 40, maxHp: 40, alive: true, flash: 0 },
    ];
  } else if (kind === "kraken") {
    enemy.parts = [
      { name: "tentacleL2", dx: -120, dy: 30, r: 30, hp: 50, maxHp: 50, alive: true, flash: 0 },
      { name: "tentacleL1", dx: -60, dy: 45, r: 30, hp: 50, maxHp: 50, alive: true, flash: 0 },
      { name: "tentacleR1", dx: 60, dy: 45, r: 30, hp: 50, maxHp: 50, alive: true, flash: 0 },
      { name: "tentacleR2", dx: 120, dy: 30, r: 30, hp: 50, maxHp: 50, alive: true, flash: 0 },
    ];
  } else if (kind === "leviathan") {
    enemy.parts = [
      { name: "engineL2", dx: -180, dy: -20, r: 36, hp: 60, maxHp: 60, alive: true, flash: 0 },
      { name: "engineL1", dx: -90, dy: 10, r: 36, hp: 60, maxHp: 60, alive: true, flash: 0 },
      { name: "engineR1", dx: 90, dy: 10, r: 36, hp: 60, maxHp: 60, alive: true, flash: 0 },
      { name: "engineR2", dx: 180, dy: -20, r: 36, hp: 60, maxHp: 60, alive: true, flash: 0 },
    ];
  }

  world.enemies.push(enemy);
  world.stats.spawned++;
  return enemy;
}

export function updateEnemyAI(
  enemy: Enemy,
  world: World,
  events: GameEvent[],
): void {
  enemy.age++;
  if (enemy.flash > 0) enemy.flash--;
  for (const part of enemy.parts) {
    if (part.flash > 0) part.flash--;
  }

  updateEnemyPath(enemy, world.player);
  if (!enemy.alive) return;

  // Don't fire if off-screen top or bottom
  if (enemy.y < 30 || enemy.y > 1150) return;

  // Attack routines by enemy kind
  switch (enemy.kind) {
    case "kestrel":
    case "kestrelRed": {
      if (enemy.age === 40 && rand(world) < 0.6) {
        fireEnemyBullet(world, enemy.x, enemy.y + 16, 260, true);
      }
      break;
    }

    case "harrier": {
      if (enemy.mode === 1 && enemy.age % 25 === 0) {
        fireEnemyBullet(world, enemy.x, enemy.y + 20, 320, false);
      }
      break;
    }

    case "condor": {
      if (enemy.age % 75 === 0) {
        // 3-way fan
        fireEnemyBullet(world, enemy.x, enemy.y + 36, 220, true, -0.25);
        fireEnemyBullet(world, enemy.x, enemy.y + 36, 240, true, 0);
        fireEnemyBullet(world, enemy.x, enemy.y + 36, 220, true, 0.25);
      }
      break;
    }

    case "gunboat": {
      if (enemy.age % 90 === 0) {
        // Aimed twin gun
        fireEnemyBullet(world, enemy.x - 18, enemy.y, 250, true);
        fireEnemyBullet(world, enemy.x + 18, enemy.y, 250, true);
      }
      break;
    }

    case "siren": {
      // Abyssal Phantom: rapid aimed needle bullet
      if (enemy.age === 35 && rand(world) < 0.7) {
        fireEnemyBullet(world, enemy.x, enemy.y + 16, 280, true);
      }
      break;
    }

    case "seraph": {
      // Shadow Drake: twin spread
      if (enemy.age === 42 && rand(world) < 0.8) {
        fireEnemyBullet(world, enemy.x, enemy.y + 18, 250, true, -0.15);
        fireEnemyBullet(world, enemy.x, enemy.y + 18, 250, true, 0.15);
      }
      break;
    }

    case "golem": {
      // Obsidian Golem: 3-way heavy barrage
      if (enemy.age % 70 === 0) {
        fireEnemyBullet(world, enemy.x, enemy.y + 24, 220, true, -0.2);
        fireEnemyBullet(world, enemy.x, enemy.y + 24, 240, true, 0);
        fireEnemyBullet(world, enemy.x, enemy.y + 24, 220, true, 0.2);
      }
      break;
    }

    case "albatross": {
      updateAlbatrossAI(enemy, world, events);
      break;
    }

    case "kraken": {
      updateKrakenAI(enemy, world, events);
      break;
    }

    case "leviathan": {
      updateLeviathanAI(enemy, world, events);
      break;
    }
  }
}

function updateAlbatrossAI(
  enemy: Enemy,
  world: World,
  _events: GameEvent[],
): void {
  const t = enemy.age;

  // Firing logic based on active engines
  if (t % 80 === 0) {
    // Center aimed burst
    fireEnemyBullet(world, enemy.x, enemy.y + 60, 280, true);
  }

  if (t % 110 === 0) {
    // Wing attacks
    for (const part of enemy.parts) {
      if (part.alive) {
        fireEnemyBullet(world, enemy.x + part.dx, enemy.y + part.dy, 220, true, -0.15);
        fireEnemyBullet(world, enemy.x + part.dx, enemy.y + part.dy, 220, true, 0.15);
      }
    }
  }

  // Defeat check
  if (enemy.hp <= 0 && enemy.alive) {
    enemy.alive = false;
    world.score += ENEMY_DEFS.albatross.score;
    _events.push({ t: "explode", size: "l", x: enemy.x, y: enemy.y });
  }
}

function updateKrakenAI(
  enemy: Enemy,
  world: World,
  _events: GameEvent[],
): void {
  const t = enemy.age;

  // Swirling plasma orbs
  if (t % 70 === 0) {
    for (let i = -2; i <= 2; i++) {
      fireEnemyBullet(world, enemy.x, enemy.y + 50, 240, true, i * 0.18);
    }
  }

  // Tentacle targeted crossfire
  if (t % 95 === 0) {
    for (const part of enemy.parts) {
      if (part.alive) {
        fireEnemyBullet(world, enemy.x + part.dx, enemy.y + part.dy, 260, true);
      }
    }
  }

  // Defeat check
  if (enemy.hp <= 0 && enemy.alive) {
    enemy.alive = false;
    world.score += ENEMY_DEFS.kraken.score;
    _events.push({ t: "explode", size: "l", x: enemy.x, y: enemy.y });
  }
}

function updateLeviathanAI(
  enemy: Enemy,
  world: World,
  events: GameEvent[],
): void {
  const t = enemy.age;
  const aliveEngines = enemy.parts.filter((p) => p.alive).length;

  // Boss phase based on engine count
  let phase = 1;
  if (aliveEngines <= 2 && aliveEngines > 0) phase = 2;
  if (aliveEngines === 0) phase = 3;

  if (phase !== world.bossPhase) {
    world.bossPhase = phase;
    events.push({ t: "bossPhase", phase });
  }

  // Phase 1: Engine attacks + forward flak
  if (phase === 1) {
    if (t % 90 === 0) {
      for (const part of enemy.parts) {
        if (part.alive) {
          fireEnemyBullet(world, enemy.x + part.dx, enemy.y + part.dy, 240, true);
        }
      }
    }
    if (t % 140 === 0) {
      // 5-way spread from center
      for (let i = -2; i <= 2; i++) {
        fireEnemyBullet(world, enemy.x, enemy.y + 80, 200, false, i * 0.22);
      }
    }
  } else if (phase === 2) {
    // Phase 2: Concentrated aimed streams + spiral bullets
    if (t % 60 === 0) {
      fireEnemyBullet(world, enemy.x - 30, enemy.y + 70, 300, true);
      fireEnemyBullet(world, enemy.x + 30, enemy.y + 70, 300, true);
    }
    if (t % 20 === 0) {
      const spiralAngle = (t * 0.15) % (Math.PI * 2);
      fireEnemyBullet(world, enemy.x, enemy.y + 40, 210, false, spiralAngle - Math.PI / 2);
    }
  } else {
    // Phase 3: Enraged bullet storms!
    if (t % 45 === 0) {
      for (let i = -3; i <= 3; i++) {
        fireEnemyBullet(world, enemy.x, enemy.y + 60, 250, true, i * 0.18);
      }
    }
    if (t % 15 === 0) {
      const spiralAngle = (-t * 0.2) % (Math.PI * 2);
      fireEnemyBullet(world, enemy.x - 40, enemy.y + 50, 230, false, spiralAngle - Math.PI / 2);
      fireEnemyBullet(world, enemy.x + 40, enemy.y + 50, 230, false, -spiralAngle - Math.PI / 2);
    }
  }

  // Boss core destroyed check
  if (enemy.hp <= 0 && enemy.alive) {
    killEnemy(world, enemy, events);
  }
}

export function killEnemy(world: World, enemy: Enemy, events: GameEvent[]): void {
  if (!enemy.alive) return;
  enemy.alive = false;
  world.stats.killed++;
  world.player.mana = Math.min(world.player.maxMana, world.player.mana + 8);
  const def = ENEMY_DEFS[enemy.kind];
  world.score += def?.score ?? 100;

  if (enemy.kind === "leviathan") {
    world.phase = "clearing";
    world.phaseTimer = 180;
  }

  // Midboss defeat handling (Albatross or Kraken)
  if (enemy.kind === "albatross" || enemy.kind === "kraken") {
    events.push({ t: "midbossDefeated", kind: enemy.kind });
    world.phase = "play";
    // Advance stageTick so next wave begins in ~2.0 seconds
    const waves = world.currentStage === 2 ? STAGE2_WAVES : STAGE1_WAVES;
    if (world.waveCursor < waves.length) {
      const nextWave = waves[world.waveCursor];
      const targetSec = Math.max(0, nextWave.at - 2.0);
      world.stageTick = Math.round(targetSec * TICK_HZ);
    }
  }

  const explSize =
    enemy.kind === "leviathan"
      ? "boss"
      : enemy.kind === "albatross" || enemy.kind === "condor" || enemy.kind === "kraken"
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

export function damageEnemy(
  world: World,
  enemy: Enemy,
  amount: number,
  events: GameEvent[],
  hitX?: number,
  hitY?: number,
): void {
  if (!enemy.alive) return;
  enemy.hp -= amount;
  enemy.flash = Math.max(enemy.flash, 6);
  events.push({ t: "hit", id: enemy.id, x: hitX ?? enemy.x, y: hitY ?? enemy.y });
  if (enemy.hp <= 0) {
    killEnemy(world, enemy, events);
  }
}
