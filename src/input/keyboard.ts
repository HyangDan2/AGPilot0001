export interface KeyboardState {
  moveX: number;
  moveY: number;
  fire: boolean;
  roll: boolean;
  pause: boolean;
}

export function createKeyboardHandler(): {
  sample: () => KeyboardState;
  cleanup: () => void;
} {
  const keys = new Set<string>();
  let pauseTriggered = false;

  const onKeyDown = (e: KeyboardEvent) => {
    keys.add(e.code);
    if (e.code === "KeyP" || e.code === "Escape") {
      pauseTriggered = true;
    }
    // Prevent scrolling with arrows/space
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };

  const onBlur = () => {
    keys.clear();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  return {
    sample: () => {
      let mx = 0;
      let my = 0;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) mx -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) mx += 1;
      if (keys.has("ArrowUp") || keys.has("KeyW")) my -= 1;
      if (keys.has("ArrowDown") || keys.has("KeyS")) my += 1;

      const fire = keys.has("KeyZ") || keys.has("Space") || keys.has("KeyJ");
      const roll = keys.has("KeyX") || keys.has("ShiftLeft") || keys.has("ShiftRight") || keys.has("KeyK");
      const pause = pauseTriggered;
      pauseTriggered = false;

      return { moveX: mx, moveY: my, fire, roll, pause };
    },
    cleanup: () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}
