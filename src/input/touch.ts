import { FIELD_H, FIELD_W } from "../sim/types";

export interface TouchState {
  dragDx: number;
  dragDy: number;
  fire: boolean;
  roll: boolean;
  ult: boolean;
}

export function createTouchHandler(canvas: HTMLCanvasElement): {
  sample: () => TouchState;
  cleanup: () => void;
} {
  let dragDx = 0;
  let dragDy = 0;
  let isTouching = false;
  let rollTriggered = false;
  let ultTriggered = false;
  let activePointerId: number | null = null;
  let lastX = 0;
  let lastY = 0;

  // Listen for custom trigger from the UI roll and ult buttons
  const onRollTrigger = () => {
    rollTriggered = true;
  };
  const onUltTrigger = () => {
    ultTriggered = true;
  };
  window.addEventListener("iron-wings-roll", onRollTrigger);
  window.addEventListener("iron-wings-ult", onUltTrigger);

  const getCanvasScale = () => {
    const rect = canvas.getBoundingClientRect();
    return {
      scaleX: FIELD_W / rect.width,
      scaleY: FIELD_H / rect.height,
    };
  };

  const onPointerDown = (e: PointerEvent) => {
    if (activePointerId === null) {
      activePointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      isTouching = true;
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerId === activePointerId) {
      const { scaleX, scaleY } = getCanvasScale();
      dragDx += (e.clientX - lastX) * scaleX;
      dragDy += (e.clientY - lastY) * scaleY;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  };

  const resetPointer = () => {
    activePointerId = null;
    isTouching = false;
    dragDx = 0;
    dragDy = 0;
  };

  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId === activePointerId) {
      resetPointer();
    }
  };

  const onPointerCancel = (e: PointerEvent) => {
    if (e.pointerId === activePointerId) {
      resetPointer();
    }
  };

  const onLostPointerCapture = (e: PointerEvent) => {
    if (e.pointerId === activePointerId) {
      resetPointer();
    }
  };

  const onWindowBlur = () => {
    resetPointer();
  };

  // Block pinch-zoom and gesture scrolling on play surface
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("lostpointercapture", onLostPointerCapture);
  window.addEventListener("blur", onWindowBlur);

  return {
    sample: () => {
      const state: TouchState = {
        dragDx,
        dragDy,
        fire: isTouching,
        roll: rollTriggered,
        ult: ultTriggered,
      };
      dragDx = 0;
      dragDy = 0;
      rollTriggered = false;
      ultTriggered = false;
      return state;
    },
    cleanup: () => {
      window.removeEventListener("iron-wings-roll", onRollTrigger);
      window.removeEventListener("iron-wings-ult", onUltTrigger);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("lostpointercapture", onLostPointerCapture);
      window.removeEventListener("blur", onWindowBlur);
    },
  };
}
