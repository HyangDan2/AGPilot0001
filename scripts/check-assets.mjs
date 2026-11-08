import fs from "node:fs";
import path from "node:path";

function main() {
  const manifestPath = path.resolve("public/assets/sprites.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("FAIL: public/assets/sprites.json does not exist");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  if (!manifest.version || !manifest.sprites || !manifest.branding) {
    console.error("FAIL: Invalid sprites.json schema");
    process.exit(1);
  }

  const report = {
    timestamp: new Date().toISOString(),
    checked: 0,
    totalBytes: 0,
    branding: {},
    sprites: {},
  };

  let hasError = false;

  // Check branding assets
  for (const [key, relPath] of Object.entries(manifest.branding)) {
    const fullPath = path.resolve("public", relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`FAIL: Missing branding asset: ${relPath}`);
      hasError = true;
      continue;
    }
    const stat = fs.statSync(fullPath);
    report.totalBytes += stat.size;
    report.branding[key] = { path: relPath, bytes: stat.size };
    report.checked++;
  }

  // Check sprites schema
  const requiredSprites = [
    "player",
    "kestrel",
    "kestrelRed",
    "harrier",
    "condor",
    "gunboat",
    "albatross",
    "leviathan",
  ];

  for (const id of requiredSprites) {
    const sp = manifest.sprites[id];
    if (!sp || !sp.drawW || !sp.drawH) {
      console.error(`FAIL: Invalid or missing sprite definition for ${id}`);
      hasError = true;
      continue;
    }
    if (sp.src) {
      const spPath = path.resolve("public", sp.src);
      if (!fs.existsSync(spPath)) {
        console.error(`FAIL: Missing sprite file for ${id}: ${sp.src}`);
        hasError = true;
        continue;
      }
      const st = fs.statSync(spPath);
      report.totalBytes += st.size;
      report.checked++;
    }
    report.sprites[id] = sp;
  }

  // The 11 replacement sprites are bundled in a separate approved atlas.
  // Reject a missing/wrong-size atlas so deployment cannot silently show SVGs.
  const illustratedPath = path.resolve("public/assets/enemies/enemies-illustrated.png");
  const illustratedMeta = path.resolve("public/assets/enemies/enemies-illustrated.json");
  if (!fs.existsSync(illustratedPath) || !fs.existsSync(illustratedMeta)) {
    console.error("FAIL: Missing approved illustrated enemy atlas or metadata");
    hasError = true;
  } else {
    const png = fs.readFileSync(illustratedPath);
    const signature = "89504e470d0a1a0a";
    if (png.subarray(0, 8).toString("hex") !== signature ||
        png.readUInt32BE(16) !== 2048 || png.readUInt32BE(20) !== 2048) {
      console.error("FAIL: Invalid illustrated enemy atlas PNG dimensions");
      hasError = true;
    }
    const artMeta = JSON.parse(fs.readFileSync(illustratedMeta, "utf8"));
    if (Object.keys(artMeta.frames ?? {}).length !== 11) {
      console.error("FAIL: Expected 11 illustrated enemies");
      hasError = true;
    }
    report.totalBytes += png.length;
    report.checked++;
  }

  const maxImageBudget = 6.0 * 1024 * 1024; // 6 MB
  if (report.totalBytes > maxImageBudget) {
    console.error(`FAIL: Asset budget exceeded: ${(report.totalBytes / 1024 / 1024).toFixed(2)} MB > 6.0 MB`);
    hasError = true;
  }

  fs.mkdirSync(path.resolve("test-results"), { recursive: true });
  fs.writeFileSync(path.resolve("test-results/asset-report.json"), JSON.stringify(report, null, 2));

  if (hasError) {
    console.error("assets:check FAILED");
    process.exit(1);
  }

  console.log(`assets:check PASSED — ${report.checked} items validated, total ${(report.totalBytes / 1024 / 1024).toFixed(2)} MB`);
}

main();
