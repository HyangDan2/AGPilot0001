import { EnemyKind, PathKind, PickupKind } from "./types";

export interface WaveDef {
  /** Time in seconds when this wave triggers. */
  at: number;
  kind: EnemyKind;
  formation?: "vee" | "line" | "single";
  count?: number;
  spacing?: number;
  path?: PathKind;
  x?: number;
  y?: number;
  reward?: PickupKind;
  ground?: boolean;
}

export const STAGE1_WAVES: WaveDef[] = [
  // 0:12 First test wave - Kestrels in V
  { at: 12, kind: "kestrel", formation: "vee", count: 5, spacing: 36, path: "straight", x: 360, y: -40 },

  // 0:24 Cross-swoop formations from flanks
  { at: 24, kind: "kestrel", formation: "line", count: 4, spacing: 28, path: "swoopL", x: 120, y: -40 },
  { at: 27, kind: "kestrel", formation: "line", count: 4, spacing: 28, path: "swoopR", x: 600, y: -40 },

  // 0:38 Dive bombers (Harrier)
  { at: 38, kind: "harrier", count: 2, spacing: 180, path: "dive", x: 260, y: -50 },
  { at: 42, kind: "harrier", count: 2, spacing: 180, path: "dive", x: 460, y: -50 },

  // 0:52 RED FORMATION (Eliminating all drops POW!)
  { at: 52, kind: "kestrelRed", formation: "line", count: 6, spacing: 32, path: "sCurve", x: 360, y: -40, reward: "pow" },

  // 1:08 First heavy bomber Condor with escort
  { at: 68, kind: "condor", path: "hover", x: 360, y: -100 },
  { at: 72, kind: "kestrel", formation: "vee", count: 5, spacing: 36, path: "straight", x: 200, y: -40 },
  { at: 72, kind: "kestrel", formation: "vee", count: 5, spacing: 36, path: "straight", x: 520, y: -40 },

  // 1:24 Sea zone with gunboats
  { at: 84, kind: "gunboat", path: "ground", x: 220, y: -100 },
  { at: 90, kind: "gunboat", path: "ground", x: 500, y: -100 },
  { at: 94, kind: "harrier", count: 3, spacing: 140, path: "dive", x: 360, y: -50 },

  // 1:44 MIDBOSS: Albatross
  { at: 104, kind: "albatross", path: "hover", x: 360, y: -120 },

  // 2:10 Post-midboss recovery + Red formation for Roll item / powerup
  { at: 130, kind: "kestrelRed", formation: "line", count: 6, spacing: 30, path: "sCurve", x: 360, y: -40, reward: "roll" },
  { at: 140, kind: "condor", path: "hover", x: 240, y: -100 },
  { at: 144, kind: "condor", path: "hover", x: 480, y: -100 },

  // 2:38 FINAL BOSS: Leviathan warning & entrance
  { at: 158, kind: "leviathan", path: "hover", x: 360, y: -200 },
];
