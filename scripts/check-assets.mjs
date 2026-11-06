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
    report.sprites[id] = sp;
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
