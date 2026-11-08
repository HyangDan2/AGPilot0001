import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const ENEMY_OUT_DIR = path.resolve("public/assets/enemies");
const EIRA_OUT_DIR = path.resolve("public/assets/characters/eira");
const EIRA_FRAMES_DIR = path.resolve("public/assets/characters/eira/frames");

fs.mkdirSync(ENEMY_OUT_DIR, { recursive: true });
fs.mkdirSync(EIRA_OUT_DIR, { recursive: true });
fs.mkdirSync(EIRA_FRAMES_DIR, { recursive: true });

// Eira artwork is USER-APPROVED and MUST NOT be procedurally regenerated.
// The original character sprite atlas is maintained by restore-eira-original.mjs.
// The enemy generator below is isolated from Eira canonical assets.

// --- 2. ENEMY SPRITE VECTOR TEMPLATES ---

const ENEMY_SPECS = {
  // Stage 1 Final Boss
  celestial_guardian: {
    w: 520, h: 280,
    render: () => `
<svg width="520" height="280" viewBox="0 0 520 280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sun-core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="40%" stop-color="#f8c050" />
      <stop offset="80%" stop-color="#e08e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </radialGradient>
    <linearGradient id="feather-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="50%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#f8c050" />
    </linearGradient>
  </defs>
  <!-- Celestial Sun Halo -->
  <circle cx="260" cy="140" r="90" fill="none" stroke="#f8c050" stroke-width="4" stroke-dasharray="14,10" />
  <circle cx="260" cy="140" r="72" fill="none" stroke="#38bdf8" stroke-width="3" />
  <!-- Massive Sun Wings (Left) -->
  <path d="M220,120 C160,40 60,30 20,70 C60,110 140,130 200,140 Z" fill="url(#feather-gold)" stroke="#d97706" stroke-width="2.5" />
  <path d="M200,135 C140,80 70,80 40,130 C90,150 150,155 190,155 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
  <!-- Massive Sun Wings (Right) -->
  <path d="M300,120 C360,40 460,30 500,70 C460,110 380,130 320,140 Z" fill="url(#feather-gold)" stroke="#d97706" stroke-width="2.5" />
  <path d="M320,135 C380,80 450,80 480,130 C430,150 370,155 330,155 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
  <!-- Archon Sovereign Core Body -->
  <polygon points="260,60 295,110 280,190 260,225 240,190 225,110" fill="url(#sun-core)" stroke="#ffffff" stroke-width="3" />
  <!-- Golden Sun Crown & Temple Runes -->
  <circle cx="260" cy="130" r="28" fill="#ffffff" stroke="#f8c050" stroke-width="4" />
  <circle cx="260" cy="130" r="14" fill="#38bdf8" />
  <!-- Solar Lance Tail -->
  <polygon points="260,210 268,260 260,275 252,260" fill="#f8c050" stroke="#ffffff" stroke-width="2" />
</svg>
`
  },

  // Stage 2 Enemies
  siren: {
    w: 160, h: 140,
    render: () => `
<svg width="160" height="140" viewBox="0 0 160 140" xmlns="http://www.w3.org/2000/svg">
  <!-- Abyssal Phantom: Needle wings, violet aura, crimson eye -->
  <path d="M80,20 C50,45 20,55 8,75 C25,82 55,75 75,70 L80,110 L85,70 C105,75 135,82 152,75 C140,55 110,45 80,20 Z" 
        fill="#3b0764" stroke="#a855f7" stroke-width="2.5" />
  <path d="M80,30 L60,65 L100,65 Z" fill="#581c87" />
  <circle cx="80" cy="55" r="7" fill="#ff0055" stroke="#ffffff" stroke-width="1.8" />
  <path d="M80,75 L74,125 L80,135 L86,125 Z" fill="#7e22ce" stroke="#ff0055" stroke-width="1.5" />
</svg>
`
  },

  seraph: {
    w: 180, h: 160,
    render: () => `
<svg width="180" height="160" viewBox="0 0 180 160" xmlns="http://www.w3.org/2000/svg">
  <!-- Shadow Drake: Barbed obsidian wings with crimson spines -->
  <path d="M90,20 C60,40 20,40 5,65 C30,70 65,65 85,85 L90,140 L95,85 C115,65 150,70 175,65 C160,40 120,40 90,20 Z" 
        fill="#1e112a" stroke="#ff0055" stroke-width="2.5" />
  <path d="M35,50 L20,30 M65,48 L60,25 M145,50 L160,30 M115,48 L120,25" stroke="#ff0055" stroke-width="2.5" stroke-linecap="round" />
  <polygon points="90,40 105,75 90,110 75,75" fill="#4c0519" stroke="#fb7185" stroke-width="2" />
  <circle cx="90" cy="72" r="6" fill="#f43f5e" />
</svg>
`
  },

  golem: {
    w: 180, h: 200,
    render: () => `
<svg width="180" height="200" viewBox="0 0 180 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Obsidian Golem: Heavy monolith basalt plates with molten fissures -->
  <rect x="35" y="30" width="110" height="130" rx="18" fill="#0f172a" stroke="#334155" stroke-width="4" />
  <path d="M50,45 L80,85 L65,115 L100,145" fill="none" stroke="#ff0055" stroke-width="4.5" stroke-linecap="round" />
  <path d="M120,50 L105,80 L130,110" fill="none" stroke="#ff5468" stroke-width="3.5" stroke-linecap="round" />
  <!-- Monolith Pauldrons -->
  <polygon points="20,60 38,40 38,100 15,90" fill="#1e293b" stroke="#ff0055" stroke-width="2" />
  <polygon points="160,60 142,40 142,100 165,90" fill="#1e293b" stroke="#ff0055" stroke-width="2" />
  <!-- Core Eye -->
  <polygon points="90,75 102,90 90,105 78,90" fill="#ff0055" stroke="#ffffff" stroke-width="2" />
</svg>
`
  },

  kraken: {
    w: 420, h: 260,
    render: () => `
<svg width="420" height="260" viewBox="0 0 420 260" xmlns="http://www.w3.org/2000/svg">
  <!-- Abyssal Sentinel Midboss (Kraken): Obsidian shell + 4 tentacles -->
  <!-- Tentacles -->
  <path d="M110,130 C70,170 40,210 60,250 C80,230 100,180 130,150 Z" fill="#3b0764" stroke="#a855f7" stroke-width="2" />
  <path d="M150,150 C120,200 100,240 130,260 C150,230 160,190 170,160 Z" fill="#3b0764" stroke="#a855f7" stroke-width="2" />
  <path d="M270,160 C260,190 270,230 290,260 C320,240 300,200 270,150 Z" fill="#3b0764" stroke="#a855f7" stroke-width="2" />
  <path d="M290,150 C320,180 340,230 360,250 C380,210 350,170 310,130 Z" fill="#3b0764" stroke="#a855f7" stroke-width="2" />
  <!-- Central Carapace Shell -->
  <ellipse cx="210" cy="110" rx="140" ry="85" fill="#1e112a" stroke="#a855f7" stroke-width="4" />
  <polygon points="210,40 240,75 230,120 210,140 190,120 180,75" fill="#4c0519" stroke="#ff0055" stroke-width="2.5" />
  <!-- 4 Sentinel Eyes -->
  <circle cx="150" cy="100" r="10" fill="#ff0055" stroke="#ffffff" stroke-width="2" />
  <circle cx="185" cy="120" r="12" fill="#ff0055" stroke="#ffffff" stroke-width="2" />
  <circle cx="235" cy="120" r="12" fill="#ff0055" stroke="#ffffff" stroke-width="2" />
  <circle cx="270" cy="100" r="10" fill="#ff0055" stroke="#ffffff" stroke-width="2" />
</svg>
`
  },

  // Stage 3 Enemies
  seed_wisp: {
    w: 150, h: 140,
    render: () => `
<svg width="150" height="140" viewBox="0 0 150 140" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="wisp-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="50%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#059669" />
    </radialGradient>
  </defs>
  <!-- Emerald Spore Shell -->
  <path d="M75,15 C45,35 25,65 35,100 C50,125 100,125 115,100 C125,65 105,35 75,15 Z" 
        fill="rgba(5, 150, 105, 0.4)" stroke="#34d399" stroke-width="3" />
  <!-- Luminous Seed Core -->
  <ellipse cx="75" cy="70" rx="26" ry="34" fill="url(#wisp-glow)" stroke="#ffffff" stroke-width="2" />
  <!-- Spore antenna pods -->
  <circle cx="50" cy="35" r="5" fill="#fef08a" />
  <circle cx="100" cy="35" r="5" fill="#fef08a" />
  <circle cx="75" cy="120" r="4" fill="#34d399" />
</svg>
`
  },

  thorn_mantis: {
    w: 170, h: 160,
    render: () => `
<svg width="170" height="160" viewBox="0 0 170 160" xmlns="http://www.w3.org/2000/svg">
  <!-- Thorn Mantis: Emerald scythe blades & insect thorax -->
  <!-- Scythe Forelegs -->
  <path d="M60,40 C35,20 15,35 8,65 C18,70 40,55 58,58 Z" fill="#047857" stroke="#6ee7b7" stroke-width="2.5" />
  <path d="M110,40 C135,20 155,35 162,65 C152,70 130,55 112,58 Z" fill="#047857" stroke="#6ee7b7" stroke-width="2.5" />
  <!-- Thorax & Wings -->
  <polygon points="85,25 105,65 95,120 85,150 75,120 65,65" fill="#065f46" stroke="#34d399" stroke-width="2.5" />
  <path d="M85,50 C65,70 50,105 55,130 C70,120 80,95 85,75 Z" fill="rgba(110, 231, 183, 0.5)" stroke="#34d399" stroke-width="1.5" />
  <path d="M85,50 C105,70 120,105 115,130 C100,120 90,95 85,75 Z" fill="rgba(110, 231, 183, 0.5)" stroke="#34d399" stroke-width="1.5" />
  <!-- Golden compound eyes -->
  <circle cx="76" cy="36" r="4.5" fill="#f59e0b" />
  <circle cx="94" cy="36" r="4.5" fill="#f59e0b" />
</svg>
`
  },

  amber_moth: {
    w: 220, h: 180,
    render: () => `
<svg width="220" height="180" viewBox="0 0 220 180" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="amber-core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="50%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </radialGradient>
  </defs>
  <!-- Amber Moth: Broad golden patterned wings with eye-spots -->
  <!-- Left Wing -->
  <path d="M100,70 C60,20 20,25 5,55 C0,95 40,135 90,120 Z" fill="url(#amber-core)" stroke="#78350f" stroke-width="2.5" />
  <circle cx="50" cy="70" r="14" fill="#047857" stroke="#fef08a" stroke-width="2.5" />
  <!-- Right Wing -->
  <path d="M120,70 C160,20 200,25 215,55 C220,95 180,135 130,120 Z" fill="url(#amber-core)" stroke="#78350f" stroke-width="2.5" />
  <circle cx="170" cy="70" r="14" fill="#047857" stroke="#fef08a" stroke-width="2.5" />
  <!-- Velvety Moth Body -->
  <ellipse cx="110" cy="85" rx="14" ry="45" fill="#451a03" stroke="#fbbf24" stroke-width="2" />
  <!-- Feathery Antennae -->
  <path d="M106,42 Q90,20 75,18" fill="none" stroke="#fef08a" stroke-width="2.5" stroke-linecap="round" />
  <path d="M114,42 Q130,20 145,18" fill="none" stroke="#fef08a" stroke-width="2.5" stroke-linecap="round" />
</svg>
`
  },

  root_guardian: {
    w: 240, h: 220,
    render: () => `
<svg width="240" height="220" viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg">
  <!-- Root Guardian: Armored petrified ironwood trunk with root claws -->
  <path d="M60,40 C80,25 160,25 180,40 C195,80 185,160 165,195 C120,185 80,185 75,195 C55,160 45,80 60,40 Z" 
        fill="#292524" stroke="#78716c" stroke-width="4" />
  <!-- Ancient Woodgrain & Emerald Moss Patches -->
  <path d="M85,50 Q105,100 95,160 M145,55 Q130,110 140,155" fill="none" stroke="#059669" stroke-width="4" stroke-linecap="round" />
  <!-- Heavy Root Shoulders -->
  <polygon points="35,60 65,40 55,110 25,95" fill="#44403c" stroke="#10b981" stroke-width="2" />
  <polygon points="205,60 175,40 185,110 215,95" fill="#44403c" stroke="#10b981" stroke-width="2" />
  <!-- Runic Tree Heart Knot -->
  <circle cx="120" cy="110" r="18" fill="#10b981" stroke="#ffffff" stroke-width="3" />
</svg>
`
  },

  hollow_stag: {
    w: 420, h: 280,
    render: () => `
<svg width="420" height="280" viewBox="0 0 420 280" xmlns="http://www.w3.org/2000/svg">
  <!-- Hollow Stag Midboss: Runic antler spread with seed burst nodes -->
  <!-- Left Runic Antler -->
  <path d="M170,110 C140,70 100,50 60,60 C40,70 50,90 70,85 C60,50 110,40 130,70 C100,50 90,80 120,95 Z" 
        fill="#15803d" stroke="#fef08a" stroke-width="3" />
  <circle cx="60" cy="60" r="8" fill="#f59e0b" stroke="#ffffff" stroke-width="2" />
  <circle cx="100" cy="50" r="7" fill="#34d399" />
  <!-- Right Runic Antler -->
  <path d="M250,110 C280,70 320,50 360,60 C380,70 370,90 350,85 C360,50 310,40 290,70 C320,50 330,80 300,95 Z" 
        fill="#15803d" stroke="#fef08a" stroke-width="3" />
  <circle cx="360" cy="60" r="8" fill="#f59e0b" stroke="#ffffff" stroke-width="2" />
  <circle cx="320" cy="50" r="7" fill="#34d399" />
  <!-- Root-Carved Stag Head & Body -->
  <polygon points="210,70 245,120 230,220 210,250 190,220 175,120" fill="#292524" stroke="#34d399" stroke-width="3.5" />
  <!-- Runic Forehead Crest -->
  <polygon points="210,100 225,125 210,150 195,125" fill="#f59e0b" stroke="#ffffff" stroke-width="2" />
  <circle cx="210" cy="125" r="6" fill="#34d399" />
  <!-- Glowing Luminous Eyes -->
  <ellipse cx="192" cy="115" rx="5" ry="8" fill="#fef08a" />
  <ellipse cx="228" cy="115" rx="5" ry="8" fill="#fef08a" />
</svg>
`
  },

  fate_weaver: {
    w: 560, h: 320,
    render: () => `
<svg width="560" height="320" viewBox="0 0 560 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="fate-loom-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="40%" stop-color="#a855f7" />
      <stop offset="80%" stop-color="#3b0764" />
      <stop offset="100%" stop-color="#090514" />
    </radialGradient>
  </defs>
  <!-- The Fate Weaver: Massive cosmic rune loom with interwoven destiny threads -->
  <!-- Concentric Cosmic Loom Rings -->
  <circle cx="280" cy="160" r="140" fill="none" stroke="#a855f7" stroke-width="4" stroke-dasharray="24,14" />
  <circle cx="280" cy="160" r="115" fill="none" stroke="#ec4899" stroke-width="3" stroke-dasharray="16,8" />
  <circle cx="280" cy="160" r="85" fill="url(#fate-loom-glow)" stroke="#ffffff" stroke-width="3" />
  <!-- Radiating Destiny Threads -->
  <path d="M120,60 L280,160 L440,60 M100,160 L460,160 M120,260 L280,160 L440,260" 
        stroke="#f472b6" stroke-width="2.5" opacity="0.85" />
  <!-- 3 Destructible Spindles -->
  <!-- Left Spindle -->
  <g transform="translate(160, 160)">
    <rect x="-16" y="-35" width="32" height="70" rx="8" fill="#701a75" stroke="#f472b6" stroke-width="2.5" />
    <circle cx="0" cy="0" r="10" fill="#ffffff" />
  </g>
  <!-- Right Spindle -->
  <g transform="translate(400, 160)">
    <rect x="-16" y="-35" width="32" height="70" rx="8" fill="#701a75" stroke="#f472b6" stroke-width="2.5" />
    <circle cx="0" cy="0" r="10" fill="#ffffff" />
  </g>
  <!-- Crown Loom Node -->
  <g transform="translate(280, 50)">
    <polygon points="0,-25 25,15 -25,15" fill="#f59e0b" stroke="#ffffff" stroke-width="2.5" />
    <circle cx="0" cy="3" r="7" fill="#ec4899" />
  </g>
  <!-- Central Fate Eye Core -->
  <circle cx="280" cy="160" r="28" fill="#ffffff" stroke="#a855f7" stroke-width="4" />
  <ellipse cx="280" cy="160" rx="10" ry="22" fill="#3b0764" />
</svg>
`
  }
};

