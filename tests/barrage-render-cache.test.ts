import { describe,expect,it } from "vitest";
import {readFileSync} from "node:fs";
const src=readFileSync(new URL("../src/render/renderer.ts",import.meta.url),"utf8");
describe("Enemy projectile hot-path is pre-rendered",()=>{
  it("caches white-center/red-outline orb once instead of repeating shadows per enemy bullet",()=>{
    expect(src).toContain("private getEnemyBulletCache()");
    expect(src).toContain("this.enemyBulletCache = canvas");
    expect(src).toContain("ctx.drawImage(enemyBulletCache, b.x - size / 2");
    expect(src).toContain("const factor = b.r / 6");
  });
});