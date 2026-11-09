// Extract exactly the approved WebP atlases and JSON manifest from the
// versioned source ZIP, without external unzip dependencies or runtime requests.
// Original high-resolution PNGs are stored separately under art/source/halvard-v3.
import fs from "node:fs/promises";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import sharp from "sharp";

const src = path.resolve("art/source/halvard-v3-runtime-bundle.zip");
const dest = path.resolve("public/assets/backgrounds/halvard-v3");
const whitelist = ["base.webp", "islands.webp", "temples.webp", "clouds.webp", "shimmer.webp", "manifest.json"];
const payload = await fs.readFile(src);
const extracted = new Map();
let offset = 0;
while (offset + 30 < payload.length && payload.readUInt32LE(offset) === 0x04034b50) {
  const compression = payload.readUInt16LE(offset + 8);
  const packed = payload.readUInt32LE(offset + 18);
  const length = payload.readUInt16LE(offset + 26);
  const extra = payload.readUInt16LE(offset + 28);
  const name = payload.subarray(offset + 30, offset + 30 + length).toString("utf8");
  const start = offset + 30 + length + extra;
  const end = start + packed;
  if (!whitelist.includes(name) || extracted.has(name) || end > payload.length)
    throw new Error("Unexpected Halvard archive entry: " + name);
  const bytes = payload.subarray(start, end);
  if (compression !== 8 && compression !== 0)
    throw new Error("Unsupported ZIP compression");
  extracted.set(name, compression === 8 ? inflateRawSync(bytes) : bytes);
  offset = end;
}
if (!whitelist.every((name) => extracted.has(name)))
  throw new Error("Incomplete Halvard v3 atlas archive");
const manifest = JSON.parse(extracted.get("manifest.json").toString("utf8"));
const expected = { islands: 7, temples: 3, clouds: 10 };
if (manifest.version !== "3.0.0" || manifest.gameDimensions.join(",") !== "720,1280" ||
    !Object.entries(expected).every(([key, count]) => manifest.layers[key].frames.length === count))
  throw new Error("Invalid Halvard v3 layout manifest");
const dimensions = {
  "base.webp": [941, 1672],
  "islands.webp": [1024, 2048],
  "temples.webp": [2048, 1536],
  "clouds.webp": [2048, 2048],
  "shimmer.webp": [941, 1672],
};
await fs.mkdir(dest, { recursive: true });
for (const name of whitelist) {
  if (name !== "manifest.json") {
    const img = await sharp(extracted.get(name)).metadata();
    if (img.format !== "webp" ||
        img.width !== dimensions[name][0] || img.height !== dimensions[name][1])
      throw new Error("Invalid layer image: " + name);
  }
  await fs.writeFile(path.join(dest, name), extracted.get(name));
}
console.log("HALVARD v3 ready: 4 independent depths + water shimmer");
