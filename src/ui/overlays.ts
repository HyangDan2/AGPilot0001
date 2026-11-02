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
        <div class="logo-box">
          <h1 class="game-title">IRON WINGS</h1>
          <div class="subtitle">PACIFIC THEATER 1942</div>
        </div>
        <div class="high-score-display">RECORD: ${highScore.toString().padStart(6, "0")}</div>
        <button id="btn-start" class="btn btn-primary">START MISSION</button>
        <div class="instructions">
          <div><strong>KEYBOARD:</strong> ARROWS/WASD : MOVE | Z/SPACE : FIRE | X/SHIFT : ROLL</div>
          <div><strong>TOUCH:</strong> DRAG TO MOVE & AUTO-FIRE | [ROLL] BUTTON</div>
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
    const triggerRoll = (e: Event) => {
      e.stopPropagation();
      this.events.onRoll();
      window.dispatchEvent(new CustomEvent("iron-wings-roll"));
    };
    const rollBtn = document.getElementById("btn-touch-roll");
    rollBtn?.addEventListener("pointerdown", triggerRoll);
    rollBtn?.addEventListener("click", triggerRoll);
  }

  public showPauseMenu(): void {
    const el = document.createElement("div");
    el.id = "pause-menu";
    el.className = "overlay pause-screen";
    el.innerHTML = `
      <h2>TACTICAL PAUSE</h2>
      <div class="menu-actions">
        <button id="btn-resume" class="btn btn-primary">RESUME</button>
        <button id="btn-restart" class="btn">RESTART</button>
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
        <h2 class="danger-text">AIRCRAFT DESTROYED</h2>
        <div class="stats-card">
          <div class="stat-row"><span>SCORE:</span> <strong>${score}</strong></div>
          <div class="stat-row"><span>HIGH SCORE:</span> <strong>${highScore}</strong></div>
        </div>
        <button id="btn-restart" class="btn btn-primary">TRY AGAIN</button>
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
        <h2 class="victory-text">MISSION ACCOMPLISHED</h2>
        <div class="stats-card">
          <div class="stat-row"><span>ENEMIES DOWNED:</span> <strong>${destroyed}/${total} (${accuracy}%)</strong></div>
          ${noMissBonus > 0 ? `<div class="stat-row gold-text"><span>NO-MISS BONUS:</span> <strong>+${noMissBonus}</strong></div>` : ""}
          <div class="stat-row highlight"><span>FINAL SCORE:</span> <strong>${score}</strong></div>
          <div class="stat-row"><span>RECORD:</span> <strong>${highScore}</strong></div>
        </div>
        <button id="btn-restart" class="btn btn-primary">PLAY AGAIN</button>
      </div>
    `;
    document.getElementById("btn-restart")?.addEventListener("click", () => this.events.onRestart());
  }
}
