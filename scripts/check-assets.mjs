// P0 placeholder — replaced by the art pipeline (docs/ART_PIPELINE.md).
import fs from "node:fs";
if (!fs.existsSync("public/assets/sprites.json")) {
  console.log("assets:check — no sprites.json yet (P0 placeholder, art pipeline pending)");
  process.exit(0);
}
console.error("assets:check stub found a manifest; the real checker must replace this file.");
process.exit(1);
