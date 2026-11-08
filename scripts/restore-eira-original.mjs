/**
 * Eira approved-art motion builder. Never regenerate character geometry.
 * Inputs: original v0.7.1 extracted PNGs in eira/canonical/ (256x256).
 * Outputs: 8 idle, 12 roll, combat/flight PNG frames and 1024x512 RGBA atlas.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createHash } from "node:crypto";

const root = path.resolve("public/assets/characters/eira");
const sourceDir = path.join(root, "canonical");
const frameDir = path.join(root, "frames");
const C = 128;
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const idle = Array.from({ length: 8 }, (_, i) => "idle_" + i);
const roll = Array.from({ length: 12 }, (_, i) => "roll_" + i);
const others = ["bank_left", "hover", "bank_right", "thrust", "slash_0", "slash_1", "charge", "power_up"];
const order = [...idle, ...roll.slice(0, 8), ...roll.slice(8), ...others.slice(0, 4), ...others.slice(4), ...idle.slice(0, 4)];

function plan(name) {
  if (name.startsWith("idle_")) {
    const i = Number(name.substring(5));
    const phase = (i / 8) * Math.PI * 2;
    return { key: "idle_" + [0, 1, 2, 3, 3, 2, 1, 0][i], dx: Math.round(2 * Math.sin(phase)), dy: Math.round(2 * Math.cos(phase)), angle: 1.2 * Math.sin(phase), sx: 1 + 0.01 * Math.sin(phase), sy: 1 + 0.01 * Math.cos(phase) };
  }
  if (name.startsWith("roll_")) {
    const i = Number(name.substring(5));
    return { key: "roll_" + [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 0, 0][i], dx: 0, dy: 0, angle: [0, -8, -15, -3, 0, 7, -7, 0, 9, 16, 6, -3][i], sx: [1, .91, .78, .91, 1, .92, .96, 1, .93, .82, .93, 1][i], sy: [1, .96, .9, 1, 1, .95, 1, 1, .97, .9, .97, 1][i] };
  }
  return { key: name, dx: 0, dy: 0, angle: 0, sx: 1, sy: 1 };
}

async function renderFrame(name) {
  const p = plan(name);
  const src = path.join(sourceDir, p.key + ".png");
  const original = await fs.readFile(src);
  const m = await sharp(original).metadata();
  if (m.width !== 256 || m.height !== 256) throw new Error("Invalid canonical sprite: " + src);
  const rotated = await sharp(original).resize(118, 118, { fit: "contain" }).rotate(p.angle, { background: transparent }).png().toBuffer();
  const rm = await sharp(rotated).metadata();
  const w = Math.min(126, Math.max(1, Math.round(rm.width * p.sx)));
  const h = Math.min(126, Math.max(1, Math.round(rm.height * p.sy)));
  const sprite = await sharp(rotated).resize(w, h, { fit: "fill" }).png().toBuffer();
  const left = Math.max(0, Math.min(C - w, Math.round((C - w) / 2 + p.dx)));
  const top = Math.max(0, Math.min(C - h, Math.round((C - h) / 2 + p.dy)));
  return sharp({ create: { width: C, height: C, channels: 4, background: transparent } }).composite([{ input: sprite, left, top }]).png().toBuffer();
}

async function main() {
  await fs.mkdir(frameDir, { recursive: true });
  const images = new Map();
  for (const name of new Set(order)) {
    const png = await renderFrame(name);
    images.set(name, png);
    await fs.writeFile(path.join(frameDir, name + ".png"), png);
  }
  const placements = [];
  const frames = {};
  order.forEach((name, i) => {
    const x = (i % 8) * C;
    const y = Math.floor(i / 8) * C;
    placements.push({ input: images.get(name), left: x, top: y });
    if (!frames[name]) frames[name] = { x, y, w: C, h: C, anchorX: 64, anchorY: 64 };
  });
  const atlas = await sharp({ create: { width: 1024, height: 512, channels: 4, background: transparent } }).composite(placements).png().toBuffer();
  const animations = { idle, roll, bankLeft: ["bank_left"], bankRight: ["bank_right"], hover: ["hover"], thrust: ["thrust"], slashLeft: ["slash_0"], slashRight: ["slash_1"], charge: ["charge"], powerUp: ["power_up"] };
  const hashes = (names) => new Set(names.map((name) => createHash("sha256").update(images.get(name)).digest("hex"))).size;
  if (hashes(idle) !== 8 || hashes(roll) !== 12) throw new Error("Non-unique animated frame detected");
  await fs.writeFile(path.join(root, "eira-flight.png"), atlas);
  await fs.writeFile(path.join(root, "eira-flight.json"), JSON.stringify({ meta: { image: "assets/characters/eira/eira-flight.png", size: { w: 1024, h: 512 }, cell: C, artPolicy: "original-v0.7.1-only" }, animations, frames }, null, 2) + "\n");
  console.log("Eira restored: 8 distinct idle, 12 distinct roll, original flight/combat poses, 1024x512 atlas");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
