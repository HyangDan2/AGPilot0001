import {
  DT,
  Enemy,
  FIELD_H,
  FIELD_W,
  GameEvent,
  Pickup,
  Player,
  World,
} from "../sim/types";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind?: "spark" | "fire" | "smoke" | "shockwave" | "debris" | "water" | "rune";
  rot?: number;
  vrot?: number;
}

interface SpriteRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dw: number;
  dh: number;
}

const EIRA_CELL = 128;
const EIRA_FRAMES: Record<string, { sx: number; sy: number }> = {
  idle_0: { sx: 0, sy: 0 },
  idle_1: { sx: 128, sy: 0 },
  idle_2: { sx: 256, sy: 0 },
  idle_3: { sx: 384, sy: 0 },
  bank_left: { sx: 0, sy: 128 },
  hover: { sx: 128, sy: 128 },
  bank_right: { sx: 256, sy: 128 },
  thrust: { sx: 384, sy: 128 },
  slash_0: { sx: 0, sy: 256 },
  slash_1: { sx: 128, sy: 256 },
  charge: { sx: 256, sy: 256 },
  power_up: { sx: 384, sy: 256 },
  roll_0: { sx: 0, sy: 384 },
  roll_1: { sx: 128, sy: 384 },
  roll_2: { sx: 256, sy: 384 },
  roll_3: { sx: 384, sy: 384 },
};

