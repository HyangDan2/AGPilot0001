import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

async function main() {
  const outDir = path.resolve("docs/evidence");
  fs.mkdirSync(outDir, { recursive: true });

  // Spawn serve.mjs
  const server = spawn("node", ["scripts/serve.mjs"], {
    stdio: "inherit",
  });

  // Wait for server to come up
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    const browser = await chromium.launch();

    // 1. Mobile Portrait (390x844) - Title
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/");
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, "title-mobile-390x844.png") });
      await page.close();
    }

    // 2. Desktop HD (1440x900) - Title
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/");
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, "title-desktop-1440x900.png") });
      await page.close();
    }

    // 3. Mobile Combat (390x844) - Eira Arc Blade vs Monster Formations
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/?test=1");
      await page.click("#btn-start");
      await page.evaluate(() => {
        const hook = window.__testHook;
        hook.startWithSeed(42, 5); // 5s in, Gargoyles and Drakes engaged
      });
      await page.keyboard.down("Space");
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outDir, "combat-mobile-390x844.png") });
      await page.keyboard.up("Space");
      await page.close();
    }

    // 4. Desktop Combat (1440x900)
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/?test=1");
      await page.click("#btn-start");
      await page.evaluate(() => {
        const hook = window.__testHook;
        hook.startWithSeed(42, 10);
      });
      await page.keyboard.down("Space");
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outDir, "combat-desktop-1440x900.png") });
      await page.keyboard.up("Space");
      await page.close();
    }

    // 5. Eira Alternating Melee Slash (Cyan L->R and Gold R->L)
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/?test=1");
      await page.click("#btn-start");
      await page.evaluate(() => {
        const hook = window.__testHook;
        hook.startWithSeed(42, 5);
        const w = hook.getWorld();
        w.player.meleeSwing = {
          id: 777,
          direction: "r2l",
          tick: w.tick,
          duration: 4,
          hitEnemyIds: [],
        };
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, "melee-slash-mobile-390x844.png") });
      await page.close();
    }

    // 6. Eira Evasive Roll & Maneuver (390x844)
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/?test=1");
      await page.click("#btn-start");
      await page.evaluate(() => {
        const hook = window.__testHook;
        hook.startWithSeed(42, 6);
        const w = hook.getWorld();
        w.player.rollTimer = 36; // Mid-roll 360 barrel spin
        w.player.vx = -120; // Banking left
      });
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(outDir, "movement-eira-390x844.png") });
      await page.close();
    }

    // 6. Boss Battle (Abyssal Dragon Leviathan & Warning Banner)
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/?test=1");
      await page.click("#btn-start");
      await page.evaluate(() => {
        const hook = window.__testHook;
        hook.startWithSeed(42, 65); // 65s in, Leviathan dragon engaged
      });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outDir, "boss-mobile-390x844.png") });
      await page.close();
    }

    // 7. Tactical Pause Screen with HD2Lab & GameHub Platform Navigation
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/?test=1");
      await page.click("#btn-start");
      await page.waitForTimeout(400);
      await page.click("#btn-pause");
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, "pause-mobile-390x844.png") });
      await page.close();
    }

    // 8. Victory Screen (Skybreak Accomplished)
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/?test=1");
      await page.click("#btn-start");
      await page.evaluate(() => {
        const hook = window.__testHook;
        const w = hook.getWorld();
        w.score = 88500;
        w.stats.killed = 39;
        w.stats.spawned = 40;
        w.phase = "clearing";
        w.phaseTimer = 2;
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, "victory-mobile-390x844.png") });
      await page.close();
    }

    await browser.close();
    console.log("Evidence screenshots captured successfully in docs/evidence/");
  } finally {
    server.kill();
  }
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
