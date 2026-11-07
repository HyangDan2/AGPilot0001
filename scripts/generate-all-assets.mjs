import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const ENEMY_OUT_DIR = path.resolve("public/assets/enemies");
const EIRA_OUT_DIR = path.resolve("public/assets/characters/eira");
const EIRA_FRAMES_DIR = path.resolve("public/assets/characters/eira/frames");

fs.mkdirSync(ENEMY_OUT_DIR, { recursive: true });
fs.mkdirSync(EIRA_OUT_DIR, { recursive: true });
fs.mkdirSync(EIRA_FRAMES_DIR, { recursive: true });

// --- 1. EIRA CANONICAL SPRITE GENERATION (8 Idle, 12 Roll, 2 Slash, Banking, Thrust) ---

function getEiraSvg(action, step = 0) {
  // 128x128 canonical Eira vector
  // High-angle 3/4 top-down view
  let rot = 0;
  let scaleX = 1;
  let scaleY = 1;
  let braidAngle = 0;
  let skirtWave = 0;
  let swordAngle = 35; // Default ready stance (diagonal back/right)
  let swordGlow = "#44d7f5";
  let thrustOffset = 0;
  let bankRoll = 0;

  if (action === "idle") {
    // 8-step cycle
    const phase = (step / 8) * Math.PI * 2;
    skirtWave = Math.sin(phase) * 6;
    braidAngle = Math.sin(phase + 0.5) * 5;
    swordAngle = 35 + Math.sin(phase) * 3;
  } else if (action === "roll") {
    // 12-step 360 axial roll
    rot = (step / 12) * 360;
    const rad = (step / 12) * Math.PI * 2;
    scaleX = 0.35 + 0.65 * Math.abs(Math.cos(rad));
    scaleY = 0.8 + 0.2 * Math.abs(Math.sin(rad));
    skirtWave = Math.sin(rad * 2) * 8;
  } else if (action === "bank_left") {
    bankRoll = -18;
    skirtWave = 8;
    braidAngle = 10;
  } else if (action === "bank_right") {
    bankRoll = 18;
    skirtWave = -8;
    braidAngle = -10;
  } else if (action === "hover") {
    skirtWave = 4;
    swordAngle = 38;
  } else if (action === "thrust") {
    thrustOffset = -8;
    swordAngle = -15; // Pointed straight forward
    swordGlow = "#ffffff";
  } else if (action === "slash_0") {
    // Left-to-right slash pose
    swordAngle = -75;
    swordGlow = "#44d7f5";
    skirtWave = -10;
  } else if (action === "slash_1") {
    // Right-to-left slash pose
    swordAngle = 65;
    swordGlow = "#f8c050";
    skirtWave = 10;
  } else if (action === "charge") {
    swordAngle = 10;
    swordGlow = "#f8c050";
    scaleX = 1.05;
    scaleY = 1.05;
  } else if (action === "power_up") {
    swordAngle = 0;
    swordGlow = "#ffd700";
    scaleX = 1.1;
    scaleY = 1.1;
  }

  return `
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <radialGradient id="wing-shimmer" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="70%" stop-color="#e2e8f0" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </radialGradient>
  </defs>

  <g transform="translate(64, 64) rotate(${rot + bankRoll}) scale(${scaleX}, ${scaleY}) translate(-64, -64)">
    <!-- 1. Drop shadow / flight glow -->
    <ellipse cx="64" cy="98" rx="28" ry="12" fill="rgba(68, 215, 245, 0.18)" />

    <!-- 2. Trailing Silver Braid with Red Ribbon -->
    <g transform="translate(64, 52) rotate(${braidAngle}) translate(-64, -52)">
      <!-- Silver braid segments -->
      <path d="M60,52 Q${56 + braidAngle},72 62,88 Q${60 + braidAngle},96 64,104" 
            fill="none" stroke="#cbd5e1" stroke-width="6.5" stroke-linecap="round" />
      <path d="M60,52 Q${56 + braidAngle},72 62,88 Q${60 + braidAngle},96 64,104" 
            fill="none" stroke="#f1f5f9" stroke-width="3" stroke-linecap="round" />
      <!-- Canonical bright red ribbon at tip -->
      <path d="M64,102 C60,105 54,108 52,114 C56,112 62,108 64,105 C66,108 72,112 76,114 C74,108 68,105 64,102 Z" 
            fill="#ff3b56" />
      <circle cx="64" cy="103" r="2.5" fill="#f8c050" />
    </g>

    <!-- 3. Multi-Layered Flowing Ivory Skirt with Gold Embroidery -->
    <g transform="translate(0, ${thrustOffset * 0.3})">
      <!-- Underlayer dark royal blue shorts/petticoat -->
      <path d="M54,68 L74,68 L70,82 L58,82 Z" fill="#1e3a8a" />
      <!-- Outer layered ivory skirt petals -->
      <path d="M50,68 C44,78 ${42 + skirtWave},92 ${48 + skirtWave},102 C56,98 62,94 64,88 C66,94 72,98 ${80 - skirtWave},102 C${86 - skirtWave},92 84,78 78,68 Z" 
            fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
      <!-- Gold geometric embroidery trim -->
      <path d="M50,96 Q64,88 78,96" fill="none" stroke="#f8c050" stroke-width="2.5" />
      <!-- Hanging golden cylindrical tassels -->
      <rect x="${51 + skirtWave * 0.5}" y="98" width="2.5" height="7" rx="1" fill="#f8c050" />
      <rect x="63" y="94" width="2.5" height="7" rx="1" fill="#f8c050" />
      <rect x="${74 - skirtWave * 0.5}" y="98" width="2.5" height="7" rx="1" fill="#f8c050" />
    </g>

    <!-- 4. Pointed Armored Boots & Greaves -->
    <polygon points="56,82 53,100 58,108 60,84" fill="#1e3a8a" stroke="#f8c050" stroke-width="1.2" />
    <polygon points="72,82 75,100 70,108 68,84" fill="#1e3a8a" stroke="#f8c050" stroke-width="1.2" />

    <!-- 5. Royal Blue & Polished Gold Cuirass with Central Diamond Pectoral Gem -->
    <g transform="translate(0, ${thrustOffset})">
      <!-- Backplate / Pauldrons -->
      <path d="M42,48 L54,42 L74,42 L86,48 L82,62 L46,62 Z" fill="#1e3a8a" stroke="#f8c050" stroke-width="2" />
      <!-- Golden Pauldron Winglets -->
      <polygon points="40,46 32,50 36,60 44,56" fill="#f8c050" stroke="#b45309" stroke-width="1" />
      <polygon points="88,46 96,50 92,60 84,56" fill="#f8c050" stroke="#b45309" stroke-width="1" />
      <!-- Central Diamond Gem -->
      <polygon points="64,48 70,55 64,62 58,55" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" filter="url(#glow-cyan)" />
      <!-- Gold Filigree Chest Brackets -->
      <path d="M52,50 L58,55 L52,60 M76,50 L70,55 L76,60" fill="none" stroke="#f8c050" stroke-width="1.8" />
    </g>

    <!-- 6. Valkyrie Winged Helmet & Silver Hair -->
    <g transform="translate(0, ${thrustOffset})">
      <!-- Silver hair head base -->
      <circle cx="64" cy="38" r="14" fill="#cbd5e1" />
      <!-- Fitted Valkyrie Helmet Cap -->
      <path d="M52,36 C52,28 57,24 64,24 C71,24 76,28 76,36 C74,40 54,40 52,36 Z" 
            fill="#1e3a8a" stroke="#f8c050" stroke-width="1.5" />
      <!-- Golden Sunburst Rosettes at Temples -->
      <circle cx="51" cy="35" r="3.5" fill="#f8c050" stroke="#b45309" stroke-width="1" />
      <circle cx="77" cy="35" r="3.5" fill="#f8c050" stroke="#b45309" stroke-width="1" />
      <!-- Dual White Feathered Wings -->
      <!-- Left Wing -->
      <path d="M50,35 C42,26 30,20 22,22 C26,29 34,34 46,38 C36,36 28,40 26,45 C32,46 42,44 48,42 Z" 
            fill="url(#wing-shimmer)" stroke="#cbd5e1" stroke-width="1.2" />
      <!-- Right Wing -->
      <path d="M78,35 C86,26 98,20 106,22 C102,29 94,34 82,38 C92,36 100,40 102,45 C96,46 86,44 80,42 Z" 
            fill="url(#wing-shimmer)" stroke="#cbd5e1" stroke-width="1.2" />
    </g>

    <!-- 7. Straight Two-Handed Oathblade with Winged Gold Crossguard -->
    <g transform="translate(74, 52) rotate(${swordAngle}) translate(-74, -52)">
      <!-- Sword blade with central fuller -->
      <polygon points="72,52 74,-8 76,-8 78,52" fill="#ffffff" stroke="${swordGlow}" stroke-width="2" filter="url(#glow-cyan)" />
      <!-- Tapered Sharp Tip -->
      <polygon points="73,-8 75,-16 77,-8" fill="#ffffff" stroke="${swordGlow}" stroke-width="1.5" />
      <!-- Winged Gold Crossguard with Blue Jewel -->
      <polygon points="62,52 74,47 76,47 88,52 75,56" fill="#f8c050" stroke="#b45309" stroke-width="1.2" />
      <circle cx="75" cy="51" r="2.5" fill="#38bdf8" />
      <!-- Royal blue grip & gold pommel -->
      <rect x="73.5" y="56" width="3" height="12" fill="#1e3a8a" />
      <circle cx="75" cy="70" r="3" fill="#f8c050" />
    </g>
  </g>
</svg>
`;
}

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

  // 1. Generate Eira 8x4 Grid (1024x512)
  console.log("Generating Eira Animation Sprites (8 Idle, 12 Roll, 2 Slash, Maneuvers)...");
  const cellW = 128;
  const cellH = 128;
  const cols = 8;
  const rows = 4;
  const eiraWidth = cols * cellW; // 1024
  const eiraHeight = rows * cellH; // 512

  const eiraFramesLayout = [
    // Row 0: 8 Idle frames
    "idle_0", "idle_1", "idle_2", "idle_3", "idle_4", "idle_5", "idle_6", "idle_7",
    // Row 1: Roll 0..7
    "roll_0", "roll_1", "roll_2", "roll_3", "roll_4", "roll_5", "roll_6", "roll_7",
    // Row 2: Roll 8..11 + Maneuvers
    "roll_8", "roll_9", "roll_10", "roll_11", "bank_left", "hover", "bank_right", "thrust",
    // Row 3: Combat
    "slash_0", "slash_1", "charge", "power_up", "idle_0", "idle_1", "idle_2", "idle_3"
  ];

  const eiraComposites = [];
  const eiraMeta = {
    meta: {
      image: "assets/characters/eira/eira-flight.png",
      size: { w: eiraWidth, h: eiraHeight },
      cell: 128
    },
    animations: {
      idle: ["idle_0", "idle_1", "idle_2", "idle_3", "idle_4", "idle_5", "idle_6", "idle_7"],
      roll: ["roll_0", "roll_1", "roll_2", "roll_3", "roll_4", "roll_5", "roll_6", "roll_7", "roll_8", "roll_9", "roll_10", "roll_11"],
      bankLeft: ["bank_left"],
      bankRight: ["bank_right"],
      hover: ["hover"],
      thrust: ["thrust"],
      slashLeft: ["slash_0"],
      slashRight: ["slash_1"],
      charge: ["charge"],
      powerUp: ["power_up"]
    },
    frames: {}
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const name = eiraFramesLayout[idx];
      let svg = "";
      if (name.startsWith("idle_")) {
        const step = parseInt(name.replace("idle_", ""), 10);
        svg = getEiraSvg("idle", step);
      } else if (name.startsWith("roll_")) {
        const step = parseInt(name.replace("roll_", ""), 10);
        svg = getEiraSvg("roll", step);
      } else {
        svg = getEiraSvg(name);
      }

      const frameBuf = await sharp(Buffer.from(svg)).png().toBuffer();
      // Save individual frame png
      const framePath = path.join(EIRA_FRAMES_DIR, `${name}.png`);
      fs.writeFileSync(framePath, frameBuf);

      const x = c * cellW;
      const y = r * cellH;
      eiraComposites.push({ input: frameBuf, left: x, top: y });

      if (!eiraMeta.frames[name]) {
        eiraMeta.frames[name] = {
          x, y, w: cellW, h: cellH, anchorX: 64, anchorY: 64
        };
      }
    }
  }

  // Assemble eira-flight.png
  await sharp({
    create: {
      width: eiraWidth,
      height: eiraHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(eiraComposites)
    .png()
    .toFile(path.join(EIRA_OUT_DIR, "eira-flight.png"));

  fs.writeFileSync(
    path.join(EIRA_OUT_DIR, "eira-flight.json"),
    JSON.stringify(eiraMeta, null, 2)
  );
  console.log("Eira spritesheet generated successfully at:", path.join(EIRA_OUT_DIR, "eira-flight.png"));

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
