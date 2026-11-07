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

// Procedural synthesizer helper functions
function noteToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
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

// 1. bgm_title: Heroic military march with brass fanfare & timpani (24s loop)
function generateTitleBGM(duration = 24.0) {
  return synthesizeTrack(duration, (t) => {
    let mixL = 0;
    let mixR = 0;

    // Tempo: 120 BPM -> 2 beats per sec, 0.5s per beat
    const beat = t * 2.0;
    const bar = Math.floor(beat / 4);

    // Snare military march roll: 16th notes with accent
    const step16 = (beat * 4) % 1;
    const isAccent = Math.floor(beat * 4) % 4 === 0;
    const snareVol = Math.exp(-step16 * 14) * (isAccent ? 0.35 : 0.18);
    const noise = (Math.sin(t * 12345.67) * 43758.5453) % 1;
    mixL += noise * snareVol;
    mixR += noise * snareVol;

    // Timpani / Kick on beat 1 & 3
    const kickPhase = (beat % 2);
    if (kickPhase < 0.25) {
      const kickFreq = 110 * Math.exp(-kickPhase * 16);
      const kick = Math.sin(t * Math.PI * 2 * kickFreq) * Math.exp(-kickPhase * 8) * 0.45;
      mixL += kick;
      mixR += kick;
    }

    // Heroic brass chords (D minor / F / C / G progression)
    const chords = [
      [50, 53, 57], // Dm
      [53, 57, 60], // F
      [48, 52, 55], // C
      [43, 47, 50], // G
    ];
    const chord = chords[bar % chords.length];
    for (const n of chord) {
      const f = noteToFreq(n);
      // Detuned saw waves for rich analog brass
      const saw1 = ((t * f) % 1) * 2 - 1;
      const saw2 = ((t * (f * 1.004)) % 1) * 2 - 1;
      const brass = (saw1 + saw2) * 0.08;
      mixL += brass * 0.9;
      mixR += brass * 1.1;
    }

    // Melodic brass trumpet lead on top
    const melodyNotes = [62, 65, 69, 72, 70, 69, 67, 65];
    const mNote = melodyNotes[Math.floor(beat) % melodyNotes.length];
    const mFreq = noteToFreq(mNote);
    const mSaw = ((t * mFreq) % 1) * 2 - 1;
    const mEnv = Math.exp(-(beat % 1) * 3) * 0.16;
    mixL += mSaw * mEnv;
    mixR += mSaw * mEnv;

    return [mixL, mixR];
  });
}

// 2. bgm_stage: Energetic driving 1942-style flight arcade theme (28s loop)
function generateStageBGM(duration = 28.0) {
  return synthesizeTrack(duration, (t) => {
    let mixL = 0;
    let mixR = 0;

    // Tempo: 136 BPM
    const beat = t * (136 / 60);

    // Fast 16th-note driving hi-hat & snare cadence
    const step16 = (beat * 4) % 1;
    const hat = ((Math.sin(t * 9999) * 43758) % 1) * Math.exp(-step16 * 20) * 0.12;
    mixL += hat;
    mixR += hat;

    // Punchy arcade bassline (8th notes octave jumping)
    const bassNotes = [38, 38, 50, 38, 41, 41, 53, 41];
    const bNote = bassNotes[Math.floor(beat * 2) % bassNotes.length];
    const bFreq = noteToFreq(bNote);
    const bPhase = (beat * 2) % 1;
    const bSquare = (Math.sin(t * Math.PI * 2 * bFreq) > 0 ? 1 : -1) * Math.exp(-bPhase * 5) * 0.28;
    mixL += bSquare;
    mixR += bSquare;

    // Triumphant arcade brass melody
    const leads = [62, 62, 65, 67, 69, 67, 65, 62, 65, 67, 69, 72, 74, 72, 69, 65];
    const lNote = leads[Math.floor(beat) % leads.length];
    const lFreq = noteToFreq(lNote);
    const lSaw = ((t * lFreq) % 1) * 2 - 1;
    const lEnv = Math.exp(-(beat % 1) * 2.5) * 0.18;
    mixL += lSaw * lEnv * 1.1;
    mixR += lSaw * lEnv * 0.9;

    return [mixL, mixR];
  });
}

// 2.5. bgm_stage2: Ragnarok Rift - Dark fast Norse combat beats with industrial war drums (24s loop)
function generateStage2BGM(duration = 24.0) {
  return synthesizeTrack(duration, (t) => {
    let mixL = 0;
    let mixR = 0;

    // Tempo: 148 BPM
    const beat = t * (148 / 60);

    // Heavy driving industrial kick on every beat with syncopated offbeats
    const kPhase = beat % 1;
    const kick = Math.sin(t * Math.PI * 2 * 85 * Math.exp(-kPhase * 20)) * Math.exp(-kPhase * 8) * 0.55;
    mixL += kick;
    mixR += kick;

    // Sharp metallic snare on beats 2 and 4
    const snareBeat = (beat + 1) % 2;
    if (snareBeat < 0.3) {
      const noise = ((Math.sin(t * 12345) * 43758) % 1) * Math.exp(-snareBeat * 16) * 0.35;
      mixL += noise;
      mixR += noise;
    }

    // Aggressive driving 16th saw bassline in D minor (38, 38, 41, 38, 43, 38, 45, 48)
    const bassNotes = [38, 38, 41, 38, 43, 38, 45, 48];
    const bNote = bassNotes[Math.floor(beat * 4) % bassNotes.length];
    const bFreq = noteToFreq(bNote);
    const bPhase = (beat * 4) % 1;
    const bSaw = (((t * bFreq) % 1) * 2 - 1) * Math.exp(-bPhase * 6) * 0.28;
    mixL += bSaw * 1.1;
    mixR += bSaw * 0.9;

    // Minor arpeggiated combat synth (D minor / F / A / C)
    const arpNotes = [62, 65, 69, 72, 74, 69, 65, 62];
    const aNote = arpNotes[Math.floor(beat * 8) % arpNotes.length];
    const aFreq = noteToFreq(aNote);
    const aPhase = (beat * 8) % 1;
    const aSquare = (Math.sin(t * Math.PI * 2 * aFreq) > 0 ? 1 : -1) * Math.exp(-aPhase * 9) * 0.14;
    mixL += aSquare * 1.2;
    mixR += aSquare * 0.8;

    return [mixL, mixR];
  });
}

