import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const SAMPLE_RATE = 44100;

function createWavBuffer(left, right) {
  const numSamples = left.length;
  const buffer = Buffer.alloc(44 + numSamples * 4);

  // RIFF chunk
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples * 4, 4);
  buffer.write("WAVE", 8);

  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(2, 22);  // 2 channels (stereo)
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 4, 28); // byte rate
  buffer.writeUInt16LE(4, 32);  // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples * 4, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sL = Math.max(-1, Math.min(1, left[i]));
    const sR = Math.max(-1, Math.min(1, right[i]));
    const intL = sL < 0 ? Math.floor(sL * 32768) : Math.floor(sL * 32767);
    const intR = sR < 0 ? Math.floor(sR * 32768) : Math.floor(sR * 32767);
    buffer.writeInt16LE(intL, offset);
    buffer.writeInt16LE(intR, offset + 2);
    offset += 4;
  }

  return buffer;
}

function synthesizeTrack(durationSec, generator) {
  const totalSamples = Math.floor(durationSec * SAMPLE_RATE);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const [l, r] = generator(t, i, totalSamples);
    left[i] = l;
    right[i] = r;
  }

  // Soft peak normalize to -1.5 dB (~0.84)
  let peak = 0;
  for (let i = 0; i < totalSamples; i++) {
    const m = Math.max(Math.abs(left[i]), Math.abs(right[i]));
    if (m > peak) peak = m;
  }

  if (peak > 0) {
    const norm = 0.84 / peak;
    for (let i = 0; i < totalSamples; i++) {
      left[i] *= norm;
      right[i] *= norm;
    }
  }

  return createWavBuffer(left, right);
}

// 4. Jingles & SFX
function generateJingleClear() {
  return synthesizeTrack(4.0, (t) => {
    // Four triumphant fanfares
    const notes = [
      { f: 523.25, s: 0.0, d: 0.25 },
      { f: 659.25, s: 0.3, d: 0.25 },
      { f: 783.99, s: 0.6, d: 0.35 },
      { f: 1046.5, s: 1.0, d: 2.5 },
    ];
    let val = 0;
    for (const n of notes) {
      if (t >= n.s && t < n.s + n.d) {
        const dt = t - n.s;
        const saw = ((t * n.f) % 1) * 2 - 1;
        val += saw * Math.exp(-dt * 2.0) * 0.3;
      }
    }
    return [val, val];
  });
}

function generateJingleGameOver() {
  return synthesizeTrack(3.5, (t) => {
    const notes = [
      { f: 440.0, s: 0.0, d: 0.4 },
      { f: 415.3, s: 0.45, d: 0.4 },
      { f: 392.0, s: 0.9, d: 0.5 },
      { f: 349.2, s: 1.45, d: 1.8 },
    ];
    let val = 0;
    for (const n of notes) {
      if (t >= n.s && t < n.s + n.d) {
        const dt = t - n.s;
        const saw = ((t * n.f) % 1) * 2 - 1;
        val += saw * Math.exp(-dt * 2.5) * 0.28;
      }
    }
    return [val, val];
  });
}

function generateShotSFX(level) {
  const dur = 0.12;
  const startF = level === 3 ? 1050 : level === 2 ? 880 : 740;
  return synthesizeTrack(dur, (t) => {
    const f = startF * Math.exp(-t * 28);
    const sq = Math.sin(t * Math.PI * 2 * f) > 0 ? 0.35 : -0.35;
    const env = Math.exp(-t * 30);
    return [sq * env, sq * env];
  });
}

function generateExplosionSFX(size) {
  const dur = size === "boss" ? 1.2 : size === "l" ? 0.7 : size === "m" ? 0.4 : 0.22;
  return synthesizeTrack(dur, (t) => {
    const noise = ((Math.sin(t * 19283.47) * 43758.545) % 1);
    const boomFreq = 90 * Math.exp(-t * 8);
    const boom = Math.sin(t * Math.PI * 2 * boomFreq) * 0.5;
    const env = Math.exp(-t * (size === "boss" ? 3.5 : 8));
    const mix = (noise * 0.6 + boom * 0.4) * env * 0.5;
    return [mix, mix];
  });
}

function generatePickupSFX() {
  return synthesizeTrack(0.35, (t) => {
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    const idx = Math.min(3, Math.floor(t / 0.07));
    const dt = t - idx * 0.07;
    const f = freqs[idx];
    const tri = 2 * Math.abs(2 * ((t * f) % 1) - 1) - 1;
    const env = Math.exp(-dt * 18) * 0.35;
    return [tri * env, tri * env];
  });
}

