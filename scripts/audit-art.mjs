import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

function getFileHash(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

// Compute simple 8x8 difference hash (dHash) for perceptual similarity
async function getPerceptualHash(filePath) {
  try {
    const { data } = await sharp(filePath)
      .resize(9, 8, { fit: "fill" })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let hash = "";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = data[row * 9 + col];
        const right = data[row * 9 + col + 1];
        hash += left < right ? "1" : "0";
      }
    }
    return hash;
  } catch {
    return null;
  }
}

function hammingDistance(h1, h2) {
  if (!h1 || !h2 || h1.length !== h2.length) return 64;
  let dist = 0;
  for (let i = 0; i < h1.length; i++) {
    if (h1[i] !== h2[i]) dist++;
  }
  return dist;
}

async function analyzePalette(filePath) {
  try {
    const { data } = await sharp(filePath)
      .resize(64, 64, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let rSum = 0, gSum = 0, bSum = 0, opaqueCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 64) {
        rSum += data[i];
        gSum += data[i + 1];
        bSum += data[i + 2];
        opaqueCount++;
      }
    }

    if (opaqueCount === 0) return { r: 0, g: 0, b: 0, opaqueCount: 0 };
    return {
      r: Math.round(rSum / opaqueCount),
      g: Math.round(gSum / opaqueCount),
      b: Math.round(bSum / opaqueCount),
      opaqueCount,
    };
  } catch {
    return null;
  }
}

async function main() {
  console.log("=== Running Antigravity Art & Design Duplication Audit ===");

  const report = {
    timestamp: new Date().toISOString(),
    fileHashes: {},
    pHashes: {},
    palettes: {},
    similarPairs: [],
    atlasAudit: {},
    duplicationsFound: [],
  };

  const assetDirs = [
    "public/assets/characters/eira",
    "public/assets/characters/eira/frames",
    "public/assets/enemies",
    "public/assets/branding",
    "public/assets/title",
  ];

  const allFiles = [];
  for (const dir of assetDirs) {
    const fullDir = path.resolve(dir);
    if (!fs.existsSync(fullDir)) continue;
    const entries = fs.readdirSync(fullDir);
    for (const entry of entries) {
      if (entry.endsWith(".png") || entry.endsWith(".webp") || entry.endsWith(".jpg")) {
        allFiles.push(path.join(dir, entry));
      }
    }
  }

  console.log(`Auditing ${allFiles.length} visual asset files...`);

  // 1. Compute SHA-256 and pHash
  for (const f of allFiles) {
    const hash = getFileHash(f);
    const pHash = await getPerceptualHash(f);
    const pal = await analyzePalette(f);
    report.fileHashes[f] = hash;
    report.pHashes[f] = pHash;
    report.palettes[f] = pal;
  }

  // 2. Check identical file hashes (bit-exact duplicates)
  const hashToFiles = new Map();
  for (const [file, hash] of Object.entries(report.fileHashes)) {
    if (!hashToFiles.has(hash)) hashToFiles.set(hash, []);
    hashToFiles.get(hash).push(file);
  }

  for (const [hash, files] of hashToFiles.entries()) {
    if (files.length > 1) {
      report.duplicationsFound.push({
        type: "IDENTICAL_FILE_HASH",
        hash,
        files,
        severity: "HIGH",
      });
    }
  }

  // 3. Check Perceptual Hash similarity (dHash hamming distance <= 5 out of 64)
  for (let i = 0; i < allFiles.length; i++) {
    for (let j = i + 1; j < allFiles.length; j++) {
      const f1 = allFiles[i];
      const f2 = allFiles[j];
      const dist = hammingDistance(report.pHashes[f1], report.pHashes[f2]);
      if (dist <= 6) {
        report.similarPairs.push({ f1, f2, hammingDistance: dist });
      }
    }
  }

  // 4. Check Atlas Area Overlaps / Missing Frames
  const enemyAtlasJson = path.resolve("public/assets/enemies/enemies-atlas.json");
  if (fs.existsSync(enemyAtlasJson)) {
    const meta = JSON.parse(fs.readFileSync(enemyAtlasJson, "utf-8"));
    report.atlasAudit.enemyAtlasFrames = Object.keys(meta.frames);
    const requiredStage2Enemies = ["siren", "seraph", "golem", "kraken"];
    const missingAtlas = requiredStage2Enemies.filter((k) => !meta.frames[k]);
    if (missingAtlas.length > 0) {
      report.duplicationsFound.push({
        type: "MISSING_STAGE2_ATLAS_FRAMES",
        missing: missingAtlas,
        severity: "HIGH",
        detail: "Stage 2 enemies siren, seraph, golem, kraken lack dedicated atlas frames in enemies-atlas.json",
      });
    }
  }

  // 5. Boss Duplication Audit
  const stage1Content = fs.readFileSync(path.resolve("src/sim/stage1.ts"), "utf-8");
  if (stage1Content.includes('"leviathan"') || stage1Content.includes("'leviathan'")) {
    report.duplicationsFound.push({
      type: "SHARED_FINAL_BOSS_TYPE",
      severity: "HIGH",
      detail: "Stage 1 and Stage 2 currently share 'leviathan' as final boss. Stage 1 must be separated into 'celestialGuardian'.",
    });
  }

  // 6. Eira Animation Frames Audit
  const eiraMetaJson = path.resolve("public/assets/characters/eira/eira-flight.json");
  if (fs.existsSync(eiraMetaJson)) {
    const eiraMeta = JSON.parse(fs.readFileSync(eiraMetaJson, "utf-8"));
    const idleCount = eiraMeta.animations?.idle?.length ?? 0;
    const rollCount = eiraMeta.animations?.roll?.length ?? 0;
    if (idleCount < 8) {
      report.duplicationsFound.push({
        type: "INSUFFICIENT_EIRA_IDLE_FRAMES",
        current: idleCount,
        required: 8,
        severity: "MEDIUM",
        detail: `Eira has only ${idleCount} idle frames in atlas metadata; requires at least 8 unique frames.`,
      });
    }
    if (rollCount < 12) {
      report.duplicationsFound.push({
        type: "INSUFFICIENT_EIRA_ROLL_FRAMES",
        current: rollCount,
        required: 12,
        severity: "MEDIUM",
        detail: `Eira has only ${rollCount} roll frames in atlas metadata; requires at least 12 unique rotation frames.`,
      });
    }
  }

  fs.mkdirSync(path.resolve("test-results"), { recursive: true });
  fs.writeFileSync(
    path.resolve("test-results/art-audit-report.json"),
    JSON.stringify(report, null, 2)
  );

  console.log("Audit complete. Duplications found:", report.duplicationsFound.length);
  for (const d of report.duplicationsFound) {
    console.log(`- [${d.severity}] ${d.type}: ${d.detail || JSON.stringify(d)}`);
  }
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
