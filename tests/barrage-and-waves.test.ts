import { describe, expect, it } from "vitest";
import { createWorld } from "../src/sim/world";
import { fireEnemyBullet } from "../src/sim/patterns";
import { STAGE1_WAVES } from "../src/sim/stage1";
import { STAGE2_WAVES } from "../src/sim/stage2";
import { STAGE3_WAVES } from "../src/sim/stage3";
describe("Double hostile bullet density and post-midboss extension", () => {
  it("doubles every hostile shot across all stages, without changing speed", () => {
    for(const stage of [1,2,3] as const){
      const w=createWorld({ seed:444, startStage:stage });
      fireEnemyBullet(w,340,180,240,true);
      expect(w.bullets).toHaveLength(2);
      expect(w.bullets[0].vx).not.toBe(w.bullets[1].vx);
      expect(Math.hypot(w.bullets[0].vx,w.bullets[0].vy)).toBeCloseTo(Math.hypot(w.bullets[1].vx,w.bullets[1].vy));
    }
  });
  it("adds exactly three waves between each old boss time and the new one", () => {
    for(const [waves,first,second,third,newBoss] of [[STAGE1_WAVES,62.5,68.5,74.5,82],[STAGE2_WAVES,62.5,68.5,74.5,82],[STAGE3_WAVES,69,75,81,88]] as const){
      expect(waves.filter(w=>w.at===first||w.at===second||w.at===third)).toHaveLength(3);
      expect(waves[waves.length-1].at).toBe(newBoss);
    }
  });
});