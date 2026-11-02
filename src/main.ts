import { GameApp } from "./core/loop";

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const ui = document.getElementById("ui") as HTMLElement;

  if (canvas && ui) {
    new GameApp(canvas, ui);
  }
});
