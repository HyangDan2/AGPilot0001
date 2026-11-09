// Generates an optimized Stage 1 WebP from the committed original painting.
// Required by preassets:check / predev / prebuild; the original is never mutated.
import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";

const source = path.resolve("art/source/halvard-skysea-v1.png");
const target = path.resolve("public/assets/backgrounds/stage1-halvard-skysea-v1.webp");
const meta = await sharp(source).metadata();
if (meta.width !== 887 || meta.height !== 1774) {
  throw new Error("Unexpected Halvard source dimensions (expected 887x1774)");
}
await fs.mkdir(path.dirname(target), { recursive: true });
await sharp(source).webp({ quality: 91, effort: 6 }).toFile(target);
const out = await sharp(target).metadata();
if (out.width !== 887 || out.height !== 1774 || out.format !== "webp") {
  throw new Error("Halvard WebP output validation failed");
}
console.log(`Halvard illustrated WebP ready: ${target} (${(await fs.stat(target)).size} bytes)`);
