import {
  Enemy,
  EnemyKind,
  GameEvent,
  PathKind,
  World,
} from "./types";
import { fireEnemyBullet, updateEnemyPath } from "./patterns";
import { rand } from "./rng";

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

    case "albatross": {
      updateAlbatrossAI(enemy, world, events);
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
    enemy.alive = false;
    world.score += ENEMY_DEFS.leviathan.score;
    world.phase = "clearing";
    world.phaseTimer = 180; // 3 seconds of victory explosions
    events.push({ t: "explode", size: "boss", x: enemy.x, y: enemy.y });
  }
}
