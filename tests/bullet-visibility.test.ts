import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../src/render/renderer.ts", import.meta.url), "utf8");

describe("Eira projectile visibility against Halvard v3 artwork", () => {
  it("renders all foreground cloud variants before gameplay bullets and Eira", () => {
    const render = source.slice(
      source.indexOf("  public render(world: World): void {"),
      source.indexOf("  private drawHalvardSkySea(", source.indexOf("  public render(world: World): void {")),
    );
    expect(render).toContain("this.halvardV3.drawFront(ctx, world.scrollY)");
    expect(render).toContain("this.drawHalvardForegroundFog(world.scrollY)");
    expect(render).toContain("this.drawHighCloudsAndDebris(world.scrollY, world.stageTick)");
    const front = render.indexOf("this.halvardV3.drawFront(ctx, world.scrollY)");
    const bullets = render.indexOf("this.drawBullets(world)");
    const player = render.indexOf("this.drawPlayer(world.player, world.tick)");
    expect(front).toBeGreaterThan(0);
    expect(front).toBeLessThan(bullets);
    expect(bullets).toBeLessThan(player);
    expect(render.match(/this\.halvardV3\.drawFront\(ctx, world\.scrollY\)/g)).toHaveLength(1);
  });

  it("retains the original arc-blade shape, removes the added tail, and uses deeper blue", () => {
    const bulletMethod = source.slice(
      source.indexOf("  private drawBullets(world: World): void {"),
      source.indexOf("  private drawPickup(", source.indexOf("  private drawBullets(world: World): void {")),
    );
    expect(bulletMethod).toContain('ctx.moveTo(-11, 4)');
    expect(bulletMethod).toContain('ctx.quadraticCurveTo(0, -18, 11, 4)');
    expect(bulletMethod).toContain('glowColor = "#0757d3"');
    expect(bulletMethod).toContain('strokeColor = "#1467e8"');
    expect(bulletMethod).toContain('ctx.fillStyle = fillColor');
    expect(bulletMethod).toContain('ctx.strokeStyle = strokeColor');
    expect(bulletMethod).not.toContain('ctx.lineTo(0, 29)');
    expect(bulletMethod).not.toContain('ctx.strokeStyle = "#12264d"');
    expect(bulletMethod).not.toContain('ctx.lineWidth = 8');
  });
});
