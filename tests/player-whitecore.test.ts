import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../src/render/renderer.ts",import.meta.url),"utf8");
describe("approved Eira ImageGen white-core overlay",()=>{
  it("preserves original projectile contour and overlays the illustrated glint",()=>{
    const bullet=source.slice(source.indexOf("  private drawBullets("),source.indexOf("  private drawPickup("));
    expect(bullet).toContain("ctx.moveTo(-11, 4)");
    expect(bullet).toContain("ctx.quadraticCurveTo(0, -18, 11, 4)");
    expect(bullet).toContain("this.playerBulletWhiteCoreImg");
    expect(bullet).toContain('ctx.globalCompositeOperation = "screen"');
    expect(bullet).toContain('ctx.clip()');
  });
});