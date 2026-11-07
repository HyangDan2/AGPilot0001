import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function main() {
  const manifestPath = path.resolve("public/assets/audio.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("FAIL: public/assets/audio.json does not exist");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  if (!manifest.version || !Array.isArray(manifest.formats) || !manifest.sounds) {
    console.error("FAIL: Invalid audio.json schema");
    process.exit(1);
  }

  const requiredIds = [
    "bgm_title",
    "bgm_stage",
    "bgm_stage2",
    "bgm_stage3",
    "bgm_midboss",
    "bgm_boss",
    "jingle_clear",
    "jingle_gameover",
    "sfx_shot1",
    "sfx_shot2",
    "sfx_shot3",
    "sfx_explode_s",
    "sfx_explode_m",
    "sfx_explode_l",
    "sfx_explode_boss",
    "sfx_pickup",
    "sfx_roll",
    "sfx_warning",
  ];

  const report = {
    timestamp: new Date().toISOString(),
    checked: 0,
    totalBytes: 0,
    tracks: {},
  };

  let hasError = false;

  for (const id of requiredIds) {
    const sound = manifest.sounds[id];
    if (!sound) {
      console.error(`FAIL: Missing sound ID in manifest: ${id}`);
      hasError = true;
      continue;
    }

    for (const fmt of manifest.formats) {
      const filePath = path.resolve(`public/${sound.base}.${fmt}`);
      if (!fs.existsSync(filePath)) {
        console.error(`FAIL: Missing audio file: ${filePath}`);
        hasError = true;
        continue;
      }

      const stat = fs.statSync(filePath);
      report.totalBytes += stat.size;

      // Validate with ffprobe
      try {
        const probeOut = execSync(
          `ffprobe -v error -show_entries format=duration,bit_rate -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
          { encoding: "utf-8" },
        ).trim().split("\n");

        const duration = parseFloat(probeOut[0]);
        if (isNaN(duration) || duration <= 0) {
          console.error(`FAIL: Invalid duration for ${filePath}: ${duration}`);
          hasError = true;
        }

        report.tracks[`${id}.${fmt}`] = {
          bytes: stat.size,
          duration,
        };
        report.checked++;
      } catch (err) {
        console.error(`FAIL: ffprobe failed to decode ${filePath}:`, err.message);
        hasError = true;
      }
    }
  }

  const maxAudioBudget = 4.5 * 1024 * 1024; // 4.5 MB budget
  if (report.totalBytes > maxAudioBudget) {
    console.error(`FAIL: Audio budget exceeded: ${(report.totalBytes / 1024 / 1024).toFixed(2)} MB > 4.5 MB`);
    hasError = true;
  }

  fs.mkdirSync(path.resolve("test-results"), { recursive: true });
  fs.writeFileSync(path.resolve("test-results/audio-report.json"), JSON.stringify(report, null, 2));

  if (hasError) {
    console.error("audio:check FAILED");
    process.exit(1);
  }

  console.log(`audio:check PASSED — ${report.checked} files validated, total ${(report.totalBytes / 1024 / 1024).toFixed(2)} MB`);
}

main();
