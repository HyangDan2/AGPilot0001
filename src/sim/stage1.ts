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
  // 0:01.8 First combat encounter: Shadow Gargoyle V-formation right after launch
  { at: 1.8, kind: "kestrel", formation: "vee", count: 5, spacing: 38, path: "straight", x: 360, y: -40 },

  // 0:04.5 Flank cross-swoop interceptors
  { at: 4.5, kind: "kestrel", formation: "line", count: 4, spacing: 28, path: "swoopL", x: 140, y: -40 },
  { at: 6.2, kind: "kestrel", formation: "line", count: 4, spacing: 28, path: "swoopR", x: 580, y: -40 },

  // 0:09 Precision dive-bombers tracking player
  { at: 9.0, kind: "harrier", count: 2, spacing: 180, path: "dive", x: 260, y: -50 },
  { at: 11.0, kind: "harrier", count: 2, spacing: 180, path: "dive", x: 460, y: -50 },

  // 0:13 Crimson Drake Elite Squadron (Eliminating all 6 awards POW upgrade)
  { at: 13.5, kind: "kestrelRed", formation: "line", count: 6, spacing: 30, path: "sCurve", x: 360, y: -40, reward: "pow" },

  // 0:18 Armored Behemoth with escort gargoyles
  { at: 18.0, kind: "condor", path: "hover", x: 360, y: -90 },
  { at: 20.0, kind: "kestrel", formation: "vee", count: 3, spacing: 36, path: "swoopL", x: 180, y: -40, reward: "aegis" },
  { at: 20.0, kind: "kestrel", formation: "vee", count: 3, spacing: 36, path: "swoopR", x: 540, y: -40 },

  // 0:23 Floating Arcane Bastions & dive phantoms
  { at: 23.5, kind: "gunboat", path: "ground", x: 220, y: -90 },
  { at: 25.0, kind: "gunboat", path: "ground", x: 500, y: -90 },
  { at: 26.5, kind: "harrier", count: 3, spacing: 140, path: "dive", x: 360, y: -50 },

  // 0:29 Crimson formation (reward: Roll refill)
  { at: 29.0, kind: "kestrelRed", formation: "line", count: 6, spacing: 30, path: "sCurve", x: 360, y: -40, reward: "roll" },

  // 0:34 MIDBOSS: Ancient Sky Guardian (Albatross)
  { at: 34.0, kind: "albatross", path: "hover", x: 360, y: -120 },

  // Post-Midboss High-Intensity Waves
  { at: 48.0, kind: "condor", path: "hover", x: 220, y: -90 },
  { at: 50.5, kind: "condor", path: "hover", x: 500, y: -90 },
  { at: 53.0, kind: "kestrelRed", formation: "line", count: 6, spacing: 32, path: "sCurve", x: 360, y: -40, reward: "pow" },
  { at: 57.0, kind: "harrier", count: 4, spacing: 110, path: "dive", x: 360, y: -50 },

  // 1:04 FINAL BOSS: Sun-Winged Sovereign (Celestial Guardian)
  { at: 64.0, kind: "celestialGuardian", path: "hover", x: 360, y: -200 },
];
