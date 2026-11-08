/**
 * Production artwork safety guard.
 * The old SVG placeholder generator was retired after the Eira/monster artwork
 * regression in v0.9. Do not regenerate approved gameplay artwork here.
 *
 * Eira: npm run art:eira (uses canonical approved PNGs).
 * Monsters: art/source/enemies-illustrated-v1-source.zip and the approved
 * public/assets/enemies/enemies-illustrated.png atlas.
 *
 * Only explicit prototype work orders may generate SVG placeholders, and those
 * outputs must never target public/assets/enemies or the gameplay atlas.
 */
import fs from "node:fs";
const required = [
  "art/source/valkyrie_eira_monster_spritesheet.jpg",
  "art/source/enemies-illustrated-v1-source.zip",
  "public/assets/characters/eira/eira-flight.png",
  "public/assets/enemies/enemies-atlas.png",
  "public/assets/enemies/enemies-illustrated.png",
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error("Missing approved artwork:", missing.join(", "));
  process.exitCode = 1;
} else {
  console.log("Approved artwork verified. Legacy SVG asset generation is disabled.");
}
