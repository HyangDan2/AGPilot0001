// P0 placeholder — replaced by the audio pipeline (docs/AUDIO_PIPELINE.md).
import fs from "node:fs";
if (!fs.existsSync("public/assets/audio.json")) {
  console.log("audio:check — no audio.json yet (P0 placeholder, audio pipeline pending)");
  process.exit(0);
}
console.error("audio:check stub found a manifest; the real checker must replace this file.");
process.exit(1);
