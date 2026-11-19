import { STAGE1_WAVES, WaveDef } from "./stage1";
import { STAGE2_WAVES } from "./stage2";
import { STAGE3_WAVES } from "./stage3";
import { EnemyKind } from "./types";

export interface StageDefinition {
  id: 1 | 2 | 3;
  name: string;
  subtitle: string;
  speedMultiplier: number;
  waves: WaveDef[];
  midboss: EnemyKind;
  boss: EnemyKind;
}

export const STAGE_DEFS: Record<1 | 2 | 3, StageDefinition> = {
  1: {
    id: 1,
    name: "STAGE 01",
    subtitle: "HALVARD",
    speedMultiplier: 1.0,
    waves: STAGE1_WAVES,
    midboss: "albatross",
    boss: "celestialGuardian",
  },
  2: {
    id: 2,
    name: "STAGE 02",
    subtitle: "RAGNAROK RIFT",
    speedMultiplier: 1.2,
    waves: STAGE2_WAVES,
    midboss: "kraken",
    boss: "leviathan",
  },
  3: {
    id: 3,
    name: "STAGE 03",
    subtitle: "YGGDRASIL HEART",
    speedMultiplier: 1.44,
    waves: STAGE3_WAVES,
    midboss: "hollowStag",
    boss: "fateWeaver",
  },
};

export function getStageDef(stage: number): StageDefinition {
  if (stage === 2) return STAGE_DEFS[2];
  if (stage === 3) return STAGE_DEFS[3];
  return STAGE_DEFS[1];
}
