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

  // Approved Eira Motion v2 is an additive asset; never mutate the existing Eira atlas.
  const v2Img = path.resolve("public/assets/characters/eira/eira-motion-v2-atlas-256.png");
  const v2Json = path.resolve("public/assets/characters/eira/eira-motion-v2.json");
  const legacyEira = path.resolve("public/assets/characters/eira/eira-flight.png");
  if (!fs.existsSync(v2Img) || !fs.existsSync(v2Json) || !fs.existsSync(legacyEira)) {
    console.error("FAIL: Missing Eira v2 sprite assets or original fallback");
    hasError = true;
  } else {
    const png = fs.readFileSync(v2Img);
    const frameData = JSON.parse(fs.readFileSync(v2Json, "utf8"));
    const expected = { idle: 8, slash_l: 4, slash_r: 4, roll: 12 };
    const validGroups = Object.entries(expected).every(
      ([name, count]) => frameData.animations?.[name]?.length === count,
    );
    const allFrames = Object.values(frameData.frames ?? {});
    const validRects = allFrames.length === 28 && allFrames.every(
      (f) => f.x >= 0 && f.y >= 0 && f.w === 256 && f.h === 256 &&
             f.x + f.w <= 2048 && f.y + f.h <= 1024,
    );
    const validPng = png.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" &&
                     png.readUInt32BE(16) === 2048 && png.readUInt32BE(20) === 1024;
    if (!validPng || !validGroups || !validRects) {
      console.error("FAIL: Invalid Eira v2 28-frame atlas coordinates or animation groups");
      hasError = true;
    }
    report.totalBytes += png.length;
    report.checked++;
  }

  // Eira v5 is additive: full 40-frame artwork plus its 28-frame v2 fallback
  // are retained separately to allow instant rollback.
  const v5Img = path.resolve("public/assets/characters/eira/eira-motion-v5-atlas-256.png");
  const v5Json = path.resolve("public/assets/characters/eira/eira-motion-v5.json");
  if (!fs.existsSync(v5Img) || !fs.existsSync(v5Json)) {
    console.error("FAIL: Eira motion v5 atlas or metadata is missing");
    hasError = true;
  } else {
    const png = fs.readFileSync(v5Img);
    const metadata = JSON.parse(fs.readFileSync(v5Json, "utf8"));
    const expected = { idle: 8, slash_l: 4, slash_r: 4, roll: 24 };
    const countsMatch = Object.entries(expected).every(
      ([animation, count]) => metadata.animations?.[animation]?.length === count,
    );
    const allFrames = Object.values(metadata.frames ?? {});
    const rectsMatch = allFrames.length === 40 && allFrames.every(
      (f) => f.x >= 0 && f.y >= 0 && f.w === 256 && f.h === 256 &&
        f.x + f.w <= 2048 && f.y + f.h <= 1280,
    );
    const signatureMatches = png.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
    const pngDimensionsMatch = signatureMatches &&
      png.readUInt32BE(16) === 2048 && png.readUInt32BE(20) === 1280;
    if (!countsMatch || !rectsMatch || !pngDimensionsMatch) {
      console.error("FAIL: Invalid Eira motion v5 atlas dimensions or frame map");
      hasError = true;
    }
    report.totalBytes += png.length;
    report.checked++;
  }

  // Eira v6 modifies only the roll art. Keep prior artwork in the repository for rollback.
  const v6Img = path.resolve("public/assets/characters/eira/eira-motion-v6-atlas-256.png");
  const v6Json = path.resolve("public/assets/characters/eira/eira-motion-v6.json");
  if (!fs.existsSync(v6Img) || !fs.existsSync(v6Json)) {
    console.error("FAIL: Missing approved Eira roll v6 atlas or metadata");
    hasError = true;
  } else {
    const png = fs.readFileSync(v6Img);
    const m = JSON.parse(fs.readFileSync(v6Json, "utf-8"));
    const expected = { idle: 8, slash_l: 4, slash_r: 4, roll: 24 };
    const countValid = Object.entries(expected).every(
      ([k, count]) => m.animations?.[k]?.length === count,
    );
    const frames = Object.values(m.frames ?? {});
    const rectValid = frames.length === 40 && frames.every(
      (f) => f.x >= 0 && f.y >= 0 && f.w === 256 && f.h === 256 &&
        f.x + f.w <= 2048 && f.y + f.h <= 1280,
    );
    const sizeValid = png.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" &&
      png.readUInt32BE(16) === 2048 && png.readUInt32BE(20) === 1280;
    if (!countValid || !rectValid || !sizeValid) {
      console.error("FAIL: Invalid Eira roll v6 40-frame atlas");
      hasError = true;
    }
    report.totalBytes += png.length;
    report.checked++;
  }

  // Stage 1 painting is generated as WebP from committed source for fast mobile loading.
  // The 2/3-stage original backgrounds remain purely procedural.
  const halvardSource = path.resolve("art/source/halvard-skysea-v1.png");
  const halvardWebp = path.resolve("public/assets/backgrounds/stage1-halvard-skysea-v1.webp");
  if (!fs.existsSync(halvardSource) || !fs.existsSync(halvardWebp)) {
    console.error("FAIL: Missing original or generated Halvard illustrated background");
    hasError = true;
  } else {
    const buf = fs.readFileSync(halvardWebp);
    const valid = buf.length > 50000 && buf.length < 1000000 &&
      buf.toString("ascii", 0, 4) === "RIFF" &&
      buf.toString("ascii", 8, 12) === "WEBP";
    if (!valid) {
      console.error("FAIL: Invalid or oversized Halvard WebP");
      hasError = true;
    }
    report.totalBytes += buf.length;
    report.checked++;
  }

  // Physically isolated, four-depth v3 illustrated Halvard background.
  // The optimized five-WebP bundle is generated reproducibly from committed ZIP;
  // original unmodified 941x1672 paintings remain in art/source/halvard-v3.
  const v3Root = path.resolve("public/assets/backgrounds/halvard-v3");
  const v3Paths = ["base.webp", "islands.webp", "temples.webp", "clouds.webp", "shimmer.webp"];
  const sourceZip = path.resolve("art/source/halvard-v3-runtime-bundle.zip");
  const originalPaintings = ["base.png", "islands.png", "temples.png", "clouds.png", "shimmer.png"];
  if (!fs.existsSync(sourceZip) ||
      !originalPaintings.every((name) => fs.existsSync(path.resolve("art/source/halvard-v3", name))) ||
      !v3Paths.every((name) => fs.existsSync(path.join(v3Root, name))) ||
      !fs.existsSync(path.join(v3Root, "manifest.json"))) {
    console.error("FAIL: Missing source or runtime asset for Halvard v3");
    hasError = true;
  } else {
    const manifest = JSON.parse(fs.readFileSync(path.join(v3Root, "manifest.json"), "utf8"));
    const expectedFrames = { islands: 7, temples: 3, clouds: 10 };
    const validSprites = Object.entries(expectedFrames).every(([kind, count]) => {
      const layer = manifest.layers[kind];
      if (!layer || layer.frames.length !== count || layer.instances.length < count) return false;
      const ids = new Set(layer.frames.map((frame) => frame.id));
      return layer.instances.every((item) => ids.has(item.frame)) &&
        layer.speed > 0 && layer.wrapPeriod > 0;
    });
    if (!validSprites || manifest.version !== "3.0.0" ||
        manifest.layers.islands.speed !== 30 ||
        manifest.layers.temples.speed !== 85 ||
        manifest.layers.clouds.speed !== 180) {
      console.error("FAIL: Halvard v3 independent parallax manifest invalid");
      hasError = true;
    }
    for (const file of v3Paths) {
      const bytes = fs.readFileSync(path.join(v3Root, file));
      if (bytes.toString("ascii", 0, 4) !== "RIFF" ||
          bytes.toString("ascii", 8, 12) !== "WEBP") {
        console.error("FAIL: Halvard v3 malformed " + file);
        hasError = true;
      }
      report.totalBytes += bytes.length;
      report.checked++;
    }
  }


  // Stage 2/3 four-depth raster atlas validation, generated from authored SVG painting.
  for (const [folder,stage] of [["ragnarok-v1",2],["yggdrasil-v1",3]]) {
    const root=path.resolve("public/assets/backgrounds",folder);
    const manifestFile=path.join(root,"manifest.json");
    if(!fs.existsSync(manifestFile)){console.error("FAIL: Missing "+folder+" manifest");hasError=true;continue;}
    const manifest=JSON.parse(fs.readFileSync(manifestFile,"utf-8"));
    if(manifest.version!=="1.0.0"||manifest.stage!==stage ||
       JSON.stringify(manifest.gameDimensions)!=="[720,1280]" ||
       manifest.layers.islands.frames.length!==6 ||
       manifest.layers.temples.frames.length!==6 ||
       manifest.layers.clouds.frames.length!==10){
      console.error("FAIL: Invalid stage asset manifest "+folder);hasError=true;
    }
    for(const kind of ["base","islands","temples","clouds"]){
      const file=path.join(root,kind+".webp");
      if(!fs.existsSync(file)){console.error("FAIL: Missing "+file);hasError=true;continue;}
      const buf=fs.readFileSync(file);
      if(buf.toString("ascii",0,4)!=="RIFF"||buf.toString("ascii",8,12)!=="WEBP"||buf.length>1200000){
        console.error("FAIL: Corrupt or oversized "+file);hasError=true;
      }
      report.totalBytes+=buf.length;report.checked++;
    }
  }

  // Independently generated 8-beat x 2-direction x 2-layer RGBA slash FX.
  // Generated before validation in dev, verify and build; never touch Eira artwork.
  const slashPngPath = path.resolve("public/assets/fx/eira-slash-v1.png");
  const slashMetaPath = path.resolve("public/assets/fx/eira-slash-v1.json");
  if (!fs.existsSync(slashPngPath) || !fs.existsSync(slashMetaPath)) {
    console.error("FAIL: Missing transparent slash FX atlas or metadata. Run npm run art:slash");
    hasError = true;
  } else {
    const png = fs.readFileSync(slashPngPath);
    const meta = JSON.parse(fs.readFileSync(slashMetaPath, "utf-8"));
    const sizeAndAlpha = png.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" &&
      png.readUInt32BE(16) === 2048 && png.readUInt32BE(20) === 1024 && png[25] === 6;
    const validRows = JSON.stringify(meta.rows) === JSON.stringify({
      l2r_back: 0, r2l_back: 1, l2r_front: 2, r2l_front: 3,
    });
    if (!sizeAndAlpha || !validRows || meta.framesPerSequence !== 8 ||
      meta.simulationTicksPerSwing !== 8) {
      console.error("FAIL: Invalid RGBA Eira slash FX sprite layout");
      hasError = true;
    }
    report.totalBytes += png.length;
    report.checked++;
  }

  // Includes all versioned Eira artwork retained for rollback (not only active v6).
  const maxImageBudget = 15.0 * 1024 * 1024; // Includes retained v1, v2 and v3 illustrations
  if (report.totalBytes > maxImageBudget) {
    console.error(`FAIL: Asset budget exceeded: ${(report.totalBytes / 1024 / 1024).toFixed(2)} MB > ${(maxImageBudget / 1024 / 1024).toFixed(1)} MB`);
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