const ENEMY_FRAMES: Record<string, SpriteRect> = {
  kestrel: { sx: 10, sy: 10, sw: 160, sh: 140, dw: 88, dh: 78 }, // Shadow Gargoyle
  kestrelRed: { sx: 180, sy: 10, sw: 160, sh: 160, dw: 88, dh: 88 }, // Crimson Drake
  harrier: { sx: 350, sy: 10, sw: 160, sh: 160, dw: 92, dh: 92 }, // Skyfang Phantom
  gunboat: { sx: 520, sy: 10, sw: 180, sh: 220, dw: 120, dh: 146 }, // Floating Arcane Bastion
  condor: { sx: 710, sy: 10, sw: 240, sh: 250, dw: 180, dh: 188 }, // Armored Behemoth
  albatross: { sx: 20, sy: 280, sw: 460, sh: 260, dw: 340, dh: 192 }, // Ancient Sky Guardian
  leviathan: { sx: 20, sy: 560, sw: 580, sh: 300, dw: 540, dh: 280 }, // Abyssal Sky Dragon
};

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private shakeTimer = 0;
  private shakeAmount = 0;
  private warningTimer = 0;
  public reducedMotion = false;

  private eiraImg: HTMLImageElement | null = null;
  private enemiesImg: HTMLImageElement | null = null;
  private eiraLoaded = false;
  private enemiesLoaded = false;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    canvas.width = FIELD_W;
    canvas.height = FIELD_H;
    this.loadAssets();
  }

  private loadAssets(): void {
    if (typeof Image === "undefined") return;

    const eira = new Image();
    eira.src = "./assets/characters/eira/eira-flight.png";
    eira.onload = () => {
      this.eiraImg = eira;
      this.eiraLoaded = true;
    };

    const enemies = new Image();
    enemies.src = "./assets/enemies/enemies-atlas.png";
    enemies.onload = () => {
      this.enemiesImg = enemies;
      this.enemiesLoaded = true;
    };
  }

  public handleEvents(events: GameEvent[]): void {
    for (const e of events) {
      if (e.t === "explode") {
        this.spawnExplosion(e.x, e.y, e.size);
      } else if (e.t === "meleeHit") {
        this.spawnMeleeSparks(e.x, e.y, e.dmg);
      } else if (e.t === "hit") {
        this.spawnSparks(e.x, e.y);
      } else if (e.t === "pickup") {
        this.spawnPickupSparks(e.x, e.y);
      } else if (e.t === "warning") {
        this.warningTimer = 180; // 3 seconds of arcade warning banner
      }
    }
  }

  private spawnMeleeSparks(x: number, y: number, dmg: number): void {
    const count = dmg >= 3 ? 24 : 16;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 140 + Math.random() * 260;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 14 + Math.random() * 10,
        size: 3 + Math.random() * 3,
        color: Math.random() > 0.4 ? "#ffffff" : dmg >= 3 ? "#f8c050" : "#44d7f5",
        kind: "spark",
      });
    }
  }

  private spawnExplosion(x: number, y: number, size: "s" | "m" | "l" | "boss"): void {
    const count = size === "boss" ? 75 : size === "l" ? 45 : size === "m" ? 25 : 14;
    const baseSpeed = size === "boss" ? 320 : size === "l" ? 220 : size === "m" ? 150 : 90;

    // Expanding magical shockwave ring
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: size === "boss" ? 30 : 18,
      size: size === "boss" ? 160 : size === "l" ? 90 : 45,
      color: size === "boss" ? "rgba(121, 85, 234, 0.9)" : "rgba(68, 215, 245, 0.85)",
      kind: "shockwave",
    });

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = baseSpeed * (0.35 + Math.random() * 0.9);

      // Crystalline mana sparks
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 24 + Math.random() * 20,
        size: 3 + Math.random() * (size === "boss" ? 6 : 4),
        color: Math.random() > 0.4 ? "#44d7f5" : "#f8c050",
        kind: "spark",
      });

      // Purple/dark mana mist
      if (Math.random() > 0.3) {
        this.particles.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * (speed * 0.4),
          vy: Math.sin(angle) * (speed * 0.4),
          life: 0,
          maxLife: 35 + Math.random() * 25,
          size: 14 + Math.random() * (size === "boss" ? 32 : 18),
          color: Math.random() > 0.5 ? "rgba(121, 85, 234, 0.65)" : "rgba(255, 84, 104, 0.5)",
          kind: "smoke",
        });
      }
    }

    if (!this.reducedMotion) {
      this.shakeTimer = size === "boss" ? 35 : size === "l" ? 18 : 8;
      this.shakeAmount = size === "boss" ? 18 : size === "l" ? 10 : 5;
    }
  }

  private spawnSparks(x: number, y: number): void {
    for (let i = 0; i < 7; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 12 + Math.random() * 8,
        size: 2.5 + Math.random() * 2.5,
        color: Math.random() > 0.5 ? "#44d7f5" : "#ffffff",
        kind: "spark",
      });
    }
  }

  private spawnPickupSparks(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 110 + Math.random() * 70;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 26,
        size: 3.5,
        color: "#f8c050",
        kind: "spark",
      });
    }
  }

  private updateAndDrawParticles(): void {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * DT;
      p.y += p.vy * DT;
      if (p.vrot) p.rot = (p.rot ?? 0) + p.vrot * DT;

      const progress = p.life / p.maxLife;
      const alpha = 1 - progress;

      if (p.kind === "shockwave") {
        ctx.save();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4 * (1 - progress);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * progress, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (p.kind === "smoke") {
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + progress * 0.8), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  public render(world: World): void {
    const ctx = this.ctx;
    ctx.save();

    // Screen Shake
    if (this.shakeTimer > 0) {
      this.shakeTimer--;
      const dx = (Math.random() - 0.5) * this.shakeAmount;
      const dy = (Math.random() - 0.5) * this.shakeAmount;
      ctx.translate(dx, dy);
    }

    // 1. Layer 1 (0.0x): Far Sky & Celestial Aurora across 4 Continuous Stages
    this.drawCelestialSky(world.scrollY, world.stageTick, world.phase);

    // 2. Layer 2 (0.2x): Distant Floating Continents & Citadels
    this.drawDistantCitadels(world.scrollY, world.stageTick);

    // 3. Layer 3 (0.5x): Mid Floating Temple Ruins & Runic Monoliths
    this.drawFloatingRuins(world.scrollY, world.stageTick);

    // 4. Ancient Sky Sanctuary Landing Dais (intro takeoff sequence)
    if (world.stageTick < 300) {
      this.drawSanctuary(world.scrollY);
    }

    // 5. Low-altitude Cloud Shadows
    this.drawCloudShadows(world.scrollY);

    // 6. Floating Ancient Bastions & Ground Targets
    for (const enemy of world.enemies) {
      if (enemy.ground && enemy.alive) {
        this.drawEnemy(enemy);
      }
    }

    // 7. Airborne Monsters (Gargoyles, Drakes, Phantoms, Behemoths, Bosses)
    for (const enemy of world.enemies) {
      if (!enemy.ground && enemy.alive) {
        this.drawEnemy(enemy);
      }
    }

    // 8. Pickups (Mana Crystals, Roll, Medals)
    for (const pickup of world.pickups) {
      if (pickup.alive) {
        this.drawPickup(pickup);
      }
    }

    // 9. Projectiles (Player Arc Blades & Enemy Arcane Orbs)
    this.drawBullets(world);

    // 10. Melee Slash Arc (Swept Blade Visuals)
    if (world.player.downTimer === 0 && world.player.meleeSwing) {
      this.drawMeleeSlash(world.player);
    }

    // 11. Valkyrie Eira (Default 160px Scale)
    if (world.player.downTimer === 0) {
      this.drawPlayer(world.player, world.tick);
    }

    // 12. Particle System (Explosions, Mana Sparks, Smoke)
    this.updateAndDrawParticles();

    // 13. Layer 4 (1.1x): High-altitude Clouds & Floating Debris
    this.drawHighCloudsAndDebris(world.scrollY, world.stageTick);

    ctx.restore();

    // 14. Warning Banner (if active)
    if (this.warningTimer > 0) {
      this.drawWarningBanner();
      this.warningTimer--;
    }

    // 15. In-Game HUD (Neon Arcane Interface)
    this.drawHUD(world);
  }

  private drawCelestialSky(scrollY: number, stageTick: number, phase: string): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD_H);

    // 4 Continuous Stages Progression:
    // Stage 1 (0..1500 ticks = 0..25s): Celestial Sanctuary (Brilliant azure dawn, golden halo rays)
    // Stage 2 (1500..3000 ticks = 25..50s): Ruined Sky Kingdom (Royal indigo twilight, golden dusk)
    // Stage 3 (3000..4500 ticks = 50..75s): Twilight Rift (Arcane purple storm, mana lightning)
    // Stage 4 (>4500 ticks or boss): Abyssal Throne (Dark obsidian vortex, crimson embers)

    if (stageTick < 1500) {
      grad.addColorStop(0, "#081938");
      grad.addColorStop(0.4, "#0f326e");
      grad.addColorStop(0.8, "#184f9e");
      grad.addColorStop(1, "#2568bf");
    } else if (stageTick < 3000) {
      grad.addColorStop(0, "#0e1136");
      grad.addColorStop(0.4, "#1d1a58");
      grad.addColorStop(0.8, "#392268");
      grad.addColorStop(1, "#603278");
    } else if (stageTick < 4500 && phase !== "boss") {
      grad.addColorStop(0, "#0b0a24");
      grad.addColorStop(0.4, "#191244");
      grad.addColorStop(0.8, "#2d1656");
      grad.addColorStop(1, "#441a6b");
    } else {
      // Abyssal Throne Boss Realm
      grad.addColorStop(0, "#050612");
      grad.addColorStop(0.4, "#0c0a22");
      grad.addColorStop(0.8, "#170e30");
      grad.addColorStop(1, "#26113b");
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);

    // Dynamic Heavenly Sunbeams / Arcane Auroras (Layer 1: 0.0x)
    ctx.save();
    if (stageTick < 1500) {
      // Golden / Cyan Sunrays streaming from upper skies
      ctx.fillStyle = "rgba(248, 192, 80, 0.07)";
      for (let i = 0; i < 5; i++) {
        const xOffset = 80 + i * 140 + Math.sin(scrollY * 0.01 + i) * 20;
        ctx.beginPath();
        ctx.moveTo(xOffset, 0);
        ctx.lineTo(xOffset + 70, 0);
        ctx.lineTo(xOffset + 240, FIELD_H);
        ctx.lineTo(xOffset + 110, FIELD_H);
        ctx.closePath();
        ctx.fill();
      }
    } else if (stageTick < 3000) {
      // Twilight golden aura bands
      ctx.fillStyle = "rgba(248, 192, 80, 0.05)";
      ctx.beginPath();
      ctx.ellipse(360, 200, 480, 140, -0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (stageTick < 4500 && phase !== "boss") {
      // Crackling arcane rift aurora
      ctx.strokeStyle = "rgba(121, 85, 234, 0.18)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= FIELD_W; x += 40) {
        const y = 300 + Math.sin((x + scrollY * 0.5) * 0.02) * 50;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else {
      // Abyssal Throne: Dark storm vortex rings spinning slowly
      const vortexAngle = (stageTick * 0.015) % (Math.PI * 2);
      ctx.strokeStyle = "rgba(121, 85, 234, 0.22)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(360, 220, 320, 180, vortexAngle, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 84, 104, 0.15)";
      ctx.beginPath();
      ctx.ellipse(360, 220, 210, 110, -vortexAngle * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawDistantCitadels(scrollY: number, stageTick: number): void {
    const ctx = this.ctx;
    ctx.save();

    // Layer 2 Parallax (0.2x speed)
    const yOffset = (scrollY * 0.2) % 1800;

    const citadels = [
      { x: 180, y: -200 + yOffset, scale: 0.75 },
      { x: 540, y: 700 + yOffset, scale: 0.85 },
      { x: 280, y: 1600 + yOffset, scale: 0.8 },
    ];

    for (const c of citadels) {
      if (c.y < -350 || c.y > FIELD_H + 350) continue;

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);

      // Distant continent floating island mass
      ctx.fillStyle = stageTick < 3000 ? "rgba(28, 48, 96, 0.5)" : "rgba(35, 25, 65, 0.55)";
      ctx.beginPath();
      ctx.moveTo(-160, 0);
      ctx.quadraticCurveTo(-180, 80, -90, 140);
      ctx.quadraticCurveTo(0, 180, 80, 130);
      ctx.quadraticCurveTo(170, 70, 150, 0);
      ctx.closePath();
      ctx.fill();

      // Ancient spires and citadel towers
      ctx.fillStyle = stageTick < 3000 ? "rgba(45, 75, 135, 0.6)" : "rgba(55, 38, 95, 0.65)";
      // Main central palace
      ctx.fillRect(-40, -90, 80, 95);
      // Central spire
      ctx.beginPath();
      ctx.moveTo(-25, -90);
      ctx.lineTo(0, -150);
      ctx.lineTo(25, -90);
      ctx.closePath();
      ctx.fill();

      // Flanking turrets
      ctx.fillRect(-90, -65, 36, 70);
      ctx.fillRect(54, -65, 36, 70);
      ctx.beginPath();
      ctx.moveTo(-80, -65);
      ctx.lineTo(-72, -105);
      ctx.lineTo(-64, -65);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(64, -65);
      ctx.lineTo(72, -105);
      ctx.lineTo(80, -65);
      ctx.closePath();
      ctx.fill();

      // Celestial Waterfall spilling from the floating continent into mist
      ctx.strokeStyle = "rgba(68, 215, 245, 0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-60, 10);
      ctx.lineTo(-60, 200);
      ctx.moveTo(40, 15);
      ctx.lineTo(40, 190);
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }

  private drawFloatingRuins(scrollY: number, stageTick: number): void {
    const ctx = this.ctx;
    ctx.save();

    // Layer 3 Parallax (0.5x speed)
    const yOffset = (scrollY * 0.5) % 2200;

    const ruins = [
      { x: 540, y: (yOffset + 200) % 2200 - 400, r: 130 },
      { x: 160, y: (yOffset + 950) % 2200 - 400, r: 100 },
      { x: 440, y: (yOffset + 1700) % 2200 - 400, r: 145 },
    ];

    for (const r of ruins) {
      if (r.y < -300 || r.y > FIELD_H + 300) continue;

      ctx.save();
      ctx.translate(r.x, r.y);

      // Floating stone mass underbelly
      ctx.fillStyle = stageTick < 3000 ? "#2b3b5c" : "#38234d";
      ctx.beginPath();
      ctx.moveTo(-r.r, 0);
      ctx.quadraticCurveTo(-r.r * 0.8, r.r * 0.9, -r.r * 0.2, r.r * 1.1);
      ctx.quadraticCurveTo(0, r.r * 1.3, r.r * 0.3, r.r * 0.9);
      ctx.quadraticCurveTo(r.r, r.r * 0.6, r.r, 0);
      ctx.closePath();
      ctx.fill();

      // Top marble platform surface
      ctx.fillStyle = stageTick < 3000 ? "#e2e8f0" : "#d8cee8";
      ctx.strokeStyle = "#cca862";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, r.r, r.r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sacred Runic Inscriptions (Cyan / Gold glowing runes)
      ctx.strokeStyle = "rgba(68, 215, 245, 0.75)";
      ctx.shadowColor = "#44d7f5";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r.r * 0.65, -0.4, 1.8);
      ctx.arc(0, 0, r.r * 0.65, 2.3, 3.8);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Classical Marble Columns & Pedestals
      ctx.fillStyle = "#cbd5e1";
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      const colX = [-r.r * 0.55, -r.r * 0.2, r.r * 0.25, r.r * 0.6];
      for (const cx of colX) {
        const colH = 34 + (Math.abs(cx) % 15);
        ctx.fillRect(cx - 6, -colH, 12, colH);
        ctx.strokeRect(cx - 6, -colH, 12, colH);
        // Column capital
        ctx.fillRect(cx - 8, -colH - 4, 16, 5);
      }

      ctx.restore();
    }
    ctx.restore();
  }

  private drawHighCloudsAndDebris(scrollY: number, stageTick: number): void {
    const ctx = this.ctx;
    ctx.save();

    // Layer 4 Parallax (1.1x speed): Near passing clouds & floating crystalline debris
    const cloudOffset = (scrollY * 1.1) % 2400;

    const clouds = [
      { x: 120, y: -260 + cloudOffset, r: 135 },
      { x: 600, y: 550 + cloudOffset, r: 175 },
      { x: 240, y: 1350 + cloudOffset, r: 155 },
    ];

    ctx.fillStyle = stageTick < 3000 ? "rgba(240, 248, 255, 0.16)" : "rgba(215, 205, 240, 0.14)";
    for (const c of clouds) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.arc(c.x + 60, c.y - 25, c.r * 0.8, 0, Math.PI * 2);
      ctx.arc(c.x - 50, c.y + 30, c.r * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }

    // Drifting magical mana crystal shards
    ctx.fillStyle = "rgba(68, 215, 245, 0.7)";
    ctx.shadowColor = "#44d7f5";
    ctx.shadowBlur = 6;
    const debrisY = (scrollY * 1.3) % FIELD_H;
    for (let i = 0; i < 4; i++) {
      const dx = 100 + i * 160 + Math.sin(scrollY * 0.02 + i) * 35;
      const dy = (debrisY + i * 280) % FIELD_H;
      ctx.beginPath();
      ctx.moveTo(dx, dy - 6);
      ctx.lineTo(dx + 4, dy);
      ctx.lineTo(dx, dy + 6);
      ctx.lineTo(dx - 4, dy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private drawMeleeSlash(p: Player): void {
    if (!p.meleeSwing) return;
    const ctx = this.ctx;
    const swing = p.meleeSwing;
    const progress = 1 - swing.duration / 8; // 0..1
    const isL2R = swing.direction === "l2r";

    ctx.save();
    ctx.translate(p.x, p.y);

    // Frontal arc spans 140 degrees (from -160 to -20 deg, where -90 is straight up)
    // L->R: sweeps from left (-155 deg) towards right (-25 deg)
    // R->L: sweeps from right (-25 deg) towards left (-155 deg)
    const arcSpan = (130 * Math.PI) / 180;
    const startAngle = isL2R
      ? (-155 * Math.PI) / 180 + progress * 0.25
      : (-25 * Math.PI) / 180 - progress * 0.25;
    const currentAngle = isL2R
      ? startAngle + progress * arcSpan
      : startAngle - progress * arcSpan;

    const reach = 130;
    const arcGrad = ctx.createRadialGradient(0, 0, reach * 0.35, 0, 0, reach);

    if (isL2R) {
      // Radiant Cyan for L->R
      arcGrad.addColorStop(0, "rgba(68, 215, 245, 0.0)");
      arcGrad.addColorStop(0.65, "rgba(68, 215, 245, 0.45)");
      arcGrad.addColorStop(0.9, "rgba(255, 255, 255, 0.95)");
      arcGrad.addColorStop(1, "rgba(68, 215, 245, 0.85)");
    } else {
      // Radiant Cyan-Gold for R->L
      arcGrad.addColorStop(0, "rgba(248, 192, 80, 0.0)");
      arcGrad.addColorStop(0.55, "rgba(68, 215, 245, 0.45)");
      arcGrad.addColorStop(0.85, "rgba(255, 255, 255, 0.95)");
      arcGrad.addColorStop(1, "rgba(248, 192, 80, 0.9)");
    }

    ctx.fillStyle = arcGrad;
    ctx.shadowColor = isL2R ? "#44d7f5" : "#f8c050";
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.arc(0, 0, reach, startAngle, currentAngle, !isL2R);
    ctx.arc(0, 0, reach - 34 * (1 - progress * 0.4), currentAngle, startAngle, isL2R);
    ctx.closePath();
    ctx.fill();

    // Sharp cutting blade line
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, reach, startAngle, currentAngle, !isL2R);
    ctx.stroke();

    ctx.restore();
  }

  private drawSanctuary(scrollY: number): void {
    const ctx = this.ctx;
    const cy = FIELD_H - 120 + scrollY * 0.45;
    ctx.save();
    ctx.translate(FIELD_W / 2, cy);

    // Divine light shaft and cloud mist beneath dais
    ctx.fillStyle = "rgba(68, 215, 245, 0.22)";
    ctx.beginPath();
    ctx.moveTo(-90, 260);
    ctx.lineTo(90, 260);
    ctx.lineTo(160, 480);
    ctx.lineTo(-160, 480);
    ctx.closePath();
    ctx.fill();

    // Massive stone drop shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(-105, -310, 210, 620);

    // White marble sanctuary landing platform
    ctx.fillStyle = "#e0e6ed";
    ctx.strokeStyle = "#44d7f5";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-98, -315, 196, 630, [45, 45, 15, 15]);
    ctx.fill();
    ctx.stroke();

    // Inner sacred marble tile inlay
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.roundRect(-86, -300, 172, 600, [35, 35, 10, 10]);
    ctx.fill();

    // Glowing cyan runic pathway
    ctx.strokeStyle = "#44d7f5";
    ctx.shadowColor = "#44d7f5";
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4;
    ctx.setLineDash([28, 20]);
    ctx.beginPath();
    ctx.moveTo(0, -280);
    ctx.lineTo(0, 260);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Center sacred magic rune circle
    ctx.strokeStyle = "#f8c050";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -100, 48, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Corner Floating Crystal Monoliths
    for (const [px, py] of [[-74, -260], [74, -260], [-74, 200], [74, 200]]) {
      ctx.fillStyle = "#44d7f5";
      ctx.shadowColor = "#44d7f5";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(px, py - 18);
      ctx.lineTo(px + 10, py);
      ctx.lineTo(px, py + 18);
      ctx.lineTo(px - 10, py);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private drawCloudShadows(scrollY: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(0, 5, 20, 0.22)";

    const shadowOffset = (scrollY * 1.2) % 2400;
    const shadows = [
      { x: 160, y: -300 + shadowOffset, r: 160 },
      { x: 560, y: 500 + shadowOffset, r: 200 },
      { x: 300, y: 1400 + shadowOffset, r: 180 },
    ];

    for (const s of shadows) {
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r, s.r * 0.7, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawPlayer(p: Player, tick: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);

    if (p.invuln > 0 && Math.floor(p.invuln / 4) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    const bankAngle = (p.vx / 420) * 0.18;
    ctx.rotate(bankAngle);

    let scale = 1;
    let isRolling = false;
    let rollFrameIndex = 0;
    if (p.rollTimer > 0) {
      isRolling = true;
      const progress = 1 - p.rollTimer / 72;
      scale = 1 + Math.sin(progress * Math.PI) * 0.45;
      ctx.scale(scale, scale);
      rollFrameIndex = Math.min(3, Math.floor(progress * 4));
    }

    // Divine ground drop shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
    ctx.beginPath();
    ctx.ellipse(0, 56, 48 * scale, 24 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Divine Flight Particle Aura (cyan and golden specks trailing downward)
    ctx.fillStyle = "rgba(68, 215, 245, 0.45)";
    for (const ox of [-20, 20]) {
      ctx.beginPath();
      ctx.arc(ox, 52 + (tick % 5) * 4, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(248, 192, 80, 0.4)";
    ctx.beginPath();
    ctx.arc(0, 60 + (tick % 7) * 3, 3, 0, Math.PI * 2);
    ctx.fill();

    if (this.eiraLoaded && this.eiraImg) {
      let frameKey = "idle_0";
      if (isRolling) {
        frameKey = `roll_${rollFrameIndex}`;
        // Cyan afterimage during roll
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.drawImage(
          this.eiraImg,
          EIRA_FRAMES[frameKey].sx,
          EIRA_FRAMES[frameKey].sy,
          EIRA_CELL,
          EIRA_CELL,
          -90,
          -90,
          180,
          180,
        );
        ctx.restore();
      } else if (p.meleeSwing) {
        // Alternating sword slash motion (slash_0: L->R, slash_1: R->L)
        frameKey = p.meleeSwing.direction === "l2r" ? "slash_0" : "slash_1";
      } else if (p.fireCooldown > 6) {
        frameKey = "thrust";
      } else if (p.vx < -60) {
        frameKey = "bank_left";
      } else if (p.vx > 60) {
        frameKey = "bank_right";
      } else {
        const animStep = Math.floor((tick % 32) / 8);
        frameKey = `idle_${animStep}`;
      }

      const frame = EIRA_FRAMES[frameKey] || EIRA_FRAMES.idle_0;
      // Default 160px render scale for high-definition character clarity
      const drawSize = 160;
      const half = drawSize / 2;
      ctx.drawImage(
        this.eiraImg,
        frame.sx,
        frame.sy,
        EIRA_CELL,
        EIRA_CELL,
        -half,
        -half,
        drawSize,
        drawSize,
      );
    } else {
      // Procedural fallback: Valkyrie winged silhouette
      this.drawProceduralValkyrie(ctx, p, scale);
    }

    // Invulnerability Protective Ward Barrier
    if (p.rollTimer > 0 || p.invuln > 0) {
      ctx.strokeStyle = "rgba(68, 215, 245, 0.85)";
      ctx.shadowColor = "#44d7f5";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 75 * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  private drawProceduralValkyrie(ctx: CanvasRenderingContext2D, _p: Player, scale: number): void {
    // Ivory Skirt Billowing
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(-18 * scale, 8 * scale);
    ctx.lineTo(18 * scale, 8 * scale);
    ctx.lineTo(28 * scale, 38 * scale);
    ctx.lineTo(-28 * scale, 38 * scale);
    ctx.closePath();
    ctx.fill();

    // Royal Blue & Gold Armor
    ctx.fillStyle = "#1e3a8a";
    ctx.fillRect(-14 * scale, -12 * scale, 28 * scale, 22 * scale);
    ctx.fillStyle = "#f8c050";
    ctx.fillRect(-6 * scale, -8 * scale, 12 * scale, 12 * scale);

    // Silver Braid & Winged Helmet
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.arc(0, -20 * scale, 12 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Helm Wings
    ctx.fillStyle = "#ffffff";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 10 * scale, -22 * scale);
      ctx.lineTo(s * 26 * scale, -34 * scale);
      ctx.lineTo(s * 18 * scale, -16 * scale);
      ctx.closePath();
      ctx.fill();
    }

    // Oathblade Forward
    ctx.strokeStyle = "#44d7f5";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(14 * scale, 0);
    ctx.lineTo(14 * scale, -44 * scale);
    ctx.stroke();
  }

  private drawEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.heading);

    if (enemy.flash > 0) {
      ctx.filter = "brightness(2.5) contrast(1.4)";
    }

    const frame = ENEMY_FRAMES[enemy.kind];
    if (this.enemiesLoaded && this.enemiesImg && frame) {
      ctx.drawImage(
        this.enemiesImg,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        -frame.dw / 2,
        -frame.dh / 2,
        frame.dw,
        frame.dh,
      );

      // Boss parts damage markers
      if (enemy.parts.length > 0) {
        for (const part of enemy.parts) {
          if (!part.alive) {
            ctx.fillStyle = "rgba(255, 84, 104, 0.7)";
            ctx.beginPath();
            ctx.arc(part.dx, part.dy, 12, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    } else {
      this.drawProceduralEnemy(ctx, enemy);
    }

    ctx.restore();
  }

  private drawProceduralEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy): void {
    switch (enemy.kind) {
      case "kestrel":
      case "kestrelRed": {
        const isRed = enemy.kind === "kestrelRed";
        ctx.fillStyle = isRed ? "#b82430" : "#2a394a";
        ctx.beginPath();
        ctx.moveTo(0, 26);
        ctx.lineTo(-26, -4);
        ctx.lineTo(0, -24);
        ctx.lineTo(26, -4);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "harrier": {
        ctx.fillStyle = "#3b1e54";
        ctx.beginPath();
        ctx.moveTo(0, 32);
        ctx.lineTo(-28, 4);
        ctx.lineTo(0, -20);
        ctx.lineTo(28, 4);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "condor": {
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.roundRect(-50, -45, 100, 90, 16);
        ctx.fill();
        break;
      }
      case "gunboat": {
        ctx.fillStyle = "#475569";
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "albatross": {
        ctx.fillStyle = "#d97706";
        ctx.beginPath();
        ctx.roundRect(-120, -40, 240, 80, 20);
        ctx.fill();
        break;
      }
      case "leviathan": {
        ctx.fillStyle = "#311042";
        ctx.beginPath();
        ctx.roundRect(-220, -60, 440, 120, 25);
        ctx.fill();
        break;
      }
    }
  }

  private drawBullets(world: World): void {
    const ctx = this.ctx;

    for (const b of world.bullets) {
      if (!b.alive) continue;

      if (b.owner === "player") {
        // Glowing Crescent Arc Blade
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.shadowColor = "#44d7f5";
        ctx.shadowBlur = 12;

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#44d7f5";
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(-11, 4);
        ctx.quadraticCurveTo(0, -16, 11, 4);
        ctx.quadraticCurveTo(0, -6, -11, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      } else {
        // Glowing Arcane Orbs (Deep Violet & Magenta)
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.shadowColor = "#ff5468";
        ctx.shadowBlur = 10;

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(3, b.r - 2), 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#ff5468";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
    }
  }

  private drawPickup(p: Pickup): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);

    const bob = Math.sin(p.age * 0.1) * 3;
    ctx.translate(0, bob);

    if (p.kind === "pow") {
      // Radiant Mana Gem (POW)
      ctx.shadowColor = "#f8c050";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#f8c050";
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(16, 0);
      ctx.lineTo(0, 22);
      ctx.lineTo(-16, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#1e1b4b";
      ctx.font = "900 13px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("POW", 0, 1);
    } else {
      // Evasion Rune / Medal
      ctx.shadowColor = "#44d7f5";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#44d7f5";
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0f172a";
      ctx.font = "900 12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("R", 0, 1);
    }

    ctx.restore();
  }

  private drawWarningBanner(): void {
    const ctx = this.ctx;
    const isFlashing = Math.floor(this.warningTimer / 6) % 2 === 0;

    ctx.save();
    ctx.fillStyle = isFlashing ? "rgba(255, 84, 104, 0.88)" : "rgba(20, 38, 80, 0.88)";
    ctx.fillRect(0, FIELD_H * 0.42, FIELD_W, 64);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, FIELD_H * 0.42, FIELD_W, 64);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 24px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!  WARNING  !", FIELD_W / 2, FIELD_H * 0.42 + 22);

    ctx.font = "700 13px monospace";
    ctx.letterSpacing = "2px";
    ctx.fillText("HOSTILE ABYSSAL DRAGON DETECTED", FIELD_W / 2, FIELD_H * 0.42 + 46);
    ctx.restore();
  }

  private drawHUD(world: World): void {
    const ctx = this.ctx;
    ctx.save();

    // 1P SCORE
    ctx.fillStyle = "#8fa5d8";
    ctx.font = "700 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText("VALKYRIE SCORE", 32, 42);

    ctx.fillStyle = "#44d7f5";
    ctx.font = "900 22px monospace";
    ctx.fillText(world.score.toString().padStart(6, "0"), 32, 68);

    // TOP RECORD
    ctx.fillStyle = "#8fa5d8";
    ctx.font = "700 12px monospace";
    ctx.textAlign = "right";
    ctx.fillText("TOP RECORD", FIELD_W - 32, 42);

    ctx.fillStyle = "#f8c050";
    ctx.font = "900 22px monospace";
    ctx.fillText(Math.max(world.score, 0).toString().padStart(6, "0"), FIELD_W - 32, 68);

    // LIVES (Winged Crests)
    for (let i = 0; i < world.player.lives; i++) {
      ctx.fillStyle = "#44d7f5";
      ctx.beginPath();
      const lx = 40 + i * 28;
      const ly = FIELD_H - 36;
      ctx.moveTo(lx, ly - 10);
      ctx.lineTo(lx - 10, ly + 8);
      ctx.lineTo(lx + 10, ly + 8);
      ctx.closePath();
      ctx.fill();
    }

    // ROLLS / SPECIAL
    ctx.fillStyle = "#f8c050";
    ctx.font = "700 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText("ROLL", 32, FIELD_H - 62);
    for (let i = 0; i < world.player.rolls; i++) {
      ctx.fillRect(72 + i * 16, FIELD_H - 72, 11, 11);
    }

    // POWER LEVEL
    ctx.fillStyle = "#8fa5d8";
    ctx.fillText("ARC", 32, FIELD_H - 86);
    for (let i = 1; i <= 3; i++) {
      ctx.fillStyle = i <= world.player.power ? "#44d7f5" : "rgba(68, 215, 245, 0.2)";
      ctx.fillRect(72 + (i - 1) * 16, FIELD_H - 96, 11, 11);
    }

    // BOSS HEALTH BAR
    const boss = world.enemies.find((e) => (e.kind === "leviathan" || e.kind === "albatross") && e.alive);
    if (boss) {
      const barW = 460;
      const barH = 18;
      const bx = (FIELD_W - barW) / 2;
      const by = 88;

      ctx.fillStyle = "rgba(8, 13, 35, 0.85)";
      ctx.fillRect(bx, by, barW, barH);
      ctx.strokeStyle = "#44d7f5";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, barW, barH);

      const ratio = Math.max(0, boss.hp / boss.maxHp);
      const isCritical = ratio < 0.25;
      ctx.fillStyle = isCritical ? "#ff5468" : "#44d7f5";
      ctx.fillRect(bx + 2, by + 2, (barW - 4) * ratio, barH - 4);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 13px monospace";
      ctx.textAlign = "center";
      const bossName = boss.kind === "leviathan" ? "ABYSSAL SKY DRAGON : LEVIATHAN" : "ANCIENT SKY GUARDIAN : ALBATROSS";
      ctx.fillText(bossName, FIELD_W / 2, by - 6);
    }

    ctx.restore();
  }
}
