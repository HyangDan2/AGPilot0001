import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const manifest = JSON.parse(fs.readFileSync(
  path.resolve("public/assets/fx/eira-slash-v1.json"), "utf8",
));

describe("Eira slash-only transparent frame contract", () => {
  it("provides two attack directions, two render layers and eight simulation-matched frames", () => {
    expect(manifest.framesPerSequence).toBe(8);
    expect(manifest.simulationTicksPerSwing).toBe(8);
    expect(manifest.width).toBe(2048);
    expect(manifest.height).toBe(1024);
    expect(manifest.cellWidth).toBe(256);
    expect(manifest.cellHeight).toBe(256);
    expect(manifest.rows).toEqual({
      l2r_back: 0, r2l_back: 1, l2r_front: 2, r2l_front: 3,
    });
  });

  it("keeps the independently generated slash outside Eira's character atlas", () => {
    expect(manifest.image).toBe("assets/fx/eira-slash-v1.png");
    expect(manifest.generatedBy).toBe("scripts/generate-slash-fx.mjs");
    expect(manifest.animation.l2r).toEqual(["l2r_back", "l2r_front"]);
    expect(manifest.animation.r2l).toEqual(["r2l_back", "r2l_front"]);
  });
});
