export interface UIEvents {
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onToggleReducedMotion: () => void;
  onRoll: () => void;
}

export class UIManager {
  private container: HTMLElement;

  constructor(
    container: HTMLElement,
    private events: UIEvents,
  ) {
    this.container = container;
  }

  public showTitle(highScore: number, isMuted: boolean, reducedMotion: boolean): void {
    this.container.innerHTML = `
      <div class="overlay title-screen">
        <div class="brand-badge">
          <img src="./assets/branding/hd2lab.svg" class="brand-icon" alt="HD²LAB" width="20" height="20" />
          <span class="brand-title">HD²LAB ARCADE</span>
        </div>
        <div class="brand-slogan">HYPER DIMENSIONAL DESIGN</div>

        <div class="logo-box">
          <h1 class="game-title">VALKYRIE EIRA</h1>
          <div class="subtitle">SKYBREAK</div>
        </div>

        <div class="high-score-display">TOP RECORD : ${highScore.toString().padStart(6, "0")}</div>

        <button id="btn-start" class="btn btn-primary">START FLIGHT</button>

        <div class="instructions">
          <div><strong>KEYBOARD:</strong> WASD / ARROWS : MOVE | Z / SPACE : ARC BLADE | X / SHIFT : ROLL</div>
          <div><strong>TOUCH:</strong> DRAG TO FLY & AUTO-ATTACK | [ROLL] EVASION</div>
        </div>

        <div class="settings-bar">
          <button id="btn-mute" class="btn btn-sm">${isMuted ? "UNMUTE" : "MUTE"}</button>
          <button id="btn-motion" class="btn btn-sm">${reducedMotion ? "MOTION: REDUCED" : "MOTION: NORMAL"}</button>
        </div>
      </div>
    `;

    document.getElementById("btn-start")?.addEventListener("click", () => this.events.onStart());
    document.getElementById("btn-mute")?.addEventListener("click", () => this.events.onToggleMute());
    document.getElementById("btn-motion")?.addEventListener("click", () => this.events.onToggleReducedMotion());
  }

  public showInGameHUD(isMuted: boolean): void {
    this.container.innerHTML = `
      <div class="hud-overlay">
        <button id="btn-pause" class="hud-btn pause-btn" aria-label="Pause">❚❚</button>
        <button id="btn-ingame-mute" class="hud-btn mute-btn" aria-label="Mute">${isMuted ? "🔇" : "🔊"}</button>
        <button id="btn-touch-roll" class="touch-roll-btn" aria-label="Evasive Roll">ROLL</button>
      </div>
    `;

    document.getElementById("btn-pause")?.addEventListener("click", () => this.events.onResume());
    document.getElementById("btn-ingame-mute")?.addEventListener("click", () => this.events.onToggleMute());

    let lastRollTime = 0;
    const triggerRoll = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const now = performance.now();
      if (now - lastRollTime < 250) return; // 250ms debounce
      lastRollTime = now;
      this.events.onRoll();
      window.dispatchEvent(new CustomEvent("iron-wings-roll"));
    };

    const rollBtn = document.getElementById("btn-touch-roll");
    rollBtn?.addEventListener("pointerdown", triggerRoll);
  }

  public showPauseMenu(): void {
    const el = document.createElement("div");
    el.id = "pause-menu";
    el.className = "overlay pause-screen";
    el.innerHTML = `
      <div class="brand-badge">
        <img src="./assets/branding/hd2lab.svg" class="brand-icon" alt="HD²LAB" width="16" height="16" />
        <span class="brand-title">HD²LAB ARCADE</span>
      </div>
      <h2>TACTICAL PAUSE</h2>
      <div class="menu-actions">
        <button id="btn-resume" class="btn btn-primary">RESUME FLIGHT</button>
        <button id="btn-restart" class="btn">RESTART MISSION</button>
      </div>
    `;
    this.container.appendChild(el);

    document.getElementById("btn-resume")?.addEventListener("click", () => {
      el.remove();
      this.events.onResume();
    });
    document.getElementById("btn-restart")?.addEventListener("click", () => {
      el.remove();
      this.events.onRestart();
    });
  }

  public hidePauseMenu(): void {
    document.getElementById("pause-menu")?.remove();
  }

  public showGameOver(score: number, highScore: number): void {
    this.container.innerHTML = `
      <div class="overlay game-over-screen">
        <div class="brand-badge">
          <img src="./assets/branding/hd2lab.svg" class="brand-icon" alt="HD²LAB" width="16" height="16" />
          <span class="brand-title">HD²LAB ARCADE</span>
        </div>
        <h2 class="danger-text">VALKYRIE FALLEN</h2>
        <div class="stats-card">
          <div class="stat-row"><span>MISSION SCORE:</span> <strong>${score}</strong></div>
          <div class="stat-row highlight"><span>TOP RECORD:</span> <strong>${highScore}</strong></div>
        </div>
        <button id="btn-restart" class="btn btn-primary">RETRY BATTLE</button>
      </div>
    `;
    document.getElementById("btn-restart")?.addEventListener("click", () => this.events.onRestart());
  }

  public showVictory(
    score: number,
    highScore: number,
    destroyed: number,
    total: number,
    noMissBonus: number,
  ): void {
    const accuracy = total > 0 ? Math.round((destroyed / total) * 100) : 100;
    this.container.innerHTML = `
      <div class="overlay victory-screen">
        <div class="brand-badge">
          <img src="./assets/branding/hd2lab.svg" class="brand-icon" alt="HD²LAB" width="16" height="16" />
          <span class="brand-title">HD²LAB ARCADE</span>
        </div>
        <h2 class="victory-text">SKYBREAK ACCOMPLISHED</h2>
        <div class="stats-card">
          <div class="stat-row"><span>MONSTERS PURGED:</span> <strong>${destroyed}/${total} (${accuracy}%)</strong></div>
          ${noMissBonus > 0 ? `<div class="stat-row gold-text"><span>NO-MISS BONUS:</span> <strong>+${noMissBonus}</strong></div>` : ""}
          <div class="stat-row highlight"><span>FINAL SCORE:</span> <strong>${score}</strong></div>
          <div class="stat-row"><span>TOP RECORD:</span> <strong>${highScore}</strong></div>
        </div>
        <button id="btn-restart" class="btn btn-primary">CONTINUE JOURNEY</button>
      </div>
    `;
    document.getElementById("btn-restart")?.addEventListener("click", () => this.events.onRestart());
  }
}
