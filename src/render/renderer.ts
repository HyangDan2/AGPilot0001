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
      } else if (e.t === "hit") {
        this.spawnSparks(e.x, e.y);
      } else if (e.t === "pickup") {
        this.spawnPickupSparks(e.x, e.y);
      } else if (e.t === "warning") {
        this.warningTimer = 180; // 3 seconds of arcade warning banner
      }
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

    // 1. Deep Celestial Ocean & Sky
    this.drawSkyAndSea(world.scrollY);

    // 2. Archipelago Islands & Ancient Sanctuary Reefs (Midground Parallax)
    this.drawIslands(world.scrollY);

    // 3. Ancient Sky Sanctuary Landing Dais (intro takeoff sequence)
    if (world.stageTick < 300) {
      this.drawSanctuary(world.scrollY);
    }

    // 4. Low-altitude Cloud Shadows
    this.drawCloudShadows(world.scrollY);

    // 5. Floating Ancient Bastions & Ground Targets
    for (const enemy of world.enemies) {
      if (enemy.ground && enemy.alive) {
        this.drawEnemy(enemy);
      }
    }

    // 6. Airborne Monsters (Gargoyles, Drakes, Phantoms, Behemoths, Bosses)
    for (const enemy of world.enemies) {
      if (!enemy.ground && enemy.alive) {
        this.drawEnemy(enemy);
      }
    }

    // 7. Pickups (Mana Crystals, Roll, Medals)
    for (const pickup of world.pickups) {
      if (pickup.alive) {
        this.drawPickup(pickup);
      }
    }

    // 8. Projectiles (Player Arc Blades & Enemy Arcane Orbs)
    this.drawBullets(world);

    // 9. Valkyrie Eira
    if (world.player.downTimer === 0) {
      this.drawPlayer(world.player, world.tick);
    }

    // 10. Particle System (Explosions, Mana Sparks, Smoke)
    this.updateAndDrawParticles();

    // 11. High-altitude Fluffy Clouds (Foreground Parallax)
    this.drawHighClouds(world.scrollY);

    ctx.restore();

    // 12. Warning Banner (if active)
    if (this.warningTimer > 0) {
      this.drawWarningBanner();
      this.warningTimer--;
    }

    // 13. In-Game HUD (Neon Arcane Interface)
    this.drawHUD(world);
  }

  private drawSkyAndSea(scrollY: number): void {
    const ctx = this.ctx;

    // Atmospheric Celestial Sky & Sea Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD_H);
    grad.addColorStop(0, "#081738");
    grad.addColorStop(0.4, "#0e2c5e");
    grad.addColorStop(0.7, "#092244");
    grad.addColorStop(1, "#07162d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);

    // Procedural multi-wave caustics & sun glints
    ctx.lineWidth = 1.5;
    const waveGap = 64;
    const offset = scrollY % waveGap;

    for (let y = -waveGap + offset; y < FIELD_H + waveGap; y += waveGap) {
      ctx.strokeStyle = "rgba(68, 215, 245, 0.14)";
      ctx.beginPath();
      for (let x = 0; x <= FIELD_W; x += 30) {
        const waveY = y + Math.sin((x + scrollY * 0.7) * 0.035) * 7 + Math.cos((x * 0.02) - scrollY * 0.02) * 4;
        if (x === 0) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();

      ctx.strokeStyle = "rgba(180, 240, 255, 0.07)";
      ctx.beginPath();
      for (let x = 15; x <= FIELD_W; x += 30) {
        const waveY = y + 26 + Math.cos((x - scrollY * 0.5) * 0.04) * 5;
        if (x === 15) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }
  }

  private drawIslands(scrollY: number): void {
    const ctx = this.ctx;
    ctx.save();

    const islands = [
      { x: 560, y: (scrollY * 0.35 + 200) % 2000 - 400, r: 120 },
      { x: 140, y: (scrollY * 0.35 + 850) % 2000 - 400, r: 90 },
      { x: 480, y: (scrollY * 0.35 + 1550) % 2000 - 400, r: 140 },
    ];

    for (const isl of islands) {
      if (isl.y < -250 || isl.y > FIELD_H + 250) continue;

      // Shallow emerald coral lagoon
      ctx.fillStyle = "rgba(15, 125, 140, 0.4)";
      ctx.beginPath();
      ctx.arc(isl.x, isl.y, isl.r + 34, 0, Math.PI * 2);
      ctx.fill();

      // Golden sand shore
      ctx.fillStyle = "#cca862";
      ctx.beginPath();
      ctx.arc(isl.x, isl.y, isl.r + 14, 0, Math.PI * 2);
      ctx.fill();

      // Lush tropical canopy
      ctx.fillStyle = "#1c5a32";
      ctx.beginPath();
      ctx.arc(isl.x, isl.y, isl.r, 0, Math.PI * 2);
      ctx.fill();

      // High canopy highlights
      ctx.fillStyle = "#277a45";
      ctx.beginPath();
      ctx.arc(isl.x - 12, isl.y - 12, isl.r * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }

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

  private drawHighClouds(scrollY: number): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = "rgba(235, 245, 255, 0.16)";
    const cloudOffset = (scrollY * 1.85) % 2200;

    const clouds = [
      { x: 120, y: -260 + cloudOffset, r: 130 },
      { x: 580, y: 350 + cloudOffset, r: 170 },
      { x: 260, y: 1100 + cloudOffset, r: 150 },
    ];

    for (const c of clouds) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.arc(c.x + 55, c.y - 20, c.r * 0.8, 0, Math.PI * 2);
      ctx.arc(c.x - 45, c.y + 25, c.r * 0.75, 0, Math.PI * 2);
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
    ctx.ellipse(0, 42, 32 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Divine Flight Particle Aura (cyan and golden specks trailing downward)
    ctx.fillStyle = "rgba(68, 215, 245, 0.4)";
    for (const ox of [-14, 14]) {
      ctx.beginPath();
      ctx.arc(ox, 38 + (tick % 5) * 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(248, 192, 80, 0.35)";
    ctx.beginPath();
    ctx.arc(0, 44 + (tick % 7) * 2, 2.5, 0, Math.PI * 2);
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
          -54,
          -54,
          108,
          108,
        );
        ctx.restore();
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
      ctx.drawImage(
        this.eiraImg,
        frame.sx,
        frame.sy,
        EIRA_CELL,
        EIRA_CELL,
        -48,
        -48,
        96,
        96,
      );
    } else {
      // Procedural fallback: Valkyrie winged silhouette
      this.drawProceduralValkyrie(ctx, p, scale);
    }

    // Invulnerability Protective Ward Barrier
    if (p.rollTimer > 0 || p.invuln > 0) {
      ctx.strokeStyle = "rgba(68, 215, 245, 0.75)";
      ctx.shadowColor = "#44d7f5";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 52 * scale, 0, Math.PI * 2);
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
