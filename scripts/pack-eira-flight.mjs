import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SOURCE_PATH = path.resolve("art/source/valkyrie_eira_shmup_spritesheet_v2.jpg");
const FRAMES_DIR = path.resolve("public/assets/characters/eira/frames");
const OUT_DIR = path.resolve("public/assets/characters/eira");
const EVIDENCE_DIR = path.resolve("docs/evidence");

fs.mkdirSync(FRAMES_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

// Connected component analysis to drop tiny stray noise
function getComponents(width, height, data) {
  const n = width * height;
  const labels = new Int32Array(n);
  const queue = new Int32Array(n);
  const parts = [];
  let label = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] || data[i * 4 + 3] < 128) continue;
    label++;
    let head = 0, tail = 1;
    queue[0] = i;
    labels[i] = label;
    const part = { id: label, count: 0, left: width, top: height, right: 0, bottom: 0 };

    while (head < tail) {
      const j = queue[head++];
      const x = j % width;
      const y = Math.floor(j / width);
      part.count++;
      part.left = Math.min(part.left, x);
      part.right = Math.max(part.right, x);
      part.top = Math.min(part.top, y);
      part.bottom = Math.max(part.bottom, y);

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          const k = yy * width + xx;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height || labels[k] || data[k * 4 + 3] < 128) continue;
          labels[k] = label;
          queue[tail++] = k;
        }
      }
    }
    parts.push(part);
  }
  return { parts, labels };
}

