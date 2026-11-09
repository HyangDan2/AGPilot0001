import { describe, expect, it } from "vitest";
import { halvardParallaxY } from "../src/render/backgrounds/halvard";

describe("True Halvard sprite-space parallax", () => {
  it("holds a stationary plate and gives each layer a different 10-second displacement", () => {
    const dy = (speed: number) =>
      halvardParallaxY(400, 800, speed, 6400) -
      halvardParallaxY(400, 0, speed, 6400);
    expect(dy(0)).toBe(0);
    expect(dy(30)).toBe(300);
    expect(dy(85)).toBe(850);
    expect(dy(180)).toBe(1800);
  });

  it("wraps sprites smoothly back above the viewport", () => {
    const y = halvardParallaxY(2500, 0, 180, 3600);
    expect(y).toBe(-1100);
    expect(halvardParallaxY(-900, 80, 0, 3600)).toBe(-900);
  });
});