async function main() {
  console.log("=== Generating All Game Assets for v0.9.0 ===");

  // EIRA LOCK: never touch public/assets/characters/eira from this generator.
  // Use 'npm run art:eira' to generate from v0.7.1 approved source PNG frames.

  // 2. Generate All Enemy PNGs
  console.log("Generating Enemy Sprites for Stage 1, 2, and 3...");
  const generatedEnemies = {};
  for (const [id, spec] of Object.entries(ENEMY_SPECS)) {
    const svg = spec.render();
    const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer();
    const filePath = path.join(ENEMY_OUT_DIR, `${id}.png`);
    fs.writeFileSync(filePath, pngBuf);
    generatedEnemies[id] = { id, filePath, w: spec.w, h: spec.h };
    console.log(`- Created ${id}.png (${spec.w}x${spec.h})`);
  }

  // 3. Assemble Master Enemies Atlas (2048x2048)
  console.log("Packing Enemies Master Atlas (2048x2048)...");
  const atlasDim = 2048;
  const atlasLayout = [
    // Stage 1 Base Enemies
    { id: "shadow_gargoyle", file: "shadow_gargoyle.png", x: 20, y: 20, w: 160, h: 140 },
    { id: "crimson_drake", file: "crimson_drake.png", x: 200, y: 20, w: 160, h: 160 },
    { id: "skyfang_phantom", file: "skyfang_phantom.png", x: 380, y: 20, w: 160, h: 160 },
    { id: "floating_bastion", file: "floating_bastion.png", x: 560, y: 20, w: 180, h: 220 },
    { id: "armored_behemoth", file: "armored_behemoth.png", x: 760, y: 20, w: 240, h: 250 },
    { id: "ancient_guardian", file: "ancient_guardian.png", x: 20, y: 290, w: 460, h: 260 },
    { id: "celestial_guardian", file: "celestial_guardian.png", x: 500, y: 290, w: 520, h: 280 },

    // Stage 2 Enemies
    { id: "siren", file: "siren.png", x: 1040, y: 20, w: 160, h: 140 },
    { id: "seraph", file: "seraph.png", x: 1220, y: 20, w: 180, h: 160 },
    { id: "golem", file: "golem.png", x: 1420, y: 20, w: 180, h: 200 },
    { id: "kraken", file: "kraken.png", x: 20, y: 590, w: 420, h: 260 },
    { id: "abyssal_dragon", file: "abyssal_dragon.png", x: 460, y: 590, w: 580, h: 300 },

    // Stage 3 Enemies
    { id: "seed_wisp", file: "seed_wisp.png", x: 1060, y: 240, w: 150, h: 140 },
    { id: "thorn_mantis", file: "thorn_mantis.png", x: 1230, y: 240, w: 170, h: 160 },
    { id: "amber_moth", file: "amber_moth.png", x: 1420, y: 240, w: 220, h: 180 },
    { id: "root_guardian", file: "root_guardian.png", x: 1060, y: 440, w: 240, h: 220 },
    { id: "hollow_stag", file: "hollow_stag.png", x: 20, y: 910, w: 420, h: 280 },
    { id: "fate_weaver", file: "fate_weaver.png", x: 460, y: 910, w: 560, h: 320 }
  ];

  const atlasComposites = [];
  const atlasMeta = {
    meta: { image: "assets/enemies/enemies-atlas.png", size: { w: atlasDim, h: atlasDim } },
    frames: {}
  };

  for (const item of atlasLayout) {
    const filePath = path.join(ENEMY_OUT_DIR, item.file);
    if (!fs.existsSync(filePath)) {
      console.warn("File missing for atlas:", filePath);
      continue;
    }
    const buf = await sharp(filePath)
      .resize(item.w, item.h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    atlasComposites.push({ input: buf, left: item.x, top: item.y });
    atlasMeta.frames[item.id] = {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      anchorX: Math.round(item.w / 2),
      anchorY: Math.round(item.h / 2)
    };
  }

  await sharp({
    create: {
      width: atlasDim,
      height: atlasDim,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(atlasComposites)
    .png()
    .toFile(path.join(ENEMY_OUT_DIR, "enemies-atlas.png"));

  fs.writeFileSync(
    path.join(ENEMY_OUT_DIR, "enemies-atlas.json"),
    JSON.stringify(atlasMeta, null, 2)
  );

  // 4. Update sprites.json
  const spritesJsonPath = path.resolve("public/assets/sprites.json");
  const spritesData = JSON.parse(fs.readFileSync(spritesJsonPath, "utf-8"));

  // Register all sprite IDs
  spritesData.sprites.celestialGuardian = {
    w: 520, h: 280, drawW: 520, drawH: 280, facing: "down", src: "assets/enemies/celestial_guardian.png"
  };
  spritesData.sprites.siren = {
    w: 160, h: 140, drawW: 88, drawH: 78, facing: "down", src: "assets/enemies/siren.png"
  };
  spritesData.sprites.seraph = {
    w: 180, h: 160, drawW: 96, drawH: 86, facing: "down", src: "assets/enemies/seraph.png"
  };
  spritesData.sprites.golem = {
    w: 180, h: 200, drawW: 110, drawH: 122, facing: "down", src: "assets/enemies/golem.png"
  };
  spritesData.sprites.kraken = {
    w: 420, h: 260, drawW: 340, drawH: 210, facing: "down", src: "assets/enemies/kraken.png"
  };
  spritesData.sprites.seedWisp = {
    w: 150, h: 140, drawW: 80, drawH: 75, facing: "down", src: "assets/enemies/seed_wisp.png"
  };
  spritesData.sprites.thornMantis = {
    w: 170, h: 160, drawW: 94, drawH: 88, facing: "down", src: "assets/enemies/thorn_mantis.png"
  };
  spritesData.sprites.amberMoth = {
    w: 220, h: 180, drawW: 120, drawH: 98, facing: "down", src: "assets/enemies/amber_moth.png"
  };
  spritesData.sprites.rootGuardian = {
    w: 240, h: 220, drawW: 140, drawH: 128, facing: "down", src: "assets/enemies/root_guardian.png"
  };
  spritesData.sprites.hollowStag = {
    w: 420, h: 280, drawW: 320, drawH: 212, facing: "down", src: "assets/enemies/hollow_stag.png"
  };
  spritesData.sprites.fateWeaver = {
    w: 560, h: 320, drawW: 520, drawH: 298, facing: "down", src: "assets/enemies/fate_weaver.png"
  };

  fs.writeFileSync(spritesJsonPath, JSON.stringify(spritesData, null, 2));

  console.log("All sprites and atlas assets generated successfully!");
}

main().catch((err) => {
  console.error("Asset generation failed:", err);
  process.exit(1);
});