async function extractFrames() {
  console.log("Loading source sprite sheet...");
  const cellW = 256;
  const cellH = 256;

  const frameNames = [
    // Row 0: Idle/Hover
    "idle_0", "idle_1", "idle_2", "idle_3",
    // Row 1: Maneuvers & Thrust
    "bank_left", "hover", "bank_right", "thrust",
    // Row 2: Magic Combat
    "slash_0", "slash_1", "charge", "power_up",
    // Row 3: Roll
    "roll_0", "roll_1", "roll_2", "roll_3"
  ];

  const extracted = [];

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const idx = row * 4 + col;
      const name = frameNames[idx];
      const left = col * cellW;
      const top = row * cellH;

      const cell = await sharp(SOURCE_PATH)
        .extract({ left, top, width: cellW, height: cellH })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const data = cell.data;
      const w = cellW, h = cellH;

      // Flood fill from border
      function isBg(pixelIdx) {
        const r = data[pixelIdx];
        const g = data[pixelIdx + 1];
        const b = data[pixelIdx + 2];
        if (r > 240 && g > 240 && b > 240) return true;
        // Cyan-grey grid lines or paper tint
        if (b >= r && b > 170 && g > 160 && r > 135) return true;
        return false;
      }

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
        const pIdx = pos * 4;
        if (isBg(pIdx)) {
          data[pIdx + 3] = 0; // Transparent
          if (x > 0 && !visited[pos - 1]) queue.push(x - 1, y);
          if (x < w - 1 && !visited[pos + 1]) queue.push(x + 1, y);
          if (y > 0 && !visited[pos - w]) queue.push(x, y - 1);
          if (y < h - 1 && !visited[pos + w]) queue.push(x, y + 1);
        }
      }

      // Drop stray tiny components (< 120 pixels)
      const { parts, labels } = getComponents(w, h, data);
      const mainPart = parts.reduce((max, p) => p.count > max.count ? p : max, { count: 0 });

      for (let i = 0; i < w * h; i++) {
        const lbl = labels[i];
        if (lbl > 0) {
          const part = parts[lbl - 1];
          // Keep main body and any significant parts (like magic arcs, sword) > 80 pixels
          if (part.count < 80) {
            data[i * 4 + 3] = 0;
          }
        }
      }

      const framePath = path.join(FRAMES_DIR, `${name}.png`);
      await sharp(data, { raw: { width: w, height: h, channels: 4 } })
        .png()
        .toFile(framePath);

      extracted.push({ name, path: framePath, width: w, height: h, row, col, mainPart });
    }
  }

  console.log(`Extracted ${extracted.length} transparent frames into ${FRAMES_DIR}`);

  // Pack into a single 512x512 runtime texture atlas (128x128 per cell)
  const atlasDim = 512;
  const targetCell = 128;
  const composites = [];
  const framesMeta = {};

  for (let i = 0; i < extracted.length; i++) {
    const f = extracted[i];
    const resizedBuf = await sharp(f.path)
      .resize(targetCell, targetCell, { fit: "contain" })
      .toBuffer();

    const r = Math.floor(i / 4);
    const c = i % 4;
    const x = c * targetCell;
    const y = r * targetCell;

    composites.push({
      input: resizedBuf,
      left: x,
      top: y
    });

    framesMeta[f.name] = {
      x,
      y,
      w: targetCell,
      h: targetCell,
      anchorX: 64,
      anchorY: 64
    };
  }

  // Create atlas image
  const atlasPath = path.join(OUT_DIR, "eira-flight.png");
  await sharp({
    create: {
      width: atlasDim,
      height: atlasDim,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(composites)
    .png()
    .toFile(atlasPath);

  // Write metadata
  const metaPath = path.join(OUT_DIR, "eira-flight.json");
  const metadata = {
    meta: {
      image: "assets/characters/eira/eira-flight.png",
      size: { w: atlasDim, h: atlasDim },
      cell: targetCell
    },
    animations: {
      idle: ["idle_0", "idle_1", "idle_2", "idle_3"],
      bankLeft: ["bank_left"],
      bankRight: ["bank_right"],
      thrust: ["thrust"],
      attack: ["slash_0", "slash_1"],
      charge: ["charge"],
      powerUp: ["power_up"],
      roll: ["roll_0", "roll_1", "roll_2", "roll_3"]
    },
    frames: framesMeta
  };
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
  console.log(`Atlas generated at ${atlasPath} and ${metaPath}`);

  // Generate Review Sheets:
  // 1. Checkerboard Review Sheet
  await generateReviewSheets(extracted);
}

async function generateReviewSheets(extracted) {
  const cellW = 256;
  const cellH = 256;
  const totalW = cellW * 4;
  const totalH = cellH * 4;

  // Create checkerboard background pattern (16x16 checks)
  const checkCanvas = Buffer.alloc(totalW * totalH * 4);
  const checkSize = 16;
  for (let y = 0; y < totalH; y++) {
    for (let x = 0; x < totalW; x++) {
      const idx = (y * totalW + x) * 4;
      const isDark = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;
      const val = isDark ? 180 : 230;
      checkCanvas[idx] = val;
      checkCanvas[idx + 1] = val;
      checkCanvas[idx + 2] = val;
      checkCanvas[idx + 3] = 255;
    }
  }

  const composites = [];
  for (let i = 0; i < extracted.length; i++) {
    const f = extracted[i];
    const r = Math.floor(i / 4);
    const c = i % 4;
    composites.push({
      input: f.path,
      left: c * cellW,
      top: r * cellH
    });
  }

  const checkerboardPath = path.join(EVIDENCE_DIR, "eira-review-checkerboard.png");
  await sharp(checkCanvas, { raw: { width: totalW, height: totalH, channels: 4 } })
    .composite(composites)
    .png()
    .toFile(checkerboardPath);

  // 2. In-Game Scale Comparison (64x64 on dark game background)
  const gameW = 720;
  const gameH = 480;
  const gameBg = Buffer.alloc(gameW * gameH * 4);
  // Fill with #080D23
  for (let i = 0; i < gameW * gameH; i++) {
    const idx = i * 4;
    gameBg[idx] = 0x08;
    gameBg[idx + 1] = 0x0d;
    gameBg[idx + 2] = 0x23;
    gameBg[idx + 3] = 255;
  }

  const ingameComps = [];
  const previewActions = ["idle_0", "bank_left", "bank_right", "thrust", "slash_0", "charge", "power_up", "roll_1"];
  for (let i = 0; i < previewActions.length; i++) {
    const actionName = previewActions[i];
    const frame = extracted.find(e => e.name === actionName);
    const scaledBuf = await sharp(frame.path).resize(72, 72, { fit: "contain" }).toBuffer();
    ingameComps.push({
      input: scaledBuf,
      left: 30 + i * 82,
      top: 180
    });
  }

  const ingamePath = path.join(EVIDENCE_DIR, "eira-review-ingame.png");
  await sharp(gameBg, { raw: { width: gameW, height: gameH, channels: 4 } })
    .composite(ingameComps)
    .png()
    .toFile(ingamePath);

  console.log("Review sheets saved to:", checkerboardPath, "and", ingamePath);
}

extractFrames().catch(err => {
  console.error("Extraction failed:", err);
  process.exit(1);
});