// 2.8. bgm_midboss: Urgent syncopated war cadence with dramatic brass pulses (16s loop)
function generateMidbossBGM(duration = 16.0) {
  return synthesizeTrack(duration, (t) => {
    let mixL = 0;
    let mixR = 0;

    // Tempo: 142 BPM
    const beat = t * (142 / 60);

    // Double-pulse war kick
    const subPhase = (beat * 2) % 1;
    const kick = Math.sin(t * Math.PI * 2 * 95 * Math.exp(-subPhase * 16)) * Math.exp(-subPhase * 9) * 0.45;
    mixL += kick;
    mixR += kick;

    // Tense war horn stabs in minor chords
    const bar = Math.floor(beat / 4);
    const chords = [
      [50, 53, 57], // Dm
      [49, 52, 56], // C#dim
      [51, 55, 58], // D#m
      [46, 50, 53], // Bb
    ];
    const chord = chords[bar % chords.length];
    for (const n of chord) {
      const f = noteToFreq(n);
      const saw = ((t * f) % 1) * 2 - 1;
      const env = Math.exp(-(beat % 1) * 4) * 0.12;
      mixL += saw * env * 1.1;
      mixR += saw * env * 0.9;
    }

    // High tension staccato pulse
    const pulseNote = 74;
    const pFreq = noteToFreq(pulseNote);
    const pSaw = ((t * pFreq) % 1) * 2 - 1;
    const pEnv = Math.exp(-((beat * 4) % 1) * 12) * 0.09;
    mixL += pSaw * pEnv;
    mixR += pSaw * pEnv;

    return [mixL, mixR];
  });
}

// 3. bgm_boss: Tense minor-key pulse & rapid arpeggios (20s loop)
function generateBossBGM(duration = 20.0) {
  return synthesizeTrack(duration, (t) => {
    let mixL = 0;
    let mixR = 0;

    // Tempo: 144 BPM
    const beat = t * (144 / 60);

    // Industrial kick on every beat
    const kPhase = beat % 1;
    const kick = Math.sin(t * Math.PI * 2 * 90 * Math.exp(-kPhase * 18)) * Math.exp(-kPhase * 7) * 0.5;
    mixL += kick;
    mixR += kick;

    // Tense 16th-note synth arpeggio (C minor / Eb / G)
    const arp = [48, 51, 55, 60, 63, 67, 63, 60];
    const aNote = arp[Math.floor(beat * 4) % arp.length];
    const aFreq = noteToFreq(aNote);
    const aPhase = (beat * 4) % 1;
    const aSaw = ((t * aFreq) % 1) * 2 - 1 * Math.exp(-aPhase * 8) * 0.18;
    mixL += aSaw * 1.2;
    mixR += aSaw * 0.8;

    // Warning alarm siren element
    const siren = Math.sin(t * Math.PI * 2 * (440 + Math.sin(t * 6) * 120)) * 0.08;
    mixL += siren;
    mixR += siren;

    return [mixL, mixR];
  });
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
  const outDir = path.resolve("public/assets/audio");
  const workDir = path.resolve("audio/work");
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(workDir, { recursive: true });

  const tracks = [
    { id: "bgm_title", kind: "bgm", loop: true, loopStart: 0, loopEnd: 24.0, gain: 0.75, data: generateTitleBGM(24.0) },
    { id: "bgm_stage", kind: "bgm", loop: true, loopStart: 0, loopEnd: 28.0, gain: 0.75, data: generateStageBGM(28.0) },
    { id: "bgm_stage2", kind: "bgm", loop: true, loopStart: 0, loopEnd: 24.0, gain: 0.75, data: generateStage2BGM(24.0) },
    { id: "bgm_midboss", kind: "bgm", loop: true, loopStart: 0, loopEnd: 16.0, gain: 0.8, data: generateMidbossBGM(16.0) },
    { id: "bgm_boss", kind: "bgm", loop: true, loopStart: 0, loopEnd: 20.0, gain: 0.8, data: generateBossBGM(20.0) },
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

    // Encode to .ogg (Vorbis)
    execSync(`ffmpeg -y -v error -i "${wavPath}" -c:a libvorbis -q:a 4 "${oggPath}"`);

    // Encode to .m4a (AAC)
    execSync(`ffmpeg -y -v error -i "${wavPath}" -c:a aac -b:a 128k "${m4aPath}"`);

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
