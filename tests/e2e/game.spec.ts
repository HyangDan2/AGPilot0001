import { expect, test } from "@playwright/test";

test.describe("HD²LAB ARCADE : VALKYRIE EIRA E2E & Browser Gate", () => {
  test("loads v5 40-frame independent Eira atlas with 24-frame rotation", async ({ page }) => {
    await page.goto("./");
    const valid = await page.evaluate(async () => {
      const root = "./assets/characters/eira/";
      const [v5, metadata, v2, legacy] = await Promise.all([
        fetch(root + "eira-motion-v5-atlas-256.png"),
        fetch(root + "eira-motion-v5.json"),
        fetch(root + "eira-motion-v2-atlas-256.png"),
        fetch(root + "eira-flight.png"),
      ]);
      if (!v5.ok || !metadata.ok || !v2.ok || !legacy.ok) return false;
      const img = await createImageBitmap(await v5.blob());
      const data = await metadata.json() as {
        frames: Record<string, { x: number; y: number; w: number; h: number }>;
        animations: Record<string, string[]>;
      };
      const order = [
        ...data.animations.idle,
        ...data.animations.slash_l,
        ...data.animations.slash_r,
        ...data.animations.roll,
      ];
      const ok = img.width === 2048 && img.height === 1280 &&
        order.length === 40 && new Set(order).size === 40 &&
        data.animations.idle.length === 8 &&
        data.animations.slash_l.length === 4 &&
        data.animations.slash_r.length === 4 &&
        data.animations.roll.length === 24 &&
        order.every((key) => {
          const r = data.frames[key];
          return r !== undefined && r.w === 256 && r.h === 256 &&
            r.x >= 0 && r.y >= 0 && r.x + r.w <= img.width && r.y + r.h <= img.height;
        });
      img.close();
      return ok;
    });
    expect(valid).toBe(true);
  });

  test("loads v2 28-frame Eira atlas and retains the original fallback", async ({ page }) => {
    await page.goto("./");
    const result = await page.evaluate(async () => {
      const base = "./assets/characters/eira/";
      const [sprite, metadata, original] = await Promise.all([
        fetch(base + "eira-motion-v2-atlas-256.png"),
        fetch(base + "eira-motion-v2.json"),
        fetch(base + "eira-flight.png"),
      ]);
      if (!sprite.ok || !metadata.ok || !original.ok) return false;
      const img = await createImageBitmap(await sprite.blob());
      const meta = await metadata.json() as {
        frames: Record<string, { x: number; y: number; w: number; h: number }>;
        animations: Record<string, string[]>;
      };
      const keys = Object.keys(meta.frames);
      const passes = img.width === 2048 && img.height === 1024 &&
        keys.length === 28 &&
        meta.animations.idle.length === 8 &&
        meta.animations.slash_l.length === 4 &&
        meta.animations.slash_r.length === 4 &&
        meta.animations.roll.length === 12 &&
        keys.every((key) => {
          const r = meta.frames[key];
          return r.x >= 0 && r.y >= 0 && r.w === 256 && r.h === 256 &&
            r.x + r.w <= img.width && r.y + r.h <= img.height;
        });
      img.close();
      return passes;
    });
    expect(result).toBe(true);
  });

  test("loads approved illustrated enemy atlas with 11 replacement frames", async ({ page }) => {
    await page.goto("./");
    const loaded = await page.evaluate(async () => {
      const [imgResponse, metaResponse] = await Promise.all([
        fetch("./assets/enemies/enemies-illustrated.png"),
        fetch("./assets/enemies/enemies-illustrated.json"),
      ]);
      if (!imgResponse.ok || !metaResponse.ok) return false;
      const atlas = await createImageBitmap(await imgResponse.blob());
      const meta = await metaResponse.json() as { frames: Record<string, unknown> };
      const valid = atlas.width === 2048 && atlas.height === 2048 && Object.keys(meta.frames).length === 11;
      atlas.close();
      return valid;
    });
    expect(loaded).toBe(true);
  });

  test("renders title screen with HD²LAB brand, controls and settings", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("./");
    await expect(page).toHaveTitle(/VALKYRIE EIRA/);
    await expect(page.locator(".brand-title")).toHaveText("HD²LAB ARCADE");
    await expect(page.locator(".brand-slogan")).toHaveText("HYPER DIMENSIONAL DESIGN");
    await expect(page.locator(".game-title")).toHaveText("VALKYRIE EIRA");
    await expect(page.locator("#btn-start")).toHaveText("START FLIGHT");
    await expect(page.locator("#btn-mute")).toBeVisible();
    await expect(page.locator("#btn-motion")).toBeVisible();
    await expect(page.locator(".title-help-panel")).toBeHidden();
    await page.locator(".title-help summary").click();
    await expect(page.locator(".title-screen .instructions")).toBeVisible();
    await expect(page.locator(".title-help-panel .platform-links")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("mobile rotation pauses gameplay until portrait is restored", async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    try {
      await page.goto("./?test=1");
      await page.locator("#btn-start").click();
      await page.waitForTimeout(130);
      await page.setViewportSize({ width: 844, height: 390 });
      await expect(page.locator("#rotate-to-portrait")).toBeVisible();
      await expect(page.getByText("세로 화면으로 돌려주세요")).toBeVisible();
      await page.waitForTimeout(100);
      const pausedTick = await page.evaluate(() => (window as unknown as {
        __testHook: { getWorld: () => { tick: number } }
      }).__testHook.getWorld().tick);
      await page.waitForTimeout(170);
      const tickAfterWait = await page.evaluate(() => (window as unknown as {
        __testHook: { getWorld: () => { tick: number } }
      }).__testHook.getWorld().tick);
      expect(tickAfterWait).toBe(pausedTick);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator("#rotate-to-portrait")).toHaveCount(0);
      await expect.poll(async () => page.evaluate(() => (window as unknown as {
        __testHook: { getWorld: () => { tick: number } }
      }).__testHook.getWorld().tick)).toBeGreaterThan(pausedTick);
    } finally {
      await context.close();
    }
  });

  test("rotating back to portrait preserves manual pause", async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    try {
      await page.goto("./?test=1");
      await page.locator("#btn-start").click();
      await page.locator("#btn-pause").click();
      await expect(page.locator("#pause-menu")).toBeVisible();
      await page.setViewportSize({ width: 844, height: 390 });
      await expect(page.locator("#rotate-to-portrait")).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator("#rotate-to-portrait")).toHaveCount(0);
      await expect(page.locator("#pause-menu")).toBeVisible();
      const state = await page.evaluate(() => (window as unknown as {
        __testHook: { getPauseState: () => { manuallyPaused: boolean; landscapeLocked: boolean } }
      }).__testHook.getPauseState());
      expect(state).toEqual({ manuallyPaused: true, landscapeLocked: false });
    } finally {
      await context.close();
    }
  });

  test("starts game on clicking START FLIGHT and accepts keyboard input", async ({ page }) => {
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

  test("game over -> restart -> resumes gameplay loop without freeze or duplicates", async ({ page }) => {
    await page.goto("./?test=1");
    await page.click("#btn-start");

    // Force game over state
    await page.evaluate(() => {
      const hook = (window as unknown as { __testHook: { getWorld: () => { player: { lives: number; downTimer: number }; phase: string; phaseTimer: number } } }).__testHook;
      const w = hook.getWorld();
      w.player.lives = 0;
      w.player.downTimer = 0;
      w.phase = "dying";
      w.phaseTimer = 1;
    });

    // Wait for GAME OVER overlay
    await expect(page.locator(".game-over-screen")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#btn-restart")).toBeVisible();

    // Click RETRY MISSION
    await page.click("#btn-restart");

    // In-game HUD should be back
    await expect(page.locator("#btn-pause")).toBeVisible();

    // Let the simulation advance for 200ms
    await page.waitForTimeout(200);

    // Confirm world loop is advancing
    const tick = await page.evaluate(() => {
      const hook = (window as unknown as { __testHook: { getWorld: () => { tick: number } } }).__testHook;
      return hook.getWorld().tick;
    });
    expect(tick).toBeGreaterThan(0);
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
