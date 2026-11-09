import { WaveDef } from "./stage1";

/**
 * Stage 03 — YGGDRASIL HEART
 * World Tree core: living bark, golden roots, emerald spore clouds, and the Cosmic Rune Loom.
 * Normal enemies: exactly 94 enemies (53 * 1.33^2 ≈ 94).
 * Bullet speed multiplier: 1.44x (1.20 * 1.20).
 */
export const STAGE3_WAVES: WaveDef[] = [
  // 0:02.0: Spore Wisp V-formation vanguard (6 enemies)
  { at: 2.0, kind: "seedWisp", formation: "vee", count: 6, spacing: 34, path: "straight", x: 360, y: -40 },

  // 0:04.8 & 0:06.2: Spore Wisp cross-swoop interceptors (5 + 5 = 10 enemies)
  { at: 4.8, kind: "seedWisp", formation: "line", count: 5, spacing: 26, path: "swoopL", x: 140, y: -40 },
  { at: 6.2, kind: "seedWisp", formation: "line", count: 5, spacing: 26, path: "swoopR", x: 580, y: -40 },

  // 0:09.0 & 0:11.2: Thorn Mantis dive hunters (4 + 4 = 8 enemies)
  { at: 9.0, kind: "thornMantis", count: 4, spacing: 130, path: "dive", x: 280, y: -50 },
  { at: 11.2, kind: "thornMantis", count: 4, spacing: 130, path: "dive", x: 440, y: -50 },

  // 0:13.8: Crimson Wing squadron (POW upgrade) (7 enemies)
  { at: 13.8, kind: "kestrelRed", formation: "line", count: 7, spacing: 28, path: "sCurve", x: 360, y: -40, reward: "pow" },

  // 0:17.0 & 0:18.0: Amber Moth heavy spore casters (1 + 1 = 2 enemies)
  { at: 17.0, kind: "amberMoth", path: "hover", x: 250, y: -90 },
  { at: 18.0, kind: "amberMoth", path: "hover", x: 470, y: -90 },

  // 0:20.0: Spore Wisp flank pincer ambush (5 + 5 = 10 enemies)
  { at: 20.0, kind: "seedWisp", formation: "vee", count: 5, spacing: 32, path: "swoopL", x: 180, y: -40, reward: "aegis" },
  { at: 20.0, kind: "seedWisp", formation: "vee", count: 5, spacing: 32, path: "swoopR", x: 540, y: -40 },

  // 0:23.0 & 0:24.5: Root Guardian ancient ground nodes (1 + 1 = 2 enemies)
  { at: 23.0, kind: "rootGuardian", path: "ground", x: 220, y: -90 },
  { at: 24.5, kind: "rootGuardian", path: "ground", x: 500, y: -90 },

  // 0:26.0: Thorn Mantis predatory swarm (5 enemies)
  { at: 26.0, kind: "thornMantis", count: 5, spacing: 110, path: "dive", x: 360, y: -50 },

  // 0:29.0: Crimson Wing squadron (Roll refill) (7 enemies)
  { at: 29.0, kind: "kestrelRed", formation: "line", count: 7, spacing: 28, path: "sCurve", x: 360, y: -40, reward: "roll" },

  // 0:32.5: Spore Wisp dive charge (6 enemies)
  { at: 32.5, kind: "seedWisp", formation: "vee", count: 6, spacing: 34, path: "straight", x: 360, y: -40 },

  // 0:38.0: MIDBOSS: Hollow Stag (Runic Antler Stag)
  { at: 38.0, kind: "hollowStag", path: "hover", x: 360, y: -130 },

  // Post-Midboss High-Intensity Waves (31 normal enemies):
  // 0:50.0 & 0:51.5: Amber Moth spore behemoths (1 + 1 = 2 enemies)
  { at: 50.0, kind: "amberMoth", path: "hover", x: 220, y: -90 },
  { at: 51.5, kind: "amberMoth", path: "hover", x: 500, y: -90 },

  // 0:53.0: Root Guardian elder bastion (1 enemy)
  { at: 53.0, kind: "rootGuardian", path: "ground", x: 360, y: -90 },

  // 0:55.0: Crimson Wing high-speed squadron (POW upgrade) (8 enemies)
  { at: 55.0, kind: "kestrelRed", formation: "line", count: 8, spacing: 26, path: "sCurve", x: 360, y: -40, reward: "pow" },

  // 0:58.5: Thorn Mantis blitz rush (6 enemies)
  { at: 58.5, kind: "thornMantis", count: 6, spacing: 100, path: "dive", x: 360, y: -50 },

  // 0:62.0 & 0:64.5: Spore Wisp final weave waves (7 + 7 = 14 enemies)
  { at: 62.0, kind: "seedWisp", formation: "line", count: 7, spacing: 28, path: "swoopL", x: 180, y: -40 },
  { at: 64.5, kind: "seedWisp", formation: "line", count: 7, spacing: 28, path: "swoopR", x: 540, y: -40 },

  // Three new post-midboss waves; final boss delayed by 18s.
  { at: 69.0, kind: "seedWisp", formation: "vee", count: 7, spacing: 28, path: "swoopR", x: 570, y: -40 },
  { at: 75.0, kind: "rootGuardian", path: "ground", x: 360, y: -90 },
  { at: 81.0, kind: "thornMantis", formation: "line", count: 6, spacing: 75, path: "dive", x: 360, y: -50 },
  // 1:28 FINAL BOSS: Fate Weaver (Cosmic Rune Loom)
  { at: 88.0, kind: "fateWeaver", path: "hover", x: 360, y: -200 },
];
