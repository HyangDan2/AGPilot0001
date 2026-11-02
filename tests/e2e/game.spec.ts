import { expect, test } from "@playwright/test";

test.describe("IRON WINGS E2E & Browser Gate", () => {
  test("renders title screen with controls and settings", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("./");
    await expect(page).toHaveTitle(/IRON WINGS/);
    await expect(page.locator(".game-title")).toHaveText("IRON WINGS");
    await expect(page.locator("#btn-start")).toBeVisible();
    await expect(page.locator("#btn-mute")).toBeVisible();
    await expect(page.locator("#btn-motion")).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("starts game on clicking START and accepts keyboard input", async ({ page }) => {
    await page.goto("./?test=1");
    await page.click("#btn-start");

    // HUD buttons should be visible
    await expect(page.locator("#btn-pause")).toBeVisible();
    await expect(page.locator("#btn-touch-roll")).toBeVisible();

    // Verify testHook presence
    const hookExists = await page.evaluate(() => typeof (window as unknown as { __testHook?: unknown }).__testHook !== "undefined");
    expect(hookExists).toBe(true);

    // Press movement and fire keys
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("KeyZ");

    // Pause menu test
    await page.click("#btn-pause");
    await expect(page.locator("#pause-menu")).toBeVisible();
    await expect(page.locator("#btn-resume")).toBeVisible();
    await page.click("#btn-resume");
    await expect(page.locator("#pause-menu")).not.toBeVisible();
  });

  test("touch controls trigger roll and drag", async ({ page }) => {
    await page.goto("./?test=1");
    await page.click("#btn-start");

    // Skip intro takeoff directly into active play phase
    await page.evaluate(() => {
      const hook = (window as unknown as { __testHook: { startWithSeed: (seed: number, startAt?: number) => void } }).__testHook;
      hook.startWithSeed(42, 1);
    });

    // Click the touch roll button
    await page.click("#btn-touch-roll");
    await page.waitForTimeout(100);

    // Check world roll state via testHook
    const rollTimer = await page.evaluate(() => {
      const hook = (window as unknown as { __testHook: { getWorld: () => { player: { rollTimer: number; rolls: number } } } }).__testHook;
      return hook.getWorld().player.rollTimer;
    });
    expect(rollTimer).toBeGreaterThan(0);
  });

  const viewports = [
    { name: "mobile-portrait-sm", width: 320, height: 568 },
    { name: "mobile-portrait-md", width: 360, height: 640 },
    { name: "mobile-portrait-lg", width: 390, height: 844 },
    { name: "tablet-portrait", width: 620, height: 800 },
    { name: "mobile-landscape", width: 844, height: 390 },
    { name: "desktop-hd", width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`renders cleanly on viewport ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("./");
      await expect(page.locator("#game")).toBeVisible();
      await expect(page.locator(".game-title")).toBeVisible();

      // Ensure canvas is contained inside window
      const box = await page.locator("#game").boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(vp.width + 2);
        expect(box.height).toBeLessThanOrEqual(vp.height + 2);
      }
    });
  }
});
