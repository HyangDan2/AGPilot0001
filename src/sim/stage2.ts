import { WaveDef } from "./stage1";

/**
 * Stage 02 — RAGNAROK RIFT
 * Shattered Bifrost, dark violet storms, obsidian citadels, and the Abyssal Dragon.
 * Normal enemies: exactly 70 enemies (53 * 1.33 ≈ 70).
 * Bullet speed: 1.2x.
 */
export const STAGE2_WAVES: WaveDef[] = [
  // 0:02.0: Abyssal Phantom V-formation (5 enemies)
  { at: 2.0, kind: "siren", formation: "vee", count: 5, spacing: 38, path: "straight", x: 360, y: -40 },

  // 0:05.0 & 0:06.5: Shadow Drake cross-swoop interceptors (4 + 4 = 8 enemies)
  { at: 5.0, kind: "seraph", formation: "line", count: 4, spacing: 28, path: "swoopL", x: 140, y: -40 },
  { at: 6.5, kind: "seraph", formation: "line", count: 4, spacing: 28, path: "swoopR", x: 580, y: -40 },

  // 0:09.5 & 0:11.5: Mana Storm Elite diving vanguards (3 + 3 = 6 enemies)
  { at: 9.5, kind: "harrier", count: 3, spacing: 140, path: "dive", x: 260, y: -50 },
  { at: 11.5, kind: "harrier", count: 3, spacing: 140, path: "dive", x: 460, y: -50 },

  // 0:14.0: Shadow Drake elite squadron (POW reward) (6 enemies)
  { at: 14.0, kind: "kestrelRed", formation: "line", count: 6, spacing: 30, path: "sCurve", x: 360, y: -40, reward: "pow" },

  // 0:17.5 & 0:18.5: Obsidian Golem floating bastions (1 + 1 = 2 enemies)
  { at: 17.5, kind: "golem", path: "hover", x: 240, y: -90 },
  { at: 18.5, kind: "golem", path: "hover", x: 480, y: -90 },

  // 0:20.0: Abyssal Phantom flank ambush (4 + 4 = 8 enemies)
  { at: 20.0, kind: "siren", formation: "vee", count: 4, spacing: 34, path: "swoopL", x: 180, y: -40, reward: "aegis" },
  { at: 20.0, kind: "siren", formation: "vee", count: 4, spacing: 34, path: "swoopR", x: 540, y: -40 },

  // 0:23.0: Mana Storm Elites (4 enemies)
  { at: 23.0, kind: "harrier", count: 4, spacing: 120, path: "dive", x: 360, y: -50 },

  // 0:26.0: Obsidian Golem ground turrets (1 + 1 = 2 enemies)
  { at: 26.0, kind: "gunboat", path: "ground", x: 220, y: -90 },
  { at: 26.0, kind: "gunboat", path: "ground", x: 500, y: -90 },

  // 0:28.0: Shadow Drake elite squadron (Roll reward) (6 enemies)
  { at: 28.0, kind: "kestrelRed", formation: "line", count: 6, spacing: 30, path: "sCurve", x: 360, y: -40, reward: "roll" },

  // 0:31.0: Abyssal Phantom dive swarm (5 enemies)
  { at: 31.0, kind: "siren", formation: "vee", count: 5, spacing: 36, path: "straight", x: 360, y: -40 },

  // 0:35.0: MIDBOSS: Abyssal Sentinel (Kraken / Sentinel core)
  { at: 35.0, kind: "kraken", path: "hover", x: 360, y: -130 },

  // Post-Midboss High-Intensity Waves:
  // 0:48.0: Obsidian Golem armored behemoths (2 enemies)
  { at: 48.0, kind: "condor", path: "hover", x: 220, y: -90 },
  { at: 49.5, kind: "condor", path: "hover", x: 500, y: -90 },

  // 0:51.0: Shadow Drake high-speed wing (6 enemies, POW reward)
  { at: 51.5, kind: "kestrelRed", formation: "line", count: 6, spacing: 30, path: "sCurve", x: 360, y: -40, reward: "pow" },

  // 0:54.0: Mana Storm Elites cross-dive (4 enemies)
  { at: 54.0, kind: "harrier", count: 4, spacing: 110, path: "dive", x: 360, y: -50 },

  // 0:57.0: Abyssal Phantom final charge (6 enemies)
  { at: 57.0, kind: "siren", formation: "line", count: 6, spacing: 28, path: "sCurve", x: 360, y: -40 },

  // Three new post-midboss waves; final boss delayed by 18s.
  { at: 62.5, kind: "seraph", formation: "line", count: 5, spacing: 30, path: "swoopR", x: 560, y: -40 },
  { at: 68.5, kind: "golem", path: "ground", x: 360, y: -90 },
  { at: 74.5, kind: "siren", formation: "vee", count: 6, spacing: 36, path: "sCurve", x: 360, y: -40 },
  // 1:22 FINAL BOSS: Leviathan (Abyssal Sky Dragon)
  { at: 82.0, kind: "leviathan", path: "hover", x: 360, y: -200 },
];
