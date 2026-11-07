import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SOURCE_PATH = path.resolve("art/source/valkyrie_eira_monster_spritesheet.jpg");
const OUT_DIR = path.resolve("public/assets/enemies");
const EVIDENCE_DIR = path.resolve("docs/evidence");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

async function extractMonsters() {
  console.log("Loading monster sprite sheet...");

  const regions = [
    { id: "shadow_gargoyle", left: 25, top: 34, width: 246, height: 150 },
    { id: "crimson_drake", left: 280, top: 20, width: 245, height: 165 },
    { id: "skyfang_phantom", left: 551, top: 26, width: 217, height: 160 },
    { id: "armored_behemoth", left: 773, top: 29, width: 308, height: 250 },
    { id: "floating_bastion", left: 1107, top: 30, width: 249, height: 245 },
    { id: "ancient_guardian", left: 39, top: 460, width: 624, height: 264 },
    { id: "abyssal_dragon", left: 705, top: 460, width: 652, height: 263 },
  ];

  const extracted = [];

  for (const r of regions) {
    const cell = await sharp(SOURCE_PATH)
      .extract({ left: r.left, top: r.top, width: r.width, height: r.height })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const data = cell.data;
    const w = r.width, h = r.height;

    // Flood fill background removal from border
    const visited = new Uint8Array(w * h);
    const queue = [];

    for (let x = 0; x < w; x++) {
      queue.push(x, 0);
      queue.push(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      queue.push(0, y);
      queue.push(w - 1, y);
    }

    let head = 0;
    while (head < queue.length) {
      const x = queue[head++];
      const y = queue[head++];
      const pos = y * w + x;
      if (visited[pos]) continue;
      visited[pos] = 1;
      const idx = pos * 4;
      const red = data[idx], green = data[idx + 1], blue = data[idx + 2];
      if (red > 235 && green > 235 && blue > 235) {
        data[idx + 3] = 0; // transparent
        if (x > 0 && !visited[pos - 1]) queue.push(x - 1, y);
        if (x < w - 1 && !visited[pos + 1]) queue.push(x + 1, y);
        if (y > 0 && !visited[pos - w]) queue.push(x, y - 1);
        if (y < h - 1 && !visited[pos + w]) queue.push(x, y + 1);
      }
    }

    const pngBuf = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    const trimmed = await sharp(pngBuf).trim().png().toBuffer({ resolveWithObject: true });

    const outPath = path.join(OUT_DIR, `${r.id}.png`);
    await sharp(trimmed.data).toFile(outPath);

    console.log(`Extracted ${r.id}: ${trimmed.info.width}x${trimmed.info.height} -> ${outPath}`);
    extracted.push({ id: r.id, path: outPath, width: trimmed.info.width, height: trimmed.info.height });
  }

  // Pack all 7 into an atlas 1024x1024 with transparent padding
  const atlasDim = 1024;
  const layout = [
    { id: "shadow_gargoyle", x: 10, y: 10, targetW: 160, targetH: 140 },
    { id: "crimson_drake", x: 180, y: 10, targetW: 160, targetH: 160 },
    { id: "skyfang_phantom", x: 350, y: 10, targetW: 160, targetH: 160 },
    { id: "floating_bastion", x: 520, y: 10, targetW: 180, targetH: 220 },
    { id: "armored_behemoth", x: 710, y: 10, targetW: 240, targetH: 250 },
    { id: "ancient_guardian", x: 20, y: 280, targetW: 460, targetH: 260 },
    { id: "abyssal_dragon", x: 20, y: 560, targetW: 580, targetH: 300 }
  ];

  const atlasComposites = [];
  const atlasMeta = { meta: { image: "assets/enemies/enemies-atlas.png", size: { w: atlasDim, h: atlasDim } }, frames: {} };

  for (const item of layout) {
    const ext = extracted.find(e => e.id === item.id);
    const buf = await sharp(ext.path)
      .resize(item.targetW, item.targetH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer({ resolveWithObject: true });

    atlasComposites.push({
      input: buf.data,
      left: item.x,
      top: item.y
    });

    atlasMeta.frames[item.id] = {
      x: item.x,
      y: item.y,
      w: item.targetW,
      h: item.targetH,
      anchorX: Math.floor(item.targetW / 2),
      anchorY: Math.floor(item.targetH / 2)
    };
  }

  const atlasPath = path.join(OUT_DIR, "enemies-atlas.png");
  await sharp({
    create: {
      width: atlasDim,
      height: atlasDim,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(atlasComposites)
    .png()
    .toFile(atlasPath);

  fs.writeFileSync(path.join(OUT_DIR, "enemies-atlas.json"), JSON.stringify(atlasMeta, null, 2));
  console.log(`Enemies atlas created at ${atlasPath}`);

  // Generate Review Checkerboard
  const checkerW = 1024, checkerH = 1024;
  const checkCanvas = Buffer.alloc(checkerW * checkerH * 4);
  const checkSize = 16;
  for (let y = 0; y < checkerH; y++) {
    for (let x = 0; x < checkerW; x++) {
      const idx = (y * checkerW + x) * 4;
      const isDark = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;
      const val = isDark ? 180 : 230;
      checkCanvas[idx] = val;
      checkCanvas[idx + 1] = val;
      checkCanvas[idx + 2] = val;
      checkCanvas[idx + 3] = 255;
    }
  }

  const reviewPath = path.join(EVIDENCE_DIR, "monsters-review-checkerboard.png");
  await sharp(checkCanvas, { raw: { width: checkerW, height: checkerH, channels: 4 } })
    .composite(atlasComposites)
    .png()
    .toFile(reviewPath);

  console.log(`Monsters review checkerboard created at ${reviewPath}`);
}

extractMonsters().catch(err => {
  console.error("Extraction failed:", err);
  process.exit(1);
});
