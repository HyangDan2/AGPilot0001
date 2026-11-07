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

    // 0. Halvard Celestial Departure Altar (Norse Rune Altar with Wing Statues & Marble Columns)
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/?test=1");
      await page.click("#btn-start");
      await page.evaluate(() => {
        const hook = window.__testHook;
        const w = hook.getWorld();
        w.stageTick = 40;
        w.scrollY = 30;
      });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, "departure-altar-mobile-390x844.png") });
      await page.close();
    }

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

      // 7.1 Confirm Return Modal
      await page.click("#btn-main-menu");
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, "confirm-modal-mobile-390x844.png") });
      await page.close();
    }

    // 8. Stage 1 Clear Screen (Transition to Stage 2 Ragnarok Rift)
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/?test=1");
      await page.click("#btn-start");
      await page.evaluate(() => {
        const hook = window.__testHook;
        const w = hook.getWorld();
        w.currentStage = 1;
        w.score = 65000;
        w.phase = "clearing";
        w.phaseTimer = 2;
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, "stageclear-mobile-390x844.png") });
      await page.close();
    }

    // 8.5 Stage 2 Combat (Ragnarok Rift Obsidian & Violet Void with Shattered Shards)
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/?test=1");
      await page.click("#btn-start");
      await page.evaluate(() => {
        const hook = window.__testHook;
        const w = hook.getWorld();
        w.currentStage = 2;
        w.stageTick = 800;
        w.player.orbitSwords = { active: true, angle: 0.8 };
        w.player.mana = 90;
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, "stage2-combat-mobile-390x844.png") });
      await page.close();
    }

    // 9. Victory Screen (Ragnarok Transcended)
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/?test=1");
      await page.click("#btn-start");
      await page.evaluate(() => {
        const hook = window.__testHook;
        const w = hook.getWorld();
        w.currentStage = 2;
        w.score = 158500;
        w.stats.killed = 68;
        w.stats.spawned = 70;
        w.phase = "clearing";
        w.phaseTimer = 2;
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, "victory-mobile-390x844.png") });
      await page.close();
    }

    // 9. Gungnir's Judgement Ultimate Beam & Orbiting Aegis Swords (390x844)
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/?test=1");
      await page.click("#btn-start");
      await page.evaluate(() => {
        const hook = window.__testHook;
        hook.startWithSeed(42, 10);
        const w = hook.getWorld();
        w.player.ultimateTimer = 45; // mid-blast
        w.player.mana = 100;
        w.player.grazeCount = 14;
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, "ultimate-mobile-390x844.png") });
      await page.close();
    }

    // 10. Destructible Azure Aegis Orbs (One alive orb orbiting after single bullet hit)
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/?test=1");
      await page.click("#btn-start");
      await page.evaluate(() => {
        const hook = window.__testHook;
        hook.startWithSeed(42, 8);
        const w = hook.getWorld();
        if (w.player.aegisOrbs && w.player.aegisOrbs.length > 1) {
          w.player.aegisOrbs[0].alive = false; // Destroy 1st orb
          w.player.aegisOrbs[1].alive = true; // 2nd orb active
        }
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, "aegis-orb-mobile-390x844.png") });
      await page.close();
    }

    // 11. Progressive 3-Lane Arc Blade Power-Up with HUD Indicators
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto("http://127.0.0.1:4173/AGPilot0001/?test=1");
      await page.click("#btn-start");
      await page.evaluate(() => {
        const hook = window.__testHook;
        hook.startWithSeed(42, 6);
        const w = hook.getWorld();
        w.player.power = 3;
        w.player.lanePower = { center: 2.5, left: 2.0, right: 1.5, nextLane: "center" };
      });
      await page.keyboard.down("Space");
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, "lane-power-mobile-390x844.png") });
      await page.keyboard.up("Space");
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