function generateRollSFX() {
  return synthesizeTrack(0.65, (t) => {
    const f = 180 + Math.sin(t * Math.PI / 0.65) * 540;
    const noise = ((Math.sin(t * 9876.54) * 43758.545) % 1) * 0.4;
    const tone = Math.sin(t * Math.PI * 2 * f) * 0.6;
    const env = Math.sin(t * Math.PI / 0.65) * 0.35;
    return [(noise + tone) * env, (noise + tone) * env];
  });
}

function generateWarningSFX() {
  return synthesizeTrack(2.0, (t) => {
    const sirenF = 480 + Math.sin(t * Math.PI * 2 * 2.5) * 180;
    const saw = ((t * sirenF) % 1) * 2 - 1;
    const env = Math.min(1, t * 4) * Math.min(1, (2.0 - t) * 3) * 0.35;
    return [saw * env, saw * env];
  });
}

async function main() {
  // The background music is the licensed trailer theme shipped as
  // public/assets/audio/bgm_main.{ogg,m4a}; this script only renders
  // jingles and SFX, so re-running it never overwrites the music bed.
  const outDir = path.resolve("public/assets/audio");
  const workDir = path.resolve("audio/work");
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(workDir, { recursive: true });

  const tracks = [
    { id: "jingle_clear", kind: "jingle", loop: false, gain: 0.85, data: generateJingleClear() },
    { id: "jingle_gameover", kind: "jingle", loop: false, gain: 0.85, data: generateJingleGameOver() },
    { id: "sfx_shot1", kind: "sfx", maxVoices: 4, gain: 0.45, data: generateShotSFX(1) },
    { id: "sfx_shot2", kind: "sfx", maxVoices: 4, gain: 0.45, data: generateShotSFX(2) },
    { id: "sfx_shot3", kind: "sfx", maxVoices: 4, gain: 0.5, data: generateShotSFX(3) },
    { id: "sfx_explode_s", kind: "sfx", maxVoices: 6, gain: 0.4, data: generateExplosionSFX("s") },
    { id: "sfx_explode_m", kind: "sfx", maxVoices: 6, gain: 0.5, data: generateExplosionSFX("m") },
    { id: "sfx_explode_l", kind: "sfx", maxVoices: 6, gain: 0.6, data: generateExplosionSFX("l") },
    { id: "sfx_explode_boss", kind: "sfx", maxVoices: 4, gain: 0.7, data: generateExplosionSFX("boss") },
    { id: "sfx_pickup", kind: "sfx", maxVoices: 3, gain: 0.5, data: generatePickupSFX() },
    { id: "sfx_roll", kind: "sfx", maxVoices: 2, gain: 0.5, data: generateRollSFX() },
    { id: "sfx_warning", kind: "sfx", maxVoices: 2, gain: 0.6, data: generateWarningSFX() },
  ];

  const manifestSounds = {};

  for (const track of tracks) {
    const wavPath = path.join(workDir, `${track.id}.wav`);
    const oggPath = path.join(outDir, `${track.id}.ogg`);
    const m4aPath = path.join(outDir, `${track.id}.m4a`);

    fs.writeFileSync(wavPath, track.data);

    // Encode to .ogg (Vorbis) with optimal quality for web arcade
    execSync(`ffmpeg -y -v error -i "${wavPath}" -c:a libvorbis -q:a 2 "${oggPath}"`);

    // Encode to .m4a (AAC)
    execSync(`ffmpeg -y -v error -i "${wavPath}" -c:a aac -b:a 96k "${m4aPath}"`);

    manifestSounds[track.id] = {
      base: `assets/audio/${track.id}`,
      kind: track.kind,
      gain: track.gain,
      ...(track.loop !== undefined ? { loop: track.loop, loopStart: track.loopStart, loopEnd: track.loopEnd } : {}),
      ...(track.maxVoices ? { maxVoices: track.maxVoices } : {}),
    };

    console.log(`Rendered audio: ${track.id} -> ogg + m4a`);
  }

  const manifest = {
    version: 1,
    formats: ["ogg", "m4a"],
    sounds: manifestSounds,
  };

  fs.writeFileSync(path.resolve("public/assets/audio.json"), JSON.stringify(manifest, null, 2));
  console.log("Audio manifest written to public/assets/audio.json");
}

main().catch((err) => {
  console.error("render-audio failed:", err);
  process.exit(1);
});
