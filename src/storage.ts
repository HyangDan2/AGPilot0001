export interface GameSettings {
  muted: boolean;
  reducedMotion: boolean;
}

const SETTINGS_KEY = "iron_wings_settings_v1";
const HIGHSCORE_KEY = "iron_wings_highscore_v1";

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Storage access may fail in private mode
  }
  return { muted: false, reducedMotion: false };
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage failure
  }
}

export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HIGHSCORE_KEY);
    if (raw) {
      return parseInt(raw, 10) || 0;
    }
  } catch {
    // Ignore storage failure
  }
  return 0;
}

export function saveHighScore(score: number): void {
  try {
    const current = loadHighScore();
    if (score > current) {
      localStorage.setItem(HIGHSCORE_KEY, score.toString());
    }
  } catch {
    // Ignore storage failure
  }
}
