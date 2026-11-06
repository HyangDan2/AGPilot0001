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
  // 0:03 First combat encounter: Kestrel V-formation right after takeoff
  { at: 3.0, kind: "kestrel", formation: "vee", count: 5, spacing: 38, path: "straight", x: 360, y: -40 },

  // 0:07 Flank cross-swoop interceptors
  { at: 7.0, kind: "kestrel", formation: "line", count: 4, spacing: 28, path: "swoopL", x: 140, y: -40 },
  { at: 8.5, kind: "kestrel", formation: "line", count: 4, spacing: 28, path: "swoopR", x: 580, y: -40 },

  // 0:13 Precision dive-bombers tracking player
  { at: 13.0, kind: "harrier", count: 2, spacing: 180, path: "dive", x: 260, y: -50 },
  { at: 16.0, kind: "harrier", count: 2, spacing: 180, path: "dive", x: 460, y: -50 },

  // 0:20 Crimson Kestrel Elite Squadron (Eliminating all 6 awards POW upgrade)
  { at: 20.0, kind: "kestrelRed", formation: "line", count: 6, spacing: 30, path: "sCurve", x: 360, y: -40, reward: "pow" },

  // 0:30 Heavy Bomber Condor with fighter screen
  { at: 30.0, kind: "condor", path: "hover", x: 360, y: -90 },
  { at: 33.0, kind: "kestrel", formation: "vee", count: 3, spacing: 36, path: "swoopL", x: 180, y: -40 },
  { at: 33.0, kind: "kestrel", formation: "vee", count: 3, spacing: 36, path: "swoopR", x: 540, y: -40 },

  // 0:42 Archipelago zone with coastal gunboats & dive bombers
  { at: 42.0, kind: "gunboat", path: "ground", x: 220, y: -90 },
  { at: 45.0, kind: "gunboat", path: "ground", x: 500, y: -90 },
  { at: 47.0, kind: "harrier", count: 3, spacing: 140, path: "dive", x: 360, y: -50 },

  // 0:54 Crimson formation (reward: Roll refill)
  { at: 54.0, kind: "kestrelRed", formation: "line", count: 6, spacing: 30, path: "sCurve", x: 360, y: -40, reward: "roll" },

  // 1:04 MIDBOSS: Albatross Heavy Assault Bomber
  { at: 64.0, kind: "albatross", path: "hover", x: 360, y: -120 },

  // Post-Midboss High-Intensity Waves
  { at: 78.0, kind: "condor", path: "hover", x: 220, y: -90 },
  { at: 81.0, kind: "condor", path: "hover", x: 500, y: -90 },
  { at: 86.0, kind: "kestrelRed", formation: "line", count: 6, spacing: 32, path: "sCurve", x: 360, y: -40, reward: "pow" },
  { at: 92.0, kind: "harrier", count: 4, spacing: 110, path: "dive", x: 360, y: -50 },

  // 1:40 FINAL BOSS: Flagship Leviathan
  { at: 100.0, kind: "leviathan", path: "hover", x: 360, y: -200 },
];
