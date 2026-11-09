/**
 * Original Valkyrie Eira slash-only FX. Generates 32 independently posed transparent
 * RGBA cells (8 ticks x 2 directions x back/front layers). No character artwork.
 *
 * Built during dev/verify/build, so GitHub Pages receives the actual raster PNG.
 * Requires only sharp, already pinned in package-lock.json.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const CELL = 256;
const COUNT = 8;
const WIDTH = CELL * COUNT;
const HEIGHT = CELL * 4;
const OUTPUT = path.resolve("public/assets/fx/eira-slash-v1.png");
const REVIEW = path.resolve("art/reviews/eira-slash-v1-contact.png");

const fmt = (n) => Number(n.toFixed(2));
const point = (radius, angle) => [fmt(128 + radius * Math.cos(angle)), fmt(128 + radius * Math.sin(angle))];
const deg = (v) => (v * Math.PI) / 180;
const asPath = (points, close = true) =>
  points.map(([x, y], i) => (i ? "L" : "M") + x + " " + y).join(" ") + (close ? " Z" : "");

function arcPoints(from, to, radius, count = 48) {
  return Array.from({ length: count + 1 }, (_, i) =>
    point(typeof radius === "function" ? radius(i / count) : radius, from + (to - from) * i / count));
}
function ribbon(from, to, innerRadius, outerRadius, power = 1) {
  const outside = arcPoints(from, to, (t) => outerRadius - (1 - Math.sin(Math.PI * t) ** 0.75) * 2);
  const inside = arcPoints(to, from, (t) => {
    const width = (outerRadius - innerRadius) * Math.max(0.035, Math.sin(Math.PI * (1 - t)) ** power);
    return outerRadius - width;
  });
  return asPath([...outside, ...inside]);
}

function frameSVG(direction, i, layer) {
  const p = i / (COUNT - 1);
  const forward = direction === "l2r" ? 1 : -1;
  const start = direction === "l2r" ? -151 : -29;
  const tip = deg(start + forward * (122 * p));
  const length = 7 + Math.sin(p * Math.PI * 0.78) * 68;
  const trail = deg(start + forward * Math.max(-4, 122 * p - length));
  const end = tip;
  const active = Math.min(1, (p + 0.17) * 3.4) * (1 - 0.60 * Math.max(0, (p - 0.67) / 0.33));
  const color = direction === "l2r" ? "#42dbfc" : "#ffce65";
  const accent = direction === "l2r" ? "#0b8df5" : "#fa923a";
  const inner = direction === "l2r" ? "#8beeff" : "#fff2c2";
  const glowPath = ribbon(trail, end, 74, 122, 1.1);
  const widePath = ribbon(trail, end, 89, 117, 1.1);
  const bladePath = ribbon(trail, end, 106, 117, 1.35);
  const outerLine = asPath(arcPoints(trail, end, 118, 42), false);
  const secondaryLine = asPath(arcPoints(trail, end, 102, 38), false);

  const flecks = [];
  // Carefully deterministic splinters near the moving cutting edge, not random noise.
  for (let k = 0; k < 11; k++) {
    const q = (k + 0.45) / 11;
    const angle = trail + (end - trail) * q;
    const radial = 119 + ((k * 13 + i * 7) % 16);
    const [x, y] = point(radial, angle);
    const dx = fmt(Math.cos(angle) * (3 + (k % 3) * 2));
    const dy = fmt(Math.sin(angle) * (3 + (k % 3) * 2));
    flecks.push('<path d="M' + x + ' ' + y + ' l' + dx + ' ' + dy +
      '" stroke="' + (k % 3 === 0 ? "#ffffff" : color) +
      '" stroke-width="' + (k % 4 === 0 ? 1.8 : 1) + '" stroke-linecap="round" opacity="' +
      fmt(active * (0.20 + 0.65 * ((k * 3 + i) % 7) / 7)) + '"/>');
  }
  const [tx, ty] = point(118, end);
  const [cx, cy] = point(109, end);
  const swish = '<path d="' + secondaryLine + '" stroke="' + color +
    '" stroke-width="1.5" fill="none" opacity="' + fmt(active * 0.63) + '"/>';
  const back = '<path d="' + glowPath + '" fill="' + color + '" opacity="' + fmt(active * 0.35) +
    '" filter="url(#bloom)"/>' +
    '<path d="' + widePath + '" fill="url(#energy)" opacity="' + fmt(active * 0.85) + '"/>' +
    '<path d="' + glowPath + '" fill="none" stroke="' + accent +
    '" stroke-width="2.5" opacity="' + fmt(active * 0.52) + '"/>' +
    swish + flecks.join("");
  const front =
    '<path d="' + bladePath + '" fill="url(#blade)" opacity="' + fmt(active * 0.86) + '"/>' +
    '<path d="' + outerLine + '" stroke="' + inner + '" stroke-width="5.0" stroke-linecap="round" fill="none" filter="url(#bloom)" opacity="' + fmt(active * 0.75) + '"/>' +
    '<path d="' + outerLine + '" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="' + fmt(active * 0.98) + '"/>' +
    '<path d="M' + tx + ' ' + ty + ' L' + cx + ' ' + cy + '" stroke="#ffffff" stroke-width="1.3" opacity="' + fmt(active * 0.88) + '"/>' +
    '<circle cx="' + tx + '" cy="' + ty + '" r="' + fmt(2 + 3 * Math.sin(Math.PI * p)) +
    '" fill="#ffffff" opacity="' + fmt(active * 0.8) + '"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + CELL + '" height="' + CELL +
    '" viewBox="0 0 256 256"><defs>' +
    '<filter id="bloom" x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation="5"/></filter>' +
    '<linearGradient id="energy" x1="10%" y1="90%" x2="90%" y2="0%">' +
    '<stop offset="0" stop-color="' + accent + '" stop-opacity=".04"/>' +
    '<stop offset=".50" stop-color="' + color + '" stop-opacity=".72"/>' +
    '<stop offset=".82" stop-color="' + inner + '" stop-opacity=".96"/>' +
    '<stop offset="1" stop-color="#ffffff" stop-opacity=".9"/></linearGradient>' +
    '<linearGradient id="blade" x1="30%" y1="90%" x2="70%" y2="0%">' +
    '<stop offset="0" stop-color="' + color + '" stop-opacity=".06"/>' +
    '<stop offset=".8" stop-color="' + inner + '" stop-opacity=".8"/>' +
    '<stop offset="1" stop-color="#ffffff"/></linearGradient></defs>' +
    (layer === "back" ? back : front) + "</svg>";
}

async function generate() {
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  const overlays = [];
  for (const layer of ["back", "front"]) {
    for (const direction of ["l2r", "r2l"]) {
      const row = (layer === "back" ? 0 : 2) + (direction === "r2l" ? 1 : 0);
      for (let i = 0; i < COUNT; i++) {
        const svg = Buffer.from(frameSVG(direction, i, layer), "utf8");
        const data = await sharp(svg, { density: 144 }).resize(CELL, CELL)
          .ensureAlpha().png().toBuffer();
        overlays.push({ input: data, left: i * CELL, top: row * CELL });
      }
    }
  }
  const image = await sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(overlays).png({ compressionLevel: 9 }).toBuffer();
  await fs.writeFile(OUTPUT, image);
  const stats = await sharp(image).stats();
  if (stats.channels.length < 4 || stats.channels[3].min !== 0 ||
      stats.channels[3].max < 120) {
    throw new Error("Slash sprite atlas failed transparency/opacity validation");
  }
  if (process.argv.includes("--review")) {
    await fs.mkdir(path.dirname(REVIEW), { recursive: true });
    await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4,
      background: { r: 17, g: 22, b: 38, alpha: 1 } } })
      .composite([{ input: image, left: 0, top: 0 }])
      .png().toFile(REVIEW);
  }
  console.log("Generated 32 original transparent slash FX frames: " + OUTPUT);
}
generate().catch((error) => { console.error(error); process.exitCode = 1; });
