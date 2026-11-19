import { expect, test } from "@playwright/test";

interface BgmState {
  id: string | null;
  playing: boolean;
  position: number;
  paused: boolean;
}

interface BgmHookWindow {
  __testHook: { getBgmState: () => BgmState; getAudioAnalyser: () => AnalyserNode | null };
}

test.describe("Trailer BGM delivery and pause behaviour", () => {
  test("serves one looping trailer theme and no legacy tracks", async ({ page }) => {
    await page.goto("./");

    const manifest = await page.evaluate(
      async () =>
        (await fetch("./assets/audio.json")).json() as Promise<{
          formats: string[];
          sounds: Record<string, { kind: string; loop?: boolean }>;
        }>,
    );

    const bgmIds = Object.entries(manifest.sounds)
      .filter(([, sound]) => sound.kind === "bgm")
      .map(([id]) => id);
    expect(bgmIds).toEqual(["bgm_main"]);
    expect(manifest.sounds.bgm_main.loop).toBe(true);

    for (const ext of manifest.formats) {
      const res = await page.request.get(`./assets/audio/bgm_main.${ext}`);
      expect(res.status()).toBe(200);
      expect((await res.body()).length).toBeGreaterThan(1_000_000);
    }

    for (const legacy of ["bgm_title", "bgm_stage", "bgm_stage2", "bgm_stage3", "bgm_midboss", "bgm_boss"]) {
      for (const ext of ["ogg", "m4a"]) {
        const res = await page.request.get(`./assets/audio/${legacy}.${ext}`);
        expect(res.status(), `${legacy}.${ext} should no longer ship`).toBe(404);
      }
    }
  });

  test("pauses the theme in place and resumes from the same position", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("./?test=1");
    await page.locator("#btn-start").click();

    const bgm = () => page.evaluate(() => (window as unknown as BgmHookWindow).__testHook.getBgmState());
    // Peak deviation from the analyser's silence value (128): proves real samples,
    // not just a flag, are reaching the output while the theme plays.
    const analyserPeak = () =>
      page.evaluate(() => {
        const analyser = (window as unknown as BgmHookWindow).__testHook.getAudioAnalyser();
        if (!analyser) return 0;
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const value of data) peak = Math.max(peak, Math.abs(value - 128));
        return peak;
      });

    await expect.poll(async () => (await bgm()).playing, { timeout: 15000 }).toBe(true);

    // The theme opens with a soft fade, so let it open before trusting the level.
    await page.waitForTimeout(5000);
    expect(await analyserPeak()).toBeGreaterThan(4);

    const running = await bgm();
    expect(running.id).toBe("bgm_main");
    expect(running.paused).toBe(false);
    expect(running.position).toBeGreaterThan(1);

    await page.keyboard.press("Escape");
    await expect.poll(async () => (await bgm()).paused).toBe(true);
    const atPause = await bgm();
    expect(atPause.playing).toBe(false);

    await page.waitForTimeout(600);
    expect(await analyserPeak()).toBeLessThanOrEqual(1);
    await page.waitForTimeout(900);
    const stillPaused = await bgm();
    expect(Math.abs(stillPaused.position - atPause.position)).toBeLessThan(0.05);

    // The pause screen is the only way back: the loop stops sampling keys while paused.
    await page.locator("#btn-resume").click();
    await expect.poll(async () => (await bgm()).paused).toBe(false);
    const resumed = await bgm();
    expect(resumed.playing).toBe(true);
    // It continues from the pause point: nothing rewinds to the start of the track.
    expect(resumed.position).toBeGreaterThan(atPause.position - 0.3);

    // And it advances in real time again once resumed.
    const firstAt = Date.now();
    const firstPosition = resumed.position;
    await page.waitForTimeout(900);
    const later = await bgm();
    const wall = (Date.now() - firstAt) / 1000;
    expect(later.position - firstPosition).toBeGreaterThan(wall - 0.4);
    expect(later.position - firstPosition).toBeLessThan(wall + 0.4);
  });
});
