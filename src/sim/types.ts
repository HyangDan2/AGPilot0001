// Pure simulation types. No DOM, Canvas or Audio imports anywhere under src/sim/.

export const FIELD_W = 720;
export const FIELD_H = 1280;
export const TICK_HZ = 60;
export const DT = 1 / TICK_HZ;

export interface InputFrame {
  /** Analog/keyboard movement, each axis -1..1. */
  moveX: number;
  moveY: number;
  /** Relative drag in logical pixels accumulated since the previous tick (touch). */
  dragDx: number;
  dragDy: number;
  fire: boolean;
  roll: boolean;
  ult: boolean;
}

export const NO_INPUT: Readonly<InputFrame> = Object.freeze({
  moveX: 0,
  moveY: 0,
  dragDx: 0,
  dragDy: 0,
  fire: false,
  roll: false,
  ult: false,
});

export type ExplosionSize = "s" | "m" | "l" | "boss";
export type PickupKind = "pow" | "roll" | "medal" | "aegis";

export type GameEvent =
  | { t: "shot"; level: 1 | 2 | 3 }
  | { t: "meleeSlash"; direction: SlashDirection; swingId: number; x: number; y: number }
  | { t: "meleeHit"; id: number; x: number; y: number; dmg: number }
  | { t: "hit"; id: number; x: number; y: number }
  | { t: "explode"; size: ExplosionSize; x: number; y: number }
  | { t: "pickup"; kind: PickupKind; x: number; y: number }
  | { t: "bonus"; amount: number; x: number; y: number }
  | { t: "roll" }
  | { t: "ultimate"; x: number; y: number }
  | { t: "graze"; x: number; y: number; bulletId: number }
  | { t: "playerDown"; x: number; y: number }
  | { t: "respawn" }
  | { t: "warning"; isMidboss?: boolean }
  | { t: "midbossDefeated"; kind: EnemyKind }
  | { t: "orbDestroyed"; id: number; x: number; y: number }
  | { t: "bossPhase"; phase: number }
  | { t: "stageClear"; stage: number }
  | { t: "gameOver" };

export type SlashDirection = "l2r" | "r2l";

export interface MeleeSwing {
  id: number;
  direction: SlashDirection;
  tick: number;
  duration: number;
  hitEnemyIds: number[];
}

export type EnemyKind =
  | "kestrel"
  | "kestrelRed"
  | "harrier"
  | "condor"
  | "gunboat"
  | "albatross"
  | "leviathan"
  | "golem"
  | "siren"
  | "kraken"
  | "seraph"
  | "valkyrieQueen";

export type PathKind =
  | "straight"
  | "swoopL"
  | "swoopR"
  | "sCurve"
  | "dive"
  | "hover"
  | "ground"
  | "loopL"
  | "loopR";

export interface BossPart {
  name: string;
  dx: number;
  dy: number;
  r: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  flash: number;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  x0: number;
  y0: number;
  path: PathKind;
  age: number;
  hp: number;
  maxHp: number;
  r: number;
  ground: boolean;
  fireTimer: number;
  flash: number;
  heading: number;
  formation: number;
  sx: number;
  sy: number;
  mode: number;
  parts: BossPart[];
  alive: boolean;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  owner: "player" | "enemy";
  alive: boolean;
  grazed?: boolean;
  lane?: "center" | "left" | "right";
  tier?: number;
}

export interface AegisOrb {
  id: number;
  angleOffset: number;
  alive: boolean;
  hp: number;
}

export interface LanePower {
  center: number;
  left: number;
  right: number;
  nextLane: "center" | "left" | "right";
}

export interface Pickup {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  age: number;
  alive: boolean;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lives: number;
  power: 1 | 2 | 3;
  rolls: number;
  rollTimer: number;
  invuln: number;
  downTimer: number;
  fireCooldown: number;
  prevRoll: boolean;
  deaths: number;
  slashDirection: SlashDirection;
  comboCount: number;
  meleeSwing: MeleeSwing | null;
  mana: number;
  maxMana: number;
  ultimateTimer: number;
  prevUlt: boolean;
  grazeCount: number;
  aegisOrbs: AegisOrb[];
  lanePower: LanePower;
  orbitSwords: {
    angle: number;
    active: boolean;
  };
}

export interface Formation {
  total: number;
  killed: number;
  escaped: number;
  reward: PickupKind | null;
  lastX: number;
  lastY: number;
}

export type Phase = "intro" | "play" | "boss" | "clearing" | "clear" | "dying" | "over";

export interface Stats {
  spawned: number;
  killed: number;
  shotsFired: number;
  noMissBonus: number;
  grazes: number;
}

export interface WorldOptions {
  seed: number;
  invulnerable?: boolean;
  startAt?: number;
  startStage?: number;
  difficulty?: "normal" | "nightmare";
}

export interface World {
  seed: number;
  rngState: number;
  tick: number;
  stageTick: number;
  waveCursor: number;
  phase: Phase;
  phaseTimer: number;
  scrollY: number;
  currentStage: number;
  difficulty: "normal" | "nightmare";
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  pickups: Pickup[];
  formations: Map<number, Formation>;
  score: number;
  stats: Stats;
  nextId: number;
  bossId: number;
  bossPhase: number;
  invulnerable: boolean;
  hitstopTimer: number;
  ended: boolean;
}
