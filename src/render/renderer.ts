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
}

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private shakeTimer = 0;
  private shakeAmount = 0;
  public reducedMotion = false;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    canvas.width = FIELD_W;
    canvas.height = FIELD_H;
  }

  public handleEvents(events: GameEvent[]): void {
    for (const e of events) {
      if (e.t === "explode") {
        this.spawnExplosion(e.x, e.y, e.size);
      } else if (e.t === "hit") {
        this.spawnSparks(e.x, e.y);
      } else if (e.t === "pickup") {
        this.spawnPickupSparks(e.x, e.y);
      }
    }
  }

  private spawnExplosion(x: number, y: number, size: "s" | "m" | "l" | "boss"): void {
    const count = size === "boss" ? 60 : size === "l" ? 36 : size === "m" ? 20 : 10;
    const baseSpeed = size === "boss" ? 280 : size === "l" ? 200 : size === "m" ? 140 : 80;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.2 + Math.random() * 0.8) * baseSpeed;
      const colors = ["#fffae0", "#ffaa22", "#ff3311", "#661100", "#555555"];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 20 + Math.random() * 30,
        size: (size === "boss" ? 18 : 10) * (0.6 + Math.random() * 0.8),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    if (!this.reducedMotion) {
      if (size === "boss") {
        this.shakeTimer = 35;
        this.shakeAmount = 14;
      } else if (size === "l") {
        this.shakeTimer = 18;
        this.shakeAmount = 8;
      }
    }
  }

  private spawnSparks(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 10 + Math.random() * 8,
        size: 3,
        color: "#ffffff",
      });
    }
  }

  private spawnPickupSparks(x: number, y: number): void {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * 120,
        vy: Math.sin(angle) * 120,
        life: 0,
        maxLife: 24,
        size: 4,
        color: "#ffdd44",
      });
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

    // 1. Background (Ocean & Clouds)
    this.drawOcean(world.scrollY);

    // 2. Carrier (during intro takeoff)
    if (world.tick < 240) {
      this.drawCarrier(world.scrollY);
    }

    // 3. Ground Enemies (Gunboats)
    for (const enemy of world.enemies) {
      if (enemy.ground && enemy.alive) {
        this.drawEnemy(enemy);
      }
    }

    // 4. Airborne Enemies
    for (const enemy of world.enemies) {
      if (!enemy.ground && enemy.alive) {
        this.drawEnemy(enemy);
      }
    }

    // 5. Pickups
    for (const pickup of world.pickups) {
      if (pickup.alive) {
        this.drawPickup(pickup);
      }
    }

    // 6. Bullets
    this.drawBullets(world);

    // 7. Player
    if (world.player.downTimer === 0) {
      this.drawPlayer(world.player);
    }

    // 8. Particles / Explosions
    this.updateAndDrawParticles();

    // 9. Floating Clouds (High Altitude)
    this.drawClouds(world.scrollY);

    ctx.restore();

    // 10. HUD (Not shaken)
    this.drawHUD(world);
  }

  private drawOcean(scrollY: number): void {
    const ctx = this.ctx;
    // Deep Pacific Blue Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD_H);
    grad.addColorStop(0, "#08213b");
    grad.addColorStop(1, "#0d2e50");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);

    // Subtle wave ripples
    ctx.strokeStyle = "rgba(120, 180, 230, 0.12)";
    ctx.lineWidth = 2;
    const waveGap = 90;
    const offset = scrollY % waveGap;
    for (let y = -waveGap + offset; y < FIELD_H + waveGap; y += waveGap) {
      ctx.beginPath();
      for (let x = 0; x < FIELD_W; x += 40) {
        const wy = y + Math.sin((x + scrollY * 0.5) * 0.05) * 6;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  }

  private drawCarrier(scrollY: number): void {
    const ctx = this.ctx;
    const cy = FIELD_H - 120 + scrollY * 0.4;
    ctx.save();
    ctx.translate(FIELD_W / 2, cy);

    // Deck shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(-85, -280, 170, 560);

    // Wooden Flight Deck
    ctx.fillStyle = "#8a7155";
    ctx.beginPath();
    ctx.roundRect(-80, -290, 160, 580, [40, 40, 20, 20]);
    ctx.fill();

    // Deck Markings (Yellow & White runway lines)
    ctx.strokeStyle = "#e8b64c";
    ctx.lineWidth = 4;
    ctx.setLineDash([30, 20]);
    ctx.beginPath();
    ctx.moveTo(0, -260);
    ctx.lineTo(0, 260);
    ctx.stroke();
    ctx.setLineDash([]);

    // Flight deck number "01"
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.fillText("01", 0, -200);

    ctx.restore();
  }

  private drawClouds(scrollY: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    const cloudOffset = (scrollY * 1.6) % 1800;

    const clouds = [
      { x: 160, y: -200 + cloudOffset, r: 120 },
      { x: 520, y: 400 + cloudOffset, r: 160 },
      { x: 280, y: 1000 + cloudOffset, r: 140 },
    ];

    for (const c of clouds) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.arc(c.x + 50, c.y - 20, c.r * 0.8, 0, Math.PI * 2);
      ctx.arc(c.x - 40, c.y + 20, c.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawPlayer(p: Player): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);

    // Flash when invulnerable
    if (p.invuln > 0 && Math.floor(p.invuln / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Evasive Roll Animation: 360-degree loop rotation and scale pulse
    let scale = 1;
    if (p.rollTimer > 0) {
      const progress = 1 - p.rollTimer / 72;
      scale = 1 + Math.sin(progress * Math.PI) * 0.55;
      ctx.rotate(progress * Math.PI * 2);
      ctx.scale(scale, scale);
    }

    // Drop shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 28, 38 * scale, 30 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Twin-engine Heavy Fighter (Original P-38 style twin-boom layout)
    // Wings
    ctx.fillStyle = "#4a5d4e"; // Olive Military Green
    ctx.strokeStyle = "#253328";
    ctx.lineWidth = 2;

    // Main central wing
    ctx.beginPath();
    ctx.moveTo(-46, 0);
    ctx.lineTo(46, 0);
    ctx.lineTo(42, 16);
    ctx.lineTo(-42, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Twin Engine Booms
    for (const bx of [-26, 26]) {
      ctx.fillStyle = "#3e4f42";
      ctx.beginPath();
      ctx.roundRect(bx - 7, -24, 14, 56, 4);
      ctx.fill();
      ctx.stroke();

      // Spinning Propeller Blur
      ctx.strokeStyle = "rgba(220, 240, 255, 0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(bx, -26, 15, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Horizontal Tail Stabilizer connecting booms
    ctx.fillStyle = "#4a5d4e";
    ctx.fillRect(-28, 26, 56, 8);
    ctx.strokeRect(-28, 26, 56, 8);

    // Center Fuselage & Cockpit Nacelle
    ctx.fillStyle = "#556b5a";
    ctx.beginPath();
    ctx.roundRect(-10, -32, 20, 48, [10, 10, 4, 4]);
    ctx.fill();
    ctx.stroke();

    // Glass Canopy
    ctx.fillStyle = "#a8d8ea";
    ctx.beginPath();
    ctx.roundRect(-6, -18, 12, 20, 6);
    ctx.fill();

    // Faction Emblem: Golden Winged Chevron on wings
    ctx.fillStyle = "#e8b64c";
    for (const ex of [-36, 36]) {
      ctx.beginPath();
      ctx.moveTo(ex, 4);
      ctx.lineTo(ex + 4, 12);
      ctx.lineTo(ex - 4, 12);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  private drawEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.heading);

    // Hit Flash
    if (enemy.flash > 0) {
      ctx.filter = "brightness(2.2)";
    }

    switch (enemy.kind) {
      case "kestrel":
      case "kestrelRed": {
        const isRed = enemy.kind === "kestrelRed";
        ctx.fillStyle = isRed ? "#c8343a" : "#3b4856";
        ctx.strokeStyle = "#1b242e";
        ctx.lineWidth = 2;

        // Fighter Body
        ctx.beginPath();
        ctx.moveTo(0, 24);
        ctx.lineTo(-24, -6);
        ctx.lineTo(-6, -18);
        ctx.lineTo(0, -22);
        ctx.lineTo(6, -18);
        ctx.lineTo(24, -6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Canopy
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(-3, 0, 6, 10);
        break;
      }

      case "harrier": {
        // Swept-wing Dive Bomber
        ctx.fillStyle = "#2c3e50";
        ctx.strokeStyle = "#17202a";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, 30);
        ctx.lineTo(-28, 6);
        ctx.lineTo(-12, -20);
        ctx.lineTo(12, -20);
        ctx.lineTo(28, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case "condor": {
        // Heavy 4-engine bomber
        ctx.fillStyle = "#34495e";
        ctx.strokeStyle = "#1c2833";
        ctx.lineWidth = 2;

        // Massive wings
        ctx.beginPath();
        ctx.moveTo(-70, 0);
        ctx.lineTo(70, 0);
        ctx.lineTo(60, 24);
        ctx.lineTo(-60, 24);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Long Fuselage
        ctx.beginPath();
        ctx.roundRect(-16, -45, 32, 90, 10);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case "gunboat": {
        // Armored Sea Patrol Boat
        ctx.fillStyle = "#4a5568";
        ctx.strokeStyle = "#2d3748";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, 48);
        ctx.lineTo(-22, 10);
        ctx.lineTo(-20, -42);
        ctx.lineTo(20, -42);
        ctx.lineTo(22, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Twin Gun Turrets
        ctx.fillStyle = "#1a202c";
        ctx.beginPath();
        ctx.arc(0, -14, 10, 0, Math.PI * 2);
        ctx.arc(0, 16, 10, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case "albatross": {
        // Midboss Heavy Bomber
        ctx.fillStyle = "#2b3a4a";
        ctx.strokeStyle = "#121b24";
        ctx.lineWidth = 3;

        // Wide Flying Wing
        ctx.beginPath();
        ctx.roundRect(-130, -30, 260, 60, 16);
        ctx.fill();
        ctx.stroke();

        // Engines
        for (const p of enemy.parts) {
          ctx.fillStyle = p.alive ? (p.flash > 0 ? "#ffffff" : "#c0392b") : "#111111";
          ctx.beginPath();
          ctx.arc(p.dx, p.dy, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        break;
      }

      case "leviathan": {
        // GIANT FINAL BOSS
        ctx.fillStyle = "#1f2937";
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 4;

        // Main Hull
        ctx.beginPath();
        ctx.roundRect(-240, -60, 480, 120, 24);
        ctx.fill();
        ctx.stroke();

        // Glowing Core
        ctx.fillStyle = enemy.hp < 100 ? "#ef4444" : "#f59e0b";
        ctx.beginPath();
        ctx.arc(0, 20, 36, 0, Math.PI * 2);
        ctx.fill();

        // 4 Engine Nacelles
        for (const p of enemy.parts) {
          ctx.fillStyle = p.alive ? (p.flash > 0 ? "#ffffff" : "#b91c1c") : "#111827";
          ctx.beginPath();
          ctx.roundRect(p.dx - 24, p.dy - 30, 48, 60, 8);
          ctx.fill();
          ctx.stroke();
        }
        break;
      }
    }

    ctx.restore();
  }

  private drawBullets(world: World): void {
    const ctx = this.ctx;

    for (const b of world.bullets) {
      if (!b.alive) continue;

      if (b.owner === "player") {
        // Laser/Tracer style blue-white needle
        ctx.fillStyle = "#e0f2fe";
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(b.x - 3, b.y - 12, 6, 24, 3);
        ctx.fill();
      } else {
        // Dangerous Amber-Orange Round Bullets
        ctx.fillStyle = "#ffedd5";
        ctx.shadowColor = "#ea580c";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  }

  private drawPickup(p: Pickup): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);

    if (p.kind === "pow") {
      // Golden POW Badge
      ctx.fillStyle = "#e8b64c";
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#000000";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("POW", 0, 1);
    } else if (p.kind === "roll") {
      // Blue Winged Roll Badge
      ctx.fillStyle = "#38bdf8";
      ctx.strokeStyle = "#0369a1";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("R", 0, 1);
    }

    ctx.restore();
  }

  private updateAndDrawParticles(): void {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;
      p.x += p.vx * DT;
      p.y += p.vy * DT;
      p.vx *= 0.94;
      p.vy *= 0.94;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      const alpha = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawHUD(world: World): void {
    const ctx = this.ctx;
    ctx.save();

    // Military Stencil Header Bar
    ctx.fillStyle = "#e8b64c";
    ctx.font = "bold 20px 'Trebuchet MS', sans-serif";

    // 1P SCORE
    ctx.textAlign = "left";
    ctx.fillText("1P", 32, 38);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(world.score.toString().padStart(6, "0"), 32, 64);

    // HIGH SCORE
    ctx.fillStyle = "#e8b64c";
    ctx.textAlign = "right";
    ctx.fillText("HIGH", FIELD_W - 32, 38);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(Math.max(world.score, 50000).toString().padStart(6, "0"), FIELD_W - 32, 64);

    // LIVES (Bottom Left)
    ctx.fillStyle = "#e8b64c";
    for (let i = 0; i < world.player.lives; i++) {
      ctx.beginPath();
      ctx.arc(42 + i * 26, FIELD_H - 36, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // ROLLS (Bottom Left, above lives)
    ctx.fillStyle = "#38bdf8";
    for (let i = 0; i < world.player.rolls; i++) {
      ctx.fillRect(36 + i * 18, FIELD_H - 64, 12, 12);
    }

    // BOSS HEALTH BAR (If boss is active)
    const boss = world.enemies.find((e) => e.kind === "leviathan" && e.alive);
    if (boss) {
      const barW = 440;
      const barH = 16;
      const bx = (FIELD_W - barW) / 2;
      const by = 80;

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(bx, by, barW, barH);
      ctx.strokeStyle = "#e8b64c";
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, barW, barH);

      const ratio = Math.max(0, boss.hp / boss.maxHp);
      ctx.fillStyle = ratio < 0.25 ? "#ef4444" : "#e8b64c";
      ctx.fillRect(bx + 2, by + 2, (barW - 4) * ratio, barH - 4);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("LEVIATHAN", FIELD_W / 2, by - 6);
    }

    ctx.restore();
  }
}
