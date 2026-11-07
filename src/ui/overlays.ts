export interface UIEvents {
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
  onNextStage?: () => void;
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
          <div><strong>KEYBOARD:</strong> WASD/ARROWS: MOVE | Z/SPACE: ARC BLADE | X/SHIFT: ROLL | C/L: ULTIMATE</div>
          <div><strong>TOUCH:</strong> DRAG TO FLY & AUTO-ATTACK | [ROLL] EVASION | [ULT] GUNGNIR JUDGEMENT</div>
        </div>

        <div class="settings-bar">
          <button id="btn-mute" class="btn btn-sm">${isMuted ? "UNMUTE" : "MUTE"}</button>
          <button id="btn-motion" class="btn btn-sm">${reducedMotion ? "MOTION: REDUCED" : "MOTION: NORMAL"}</button>
        </div>

        <div class="platform-links">
          <a href="https://hyangdan2.github.io/GameHub/" class="btn-hub" target="_blank" rel="noopener noreferrer">🎮 GAMEHUB</a>
          <a href="https://hyangdan2.github.io/" class="btn-hub" target="_blank" rel="noopener noreferrer">🏛 HD²LAB HQ</a>
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
        <button id="btn-touch-ult" class="touch-ult-btn" aria-label="Gungnir Ultimate">ULT</button>
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

    let lastUltTime = 0;
    const triggerUlt = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const now = performance.now();
      if (now - lastUltTime < 250) return;
      lastUltTime = now;
      window.dispatchEvent(new CustomEvent("iron-wings-ult"));
    };

    const ultBtn = document.getElementById("btn-touch-ult");
    ultBtn?.addEventListener("pointerdown", triggerUlt);
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
        <button id="btn-restart" class="btn">RESTART STAGE</button>
        <button id="btn-main-menu" class="btn">MAIN MENU</button>
      </div>
      <div class="platform-links">
        <a href="https://hyangdan2.github.io/GameHub/" class="btn-hub" target="_self">🎮 GAMEHUB</a>
        <a href="https://hyangdan2.github.io/" class="btn-hub" target="_self">🏛 HD²LAB HQ</a>
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
    document.getElementById("btn-main-menu")?.addEventListener("click", () => {
      this.showConfirmReturnModal(() => {
        el.remove();
        this.events.onReturnToTitle();
      });
    });
  }

  private showConfirmReturnModal(onConfirm: () => void): void {
    const modal = document.createElement("div");
    modal.id = "confirm-modal";
    modal.className = "confirm-modal-backdrop";
    modal.innerHTML = `
      <div class="confirm-modal">
        <div class="confirm-title">RETURN TO MAIN MENU</div>
        <div class="confirm-msg">Current stage flight progress will be lost.<br>Do you wish to continue?</div>
        <div class="confirm-actions">
          <button id="btn-confirm-cancel" class="btn btn-sm">CANCEL</button>
          <button id="btn-confirm-ok" class="btn btn-sm btn-danger">CONFIRM</button>
        </div>
      </div>
    `;
    this.container.appendChild(modal);

    document.getElementById("btn-confirm-cancel")?.addEventListener("click", () => {
      modal.remove();
    });
    document.getElementById("btn-confirm-ok")?.addEventListener("click", () => {
      modal.remove();
      onConfirm();
    });
  }

  public hidePauseMenu(): void {
    document.getElementById("confirm-modal")?.remove();
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
        <div class="menu-actions">
          <button id="btn-restart" class="btn btn-primary">RETRY BATTLE</button>
          <button id="btn-gameover-main" class="btn">MAIN MENU</button>
        </div>
        <div class="platform-links">
          <a href="https://hyangdan2.github.io/GameHub/" class="btn-hub" target="_self">🎮 GAMEHUB</a>
          <a href="https://hyangdan2.github.io/" class="btn-hub" target="_self">🏛 HD²LAB HQ</a>
        </div>
      </div>
    `;
    document.getElementById("btn-restart")?.addEventListener("click", () => this.events.onRestart());
    document.getElementById("btn-gameover-main")?.addEventListener("click", () => this.events.onReturnToTitle());
  }

  public showStageClear(
    _stage: number,
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
        <h2 class="victory-text">STAGE 01 CLEARED</h2>
        <div class="stage-name-sub">HALVARD : CELESTIAL SANCTUARY</div>
        <div class="stats-card">
          <div class="stat-row"><span>MONSTERS PURGED:</span> <strong>${destroyed}/${total} (${accuracy}%)</strong></div>
          ${noMissBonus > 0 ? `<div class="stat-row gold-text"><span>NO-MISS BONUS:</span> <strong>+${noMissBonus}</strong></div>` : ""}
          <div class="stat-row highlight"><span>STAGE SCORE:</span> <strong>${score}</strong></div>
          <div class="stat-row"><span>TOP RECORD:</span> <strong>${highScore}</strong></div>
        </div>
        <div class="next-stage-preview">
          <div class="next-label">NEXT MISSION</div>
          <div class="next-title">STAGE 02 — RAGNAROK RIFT</div>
          <div class="next-desc">Shattered Bifrost & Abyssal Storm Dragon</div>
        </div>
        <div class="menu-actions">
          <button id="btn-next-stage" class="btn btn-primary">ENTER RAGNAROK RIFT</button>
          <button id="btn-stageclear-main" class="btn">MAIN MENU</button>
        </div>
        <div class="platform-links">
          <a href="https://hyangdan2.github.io/GameHub/" class="btn-hub" target="_self">🎮 GAMEHUB</a>
          <a href="https://hyangdan2.github.io/" class="btn-hub" target="_self">🏛 HD²LAB HQ</a>
        </div>
      </div>
    `;
    document.getElementById("btn-next-stage")?.addEventListener("click", () => {
      if (this.events.onNextStage) this.events.onNextStage();
      else this.events.onRestart();
    });
    document.getElementById("btn-stageclear-main")?.addEventListener("click", () => this.events.onReturnToTitle());
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
        <div class="stage-name-sub">CAMPAIGN COMPLETE : VALKYRIE VICTORY</div>
        <div class="stats-card">
          <div class="stat-row"><span>TOTAL PURGED:</span> <strong>${destroyed}/${total} (${accuracy}%)</strong></div>
          ${noMissBonus > 0 ? `<div class="stat-row gold-text"><span>CAMPAIGN NO-MISS BONUS:</span> <strong>+${noMissBonus}</strong></div>` : ""}
          <div class="stat-row highlight"><span>FINAL CAMPAIGN SCORE:</span> <strong>${score}</strong></div>
          <div class="stat-row"><span>TOP RECORD:</span> <strong>${highScore}</strong></div>
        </div>
        <div class="menu-actions">
          <button id="btn-restart" class="btn btn-primary">NEW CAMPAIGN</button>
          <button id="btn-victory-main" class="btn">MAIN MENU</button>
        </div>
        <div class="platform-links">
          <a href="https://hyangdan2.github.io/GameHub/" class="btn-hub" target="_self">🎮 GAMEHUB</a>
          <a href="https://hyangdan2.github.io/" class="btn-hub" target="_self">🏛 HD²LAB HQ</a>
        </div>
      </div>
    `;
    document.getElementById("btn-restart")?.addEventListener("click", () => this.events.onRestart());
    document.getElementById("btn-victory-main")?.addEventListener("click", () => this.events.onReturnToTitle());
  }
}
