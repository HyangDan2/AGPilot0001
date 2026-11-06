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
  kind?: "spark" | "fire" | "smoke" | "shockwave" | "debris" | "water";
  rot?: number;
  vrot?: number;
}

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private shakeTimer = 0;
  private shakeAmount = 0;
  private warningTimer = 0;
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
      } else if (e.t === "warning") {
        this.warningTimer = 180; // 3 seconds of arcade warning banner
      }
    }
  }

  private spawnExplosion(x: number, y: number, size: "s" | "m" | "l" | "boss"): void {
    const count = size === "boss" ? 75 : size === "l" ? 45 : size === "m" ? 25 : 14;
    const baseSpeed = size === "boss" ? 320 : size === "l" ? 220 : size === "m" ? 150 : 90;

    // Expanding shockwave ring
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: size === "boss" ? 30 : 18,
      size: size === "boss" ? 160 : size === "l" ? 90 : 45,
      color: size === "boss" ? "rgba(255, 84, 104, 0.9)" : "rgba(68, 215, 245, 0.85)",
      kind: "shockwave",
    });

    // Fire & ember burst
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.2 + Math.random() * 0.8) * baseSpeed;
      const colors = ["#ffffff", "#ffe066", "#ff8800", "#ff3322", "#881100"];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 20 + Math.random() * 25,
        size: (size === "boss" ? 20 : 12) * (0.6 + Math.random() * 0.8),
        color: colors[Math.floor(Math.random() * colors.length)],
        kind: "fire",
      });
    }

    // Heavy black & grey smoke plumes
    const smokeCount = size === "boss" ? 30 : size === "l" ? 18 : 8;
    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.1 + Math.random() * 0.5) * (baseSpeed * 0.5);
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0,
        maxLife: 35 + Math.random() * 30,
        size: (size === "boss" ? 26 : 16) * (0.8 + Math.random() * 0.8),
        color: Math.random() > 0.5 ? "rgba(40, 45, 55, 0.85)" : "rgba(80, 90, 105, 0.7)",
        kind: "smoke",
      });
    }

    // Flying metal debris
    const debrisCount = size === "boss" ? 14 : size === "l" ? 8 : 4;
    for (let i = 0; i < debrisCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.4 + Math.random() * 0.9) * baseSpeed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 25 + Math.random() * 20,
        size: 4 + Math.random() * 4,
        color: "#c0d0e0",
        kind: "debris",
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.4,
      });
    }

    if (!this.reducedMotion) {
      if (size === "boss") {
        this.shakeTimer = 40;
        this.shakeAmount = 16;
      } else if (size === "l") {
        this.shakeTimer = 20;
        this.shakeAmount = 9;
      }
    }
  }

  private spawnSparks(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 110;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 8 + Math.random() * 8,
        size: 3,
        color: Math.random() > 0.5 ? "#ffffff" : "#44d7f5",
        kind: "spark",
      });
    }
  }

  private spawnPickupSparks(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * 140,
        vy: Math.sin(angle) * 140,
        life: 0,
        maxLife: 26,
        size: 4,
        color: "#44d7f5",
        kind: "spark",
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

    // 1. Deep Ocean & Procedural Sea Waves
    this.drawOcean(world.scrollY);

    // 2. Archipelago Islands (Midground Parallax)
    this.drawIslands(world.scrollY);

    // 3. Aircraft Carrier (intro takeoff sequence)
    if (world.stageTick < 300) {
      this.drawCarrier(world.scrollY);
    }

    // 4. Low-altitude Cloud Shadows
    this.drawCloudShadows(world.scrollY);

    // 5. Ground / Sea Targets (Gunboats)
    for (const enemy of world.enemies) {
      if (enemy.ground && enemy.alive) {
        this.drawEnemy(enemy);
      }
    }

    // 6. Airborne Enemies (Kestrels, Harriers, Condors, Bosses)
    for (const enemy of world.enemies) {
      if (!enemy.ground && enemy.alive) {
        this.drawEnemy(enemy);
      }
    }

    // 7. Pickups (POW, Roll, Medals)
    for (const pickup of world.pickups) {
      if (pickup.alive) {
        this.drawPickup(pickup);
      }
    }

    // 8. Projectiles (Player Laser Needles & Enemy Plasma Orbs)
    this.drawBullets(world);

    // 9. Player Aircraft
    if (world.player.downTimer === 0) {
      this.drawPlayer(world.player);
    }

    // 10. Particle System (Explosions, Fire, Smoke, Sparks, Debris)
    this.updateAndDrawParticles();

    // 11. High-altitude Fluffy Clouds (Foreground Parallax)
    this.drawHighClouds(world.scrollY);

    ctx.restore();

    // 12. Warning Banner (if active)
    if (this.warningTimer > 0) {
      this.drawWarningBanner();
      this.warningTimer--;
    }

    // 13. HUD (Fixed, not shaken)
    this.drawHUD(world);
  }

  private drawOcean(scrollY: number): void {
    const ctx = this.ctx;

    // Deep Pacific Ocean Gradient: Midnight Navy to Cerulean Depth
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD_H);
    grad.addColorStop(0, "#07162b");
    grad.addColorStop(0.5, "#0a2240");
    grad.addColorStop(1, "#081a33");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);

    // Procedural multi-wave caustics & sun glints
    ctx.lineWidth = 1.5;
    const waveGap = 64;
    const offset = scrollY % waveGap;

    for (let y = -waveGap + offset; y < FIELD_H + waveGap; y += waveGap) {
      // Primary wave ridge
      ctx.strokeStyle = "rgba(68, 215, 245, 0.12)";
      ctx.beginPath();
      for (let x = 0; x <= FIELD_W; x += 30) {
        const waveY = y + Math.sin((x + scrollY * 0.7) * 0.035) * 7 + Math.cos((x * 0.02) - scrollY * 0.02) * 4;
        if (x === 0) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();

      // Secondary fine foam wave
      ctx.strokeStyle = "rgba(180, 240, 255, 0.06)";
      ctx.beginPath();
      for (let x = 15; x <= FIELD_W; x += 30) {
        const waveY2 = y + 24 + Math.cos((x - scrollY * 0.5) * 0.045) * 5;
        if (x === 15) ctx.moveTo(x, waveY2);
        else ctx.lineTo(x, waveY2);
      }
      ctx.stroke();
    }
  }

  private drawIslands(scrollY: number): void {
    const ctx = this.ctx;
    ctx.save();

    // Parallax scrolling islands
    const islandOffset = (scrollY * 0.85) % 3200;

    const islands = [
      { x: 180, y: -400 + islandOffset, rx: 110, ry: 75, angle: 0.3 },
      { x: 540, y: 800 + islandOffset, rx: 140, ry: 90, angle: -0.2 },
      { x: 220, y: 2000 + islandOffset, rx: 160, ry: 100, angle: 0.15 },
    ];

    for (const isl of islands) {
      if (isl.y < -250 || isl.y > FIELD_H + 250) continue;

      ctx.save();
      ctx.translate(isl.x, isl.y);
      ctx.rotate(isl.angle);

      // Shallow turquoise water reef around island
      ctx.fillStyle = "rgba(40, 180, 200, 0.28)";
      ctx.beginPath();
      ctx.ellipse(0, 0, isl.rx + 28, isl.ry + 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sandy beach shoreline
      ctx.fillStyle = "#d4b886";
      ctx.beginPath();
      ctx.ellipse(0, 0, isl.rx + 8, isl.ry + 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lush tropical jungle canopy
      ctx.fillStyle = "#1e4d2b";
      ctx.beginPath();
      ctx.ellipse(0, 0, isl.rx, isl.ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner dense ridge highlight
      ctx.fillStyle = "#2d6a3e";
      ctx.beginPath();
      ctx.ellipse(-10, -8, isl.rx * 0.65, isl.ry * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }

  private drawCarrier(scrollY: number): void {
    const ctx = this.ctx;
    const cy = FIELD_H - 120 + scrollY * 0.45;
    ctx.save();
    ctx.translate(FIELD_W / 2, cy);

    // Carrier stern water wake foam
    ctx.fillStyle = "rgba(220, 245, 255, 0.25)";
    ctx.beginPath();
    ctx.moveTo(-70, 280);
    ctx.lineTo(70, 280);
    ctx.lineTo(130, 480);
    ctx.lineTo(-130, 480);
    ctx.closePath();
    ctx.fill();

    // Massive hull drop shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(-92, -310, 184, 620);

    // Steel hull outer trim
    ctx.fillStyle = "#2b3b4f";
    ctx.beginPath();
    ctx.roundRect(-90, -315, 180, 630, [45, 45, 15, 15]);
    ctx.fill();

    // Teak wooden flight deck
    ctx.fillStyle = "#7d6244";
    ctx.beginPath();
    ctx.roundRect(-82, -305, 164, 610, [40, 40, 10, 10]);
    ctx.fill();

    // Deck plank line textures
    ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
    ctx.lineWidth = 1;
    for (let y = -290; y < 290; y += 14) {
      ctx.beginPath();
      ctx.moveTo(-80, y);
      ctx.lineTo(80, y);
      ctx.stroke();
    }

    // Arresting gear cables
    ctx.strokeStyle = "#1a1f26";
    ctx.lineWidth = 2.5;
    for (const wy of [120, 160, 200]) {
      ctx.beginPath();
      ctx.moveTo(-74, wy);
      ctx.lineTo(74, wy);
      ctx.stroke();
    }

    // Flight deck centerline markings (gold neon striped)
    ctx.strokeStyle = "#f8c050";
    ctx.lineWidth = 5;
    ctx.setLineDash([32, 22]);
    ctx.beginPath();
    ctx.moveTo(0, -280);
    ctx.lineTo(0, 260);
    ctx.stroke();
    ctx.setLineDash([]);

    // Deck Number "01" Stencil
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "900 42px monospace";
    ctx.textAlign = "center";
    ctx.fillText("01", 0, -220);

    // Carrier Island / Bridge Tower on starboard (right side)
    ctx.fillStyle = "#3a4a5e";
    ctx.fillRect(66, -120, 22, 100);
    ctx.fillStyle = "#1e2834";
    ctx.fillRect(72, -100, 12, 60);

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

    // High altitude clouds: faster parallax, semi-transparent white puffs
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

  private drawPlayer(p: Player): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);

    // Flash when invulnerable
    if (p.invuln > 0 && Math.floor(p.invuln / 4) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Dynamic Banking (tilt angle based on horizontal velocity)
    const bankAngle = (p.vx / 420) * 0.22;
    ctx.rotate(bankAngle);

    // Evasive Roll Animation: 360-degree loop rotation and scale pulse
    let scale = 1;
    if (p.rollTimer > 0) {
      const progress = 1 - p.rollTimer / 72;
      scale = 1 + Math.sin(progress * Math.PI) * 0.6;
      ctx.rotate(progress * Math.PI * 2);
      ctx.scale(scale, scale);
    }

    // Ground Drop Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
    ctx.beginPath();
    ctx.ellipse(0, 36, 42 * scale, 32 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Twin Engine Exhaust Contrails
    for (const bx of [-28, 28]) {
      ctx.fillStyle = "rgba(68, 215, 245, 0.45)";
      ctx.beginPath();
      ctx.moveTo(bx - 3, 34);
      ctx.lineTo(bx + 3, 34);
      ctx.lineTo(bx, 52 + Math.random() * 8);
      ctx.closePath();
      ctx.fill();
    }

    // Main Wings (Detailed military green alloy with panel rivets)
    ctx.fillStyle = "#3d5743";
    ctx.strokeStyle = "#1d3023";
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(-48, -4);
    ctx.lineTo(48, -4);
    ctx.lineTo(42, 18);
    ctx.lineTo(-42, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Outer Wingtips with Yellow Hazard Trim
    ctx.fillStyle = "#f8c050";
    ctx.fillRect(-48, -4, 8, 22);
    ctx.fillRect(40, -4, 8, 22);

    // Twin Engine Booms
    for (const bx of [-28, 28]) {
      ctx.fillStyle = "#324938";
      ctx.beginPath();
      ctx.roundRect(bx - 8, -26, 16, 62, 5);
      ctx.fill();
      ctx.stroke();

      // Spinning 3-Blade Propeller Blur
      ctx.strokeStyle = "rgba(230, 248, 255, 0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(bx, -28, 17, 4, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Propeller Hub Spinner (Gold)
      ctx.fillStyle = "#f8c050";
      ctx.beginPath();
      ctx.arc(bx, -28, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Horizontal Tail Stabilizer connecting booms
    ctx.fillStyle = "#3d5743";
    ctx.fillRect(-30, 30, 60, 10);
    ctx.strokeRect(-30, 30, 60, 10);

    // Central Fuselage Nacelle
    ctx.fillStyle = "#4a6952";
    ctx.beginPath();
    ctx.roundRect(-12, -36, 24, 54, [12, 12, 4, 4]);
    ctx.fill();
    ctx.stroke();

    // Twin Machine Gun Barrels at the Nose
    ctx.fillStyle = "#111822";
    ctx.fillRect(-4, -42, 2.5, 8);
    ctx.fillRect(1.5, -42, 2.5, 8);

    // Cockpit Glass Canopy (Cyan High-Tech Sheen)
    const glassGrad = ctx.createLinearGradient(0, -26, 0, -6);
    glassGrad.addColorStop(0, "#e0f7ff");
    glassGrad.addColorStop(0.4, "#44d7f5");
    glassGrad.addColorStop(1, "#142650");
    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.roundRect(-7, -26, 14, 22, 6);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();

    // HD²LAB Wing Emblems: Golden Winged Chevron + Neon Blue Core
    for (const ex of [-36, 36]) {
      ctx.fillStyle = "#f8c050";
      ctx.beginPath();
      ctx.moveTo(ex, 2);
      ctx.lineTo(ex + 5, 12);
      ctx.lineTo(ex - 5, 12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#44d7f5";
      ctx.beginPath();
      ctx.arc(ex, 7, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Invulnerability Protective Energy Barrier (when rolling or respawning)
    if (p.rollTimer > 0 || p.invuln > 0) {
      ctx.strokeStyle = "rgba(68, 215, 245, 0.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 52 * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.heading);

    // Hit Flash (Pure white hot flash on damage)
    if (enemy.flash > 0) {
      ctx.filter = "brightness(2.8) contrast(1.4)";
    }

    switch (enemy.kind) {
      case "kestrel":
      case "kestrelRed": {
        const isRed = enemy.kind === "kestrelRed";
        ctx.fillStyle = isRed ? "#b82430" : "#2a394a";
        ctx.strokeStyle = isRed ? "#5c0e15" : "#121b26";
        ctx.lineWidth = 2;

        // Fighter Hull
        ctx.beginPath();
        ctx.moveTo(0, 26);
        ctx.lineTo(-26, -4);
        ctx.lineTo(-8, -20);
        ctx.lineTo(0, -24);
        ctx.lineTo(8, -20);
        ctx.lineTo(26, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Crimson Squadron Accents
        ctx.fillStyle = isRed ? "#f8c050" : "#44d7f5";
        ctx.fillRect(-22, -4, 4, 12);
        ctx.fillRect(18, -4, 4, 12);

        // Cockpit Canopy
        ctx.fillStyle = isRed ? "#ffdd66" : "#44d7f5";
        ctx.fillRect(-3, 2, 6, 12);
        break;
      }

      case "harrier": {
        // Swept-wing High Speed Dive Bomber
        ctx.fillStyle = "#1e2e42";
        ctx.strokeStyle = "#0d1622";
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(0, 34);
        ctx.lineTo(-32, 8);
        ctx.lineTo(-14, -22);
        ctx.lineTo(14, -22);
        ctx.lineTo(32, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Twin Jet Intake Glow
        ctx.fillStyle = "#ff5468";
        ctx.fillRect(-10, -18, 5, 8);
        ctx.fillRect(5, -18, 5, 8);
        break;
      }

      case "condor": {
        // Heavy 4-Engine Strategic Bomber
        ctx.fillStyle = "#2d3f52";
        ctx.strokeStyle = "#16222f";
        ctx.lineWidth = 3;

        // Huge Swept Wings
        ctx.beginPath();
        ctx.moveTo(-74, 2);
        ctx.lineTo(74, 2);
        ctx.lineTo(64, 26);
        ctx.lineTo(-64, 26);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Fuselage
        ctx.beginPath();
        ctx.roundRect(-18, -48, 36, 96, 12);
        ctx.fill();
        ctx.stroke();

        // 4 Wing Engine Nacelles with Spinning Blur
        for (const ex of [-54, -28, 28, 54]) {
          ctx.fillStyle = "#1e2834";
          ctx.fillRect(ex - 6, -12, 12, 34);
          ctx.strokeStyle = "rgba(220, 240, 255, 0.6)";
          ctx.beginPath();
          ctx.ellipse(ex, 24, 10, 3, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Dorsal Gun Turret
        ctx.fillStyle = "#ff5468";
        ctx.beginPath();
        ctx.arc(0, -6, 7, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case "gunboat": {
        // Armored Coastal Gunboat (on water)
        ctx.fillStyle = "#3e4c5e";
        ctx.strokeStyle = "#202a36";
        ctx.lineWidth = 2.5;

        // Ship Wake in Water
        ctx.fillStyle = "rgba(200, 240, 255, 0.25)";
        ctx.beginPath();
        ctx.moveTo(0, 56);
        ctx.lineTo(-30, -50);
        ctx.lineTo(30, -50);
        ctx.closePath();
        ctx.fill();

        // Armored Warship Hull
        ctx.fillStyle = "#3e4c5e";
        ctx.beginPath();
        ctx.moveTo(0, 52);
        ctx.lineTo(-24, 12);
        ctx.lineTo(-22, -44);
        ctx.lineTo(22, -44);
        ctx.lineTo(24, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Heavy Twin Naval Turrets
        ctx.fillStyle = "#1a2430";
        for (const ty of [-16, 18]) {
          ctx.beginPath();
          ctx.arc(0, ty, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ff5468";
          ctx.fillRect(-2, ty + 6, 4, 14);
          ctx.fillStyle = "#1a2430";
        }
        break;
      }

      case "albatross": {
        // Midboss: Twin-Hull Heavy Assault Flying Wing
        ctx.fillStyle = "#223142";
        ctx.strokeStyle = "#101924";
        ctx.lineWidth = 3.5;

        // Massive Wing Span
        ctx.beginPath();
        ctx.roundRect(-135, -34, 270, 68, 18);
        ctx.fill();
        ctx.stroke();

        // Wing Leading Edge Armor
        ctx.fillStyle = "#172330";
        ctx.fillRect(-130, -32, 260, 10);

        // Engines & Damage Effects
        for (const p of enemy.parts) {
          ctx.fillStyle = p.alive ? (p.flash > 0 ? "#ffffff" : "#ff5468") : "#0b1016";
          ctx.beginPath();
          ctx.arc(p.dx, p.dy, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Smoke plume if engine destroyed
          if (!p.alive) {
            ctx.fillStyle = "rgba(40, 40, 40, 0.8)";
            ctx.beginPath();
            ctx.arc(p.dx, p.dy - 12, 14, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      case "leviathan": {
        // GIANT STAGE 1 FINAL BOSS: Leviathan Flying Fortress
        ctx.fillStyle = "#182230";
        ctx.strokeStyle = "#0c131c";
        ctx.lineWidth = 4;

        // Heavy Armored Main Hull
        ctx.beginPath();
        ctx.roundRect(-245, -65, 490, 130, 26);
        ctx.fill();
        ctx.stroke();

        // Armored Wing Ribs
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 2;
        for (let x = -220; x <= 220; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, -60);
          ctx.lineTo(x, 60);
          ctx.stroke();
        }

        // 4 Engine Nacelles (Individually Destructible)
        for (const p of enemy.parts) {
          ctx.fillStyle = p.alive ? (p.flash > 0 ? "#ffffff" : "#ff5468") : "#090e14";
          ctx.beginPath();
          ctx.roundRect(p.dx - 26, p.dy - 32, 52, 64, 8);
          ctx.fill();
          ctx.stroke();

          // If destroyed: Fire and billowing smoke
          if (!p.alive) {
            ctx.fillStyle = "rgba(255, 84, 104, 0.85)";
            ctx.beginPath();
            ctx.arc(p.dx, p.dy, 16, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "rgba(30, 35, 45, 0.85)";
            ctx.beginPath();
            ctx.arc(p.dx + (Math.random() - 0.5) * 6, p.dy - 18, 20, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Pulsing Neon Reactor Core
        const coreGlow = (Math.sin(enemy.age * 0.12) + 1) * 0.5;
        const coreColor = enemy.hp < 100 ? "#ff5468" : "#f8c050";
        ctx.fillStyle = coreColor;
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = 16 + coreGlow * 12;
        ctx.beginPath();
        ctx.arc(0, 22, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
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
        // High-Tech Neon Blue Plasma Needles
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#44d7f5";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(b.x - 3.5, b.y - 14, 7, 28, 3.5);
        ctx.fill();
      } else {
        // Glowing Hostile Crimson-Orange Tracer Bolts
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#ff5468";
        ctx.shadowBlur = 9;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#ff5468";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
  }

  private drawPickup(p: Pickup): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);

    const bob = Math.sin(p.age * 0.1) * 3;
    ctx.translate(0, bob);

    if (p.kind === "pow") {
      // Golden POW Badge with Glow
      ctx.shadowColor = "#f8c050";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#f8c050";
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#080d23";
      ctx.font = "900 15px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("POW", 0, 1);
    } else if (p.kind === "roll") {
      // Neon Cyan Roll Badge
      ctx.shadowColor = "#44d7f5";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#44d7f5";
      ctx.strokeStyle = "#142650";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#080d23";
      ctx.font = "900 18px monospace";
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

      if (p.rot !== undefined && p.vrot !== undefined) {
        p.rot += p.vrot;
      }

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      const alpha = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.kind === "shockwave") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4 * alpha;
        ctx.beginPath();
        const currentR = p.size * (p.life / p.maxLife);
        ctx.arc(p.x, p.y, currentR, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === "debris") {
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        // Fire / Smoke / Spark
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawWarningBanner(): void {
    const ctx = this.ctx;
    ctx.save();

    const flash = Math.floor(this.warningTimer / 15) % 2 === 0;
    if (flash) {
      // Crimson warning banner across mid-screen
      ctx.fillStyle = "rgba(255, 84, 104, 0.88)";
      ctx.fillRect(0, 480, FIELD_W, 90);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 36px monospace";
      ctx.textAlign = "center";
      ctx.letterSpacing = "6px";
      ctx.fillText("! WARNING !", FIELD_W / 2, 524);

      ctx.font = "700 16px monospace";
      ctx.fillText("HOSTILE LEVIATHAN DETECTED", FIELD_W / 2, 552);
    }

    ctx.restore();
  }

  private drawHUD(world: World): void {
    const ctx = this.ctx;
    ctx.save();

    // Top HUD Bar Background
    ctx.fillStyle = "rgba(8, 13, 35, 0.75)";
    ctx.fillRect(0, 0, FIELD_W, 76);
    ctx.strokeStyle = "rgba(68, 215, 245, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 76);
    ctx.lineTo(FIELD_W, 76);
    ctx.stroke();

    // 1P SCORE (Neon Cyan)
    ctx.font = "700 14px monospace";
    ctx.fillStyle = "#8fa5d8";
    ctx.textAlign = "left";
    ctx.fillText("1P SCORE", 32, 28);

    ctx.font = "900 24px monospace";
    ctx.fillStyle = "#44d7f5";
    ctx.fillText(world.score.toString().padStart(6, "0"), 32, 56);

    // TOP RECORD
    ctx.font = "700 14px monospace";
    ctx.fillStyle = "#8fa5d8";
    ctx.textAlign = "right";
    ctx.fillText("TOP RECORD", FIELD_W - 32, 28);

    ctx.font = "900 24px monospace";
    ctx.fillStyle = "#f8c050";
    ctx.fillText(Math.max(world.score, 50000).toString().padStart(6, "0"), FIELD_W - 32, 56);

    // LIVES (Bottom Left: Mini Fighter Silhouettes)
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

    // ROLLS / SPECIAL (Bottom Left, above lives)
    ctx.fillStyle = "#f8c050";
    ctx.font = "700 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText("ROLL", 32, FIELD_H - 62);
    for (let i = 0; i < world.player.rolls; i++) {
      ctx.fillRect(72 + i * 16, FIELD_H - 72, 11, 11);
    }

    // POWER LEVEL (Bottom Left: Lv1, Lv2, Lv3)
    ctx.fillStyle = "#8fa5d8";
    ctx.fillText("PWR", 32, FIELD_H - 86);
    for (let i = 1; i <= 3; i++) {
      ctx.fillStyle = i <= world.player.power ? "#44d7f5" : "rgba(68, 215, 245, 0.2)";
      ctx.fillRect(72 + (i - 1) * 16, FIELD_H - 96, 11, 11);
    }

    // BOSS HEALTH BAR (If Leviathan or Albatross is active)
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
      const bossName = boss.kind === "leviathan" ? "HOSTILE FLAGSHIP : LEVIATHAN" : "MID-ASSAULT BOMBER : ALBATROSS";
      ctx.fillText(bossName, FIELD_W / 2, by - 6);
    }

    ctx.restore();
  }
}
