import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const root=join(process.cwd(),"public/assets/backgrounds");
describe("Stage 2/3 independently scrolling backdrop",()=>{
  for(const [folder,stage,speeds] of [
    ["ragnarok-v1",2,[35,90,190]],["yggdrasil-v1",3,[25,75,165]]
  ] as const){
    it("builds four raster layers and independent actor manifests for "+folder,()=>{
      const m=JSON.parse(readFileSync(join(root,folder,"manifest.json"),"utf8"));
      expect(m.stage).toBe(stage);
      expect(m.gameDimensions).toEqual([720,1280]);
      expect(["base","islands","temples","clouds"].every(k=>m.layers[k]?.image)).toBe(true);
      expect(["islands","temples","clouds"].map(k=>m.layers[k].speed)).toEqual(speeds);
      expect(["islands","temples","clouds"].map(k=>m.layers[k].instances.length)).toEqual([6,6,10]);
      for(const kind of ["base","islands","temples","clouds"]){
        const b=readFileSync(join(root,folder,kind+".webp"));
        expect(b.toString("ascii",0,4)).toBe("RIFF");
        expect(b.toString("ascii",8,12)).toBe("WEBP");
      }
    });
  }
});
