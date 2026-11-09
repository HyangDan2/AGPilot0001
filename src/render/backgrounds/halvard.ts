import { FIELD_H, FIELD_W } from "../../sim/types";

type LayerKind = "base" | "islands" | "temples" | "clouds" | "shimmer";
type AnimatedKind = "islands" | "temples" | "clouds";
type Rect = [number, number, number, number];
interface Frame { id: string; rect: Rect; sourceRect: Rect }
interface Instance { id: string; frame: string; x: number; y: number; scale: number }
interface LayerInfo {
  image: string;
  speed: number;
  wrapPeriod?: number;
  frames?: Frame[];
  instances?: Instance[];
}
interface Manifest {
  version: string;
  sourceDimensions: [number, number];
  gameDimensions: [number, number];
  layers: Record<LayerKind, LayerInfo>;
}
const ROOT = "./assets/backgrounds/halvard-v3/";
const KEYS: LayerKind[] = ["base", "islands", "temples", "clouds", "shimmer"];

/** Stable, deterministic scene-space position. scrollY moves at 80 logical px/s. */
export function halvardParallaxY(startY: number, scrollY: number, speed: number, wrap: number): number {
  if (!(wrap > 0)) return startY;
  const travelled = startY + scrollY * speed / 80 + 1800;
  return ((travelled % wrap) + wrap) % wrap - 1800;
}

/**
 * True four-depth illustrated background. Each identified scene object has its
 * own sprite rect, position and wrapping cadence; no full-frame texture
 * scrolling and no procedural substitute pretending to be a painted layer.
 */
export class HalvardV3Background {
  public ready = false;
  public visible: Record<LayerKind, boolean> = {
    base: true, islands: true, temples: true, clouds: true, shimmer: true,
  };
  private manifest: Manifest | null = null;
  private images: Partial<Record<LayerKind, HTMLImageElement>> = {};
  private frames: Record<AnimatedKind, Map<string, Rect>> = {
    islands: new Map(), temples: new Map(), clouds: new Map(),
  };

  constructor() {
    if (typeof Image === "undefined" || typeof fetch === "undefined") return;
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("test")) {
      (window as Window & { __halvardV3?: HalvardV3Background }).__halvardV3 = this;
    }
    void this.load();
  }

  public setVisible(key: LayerKind, show: boolean): void {
    this.visible[key] = show;
  }

  private async load(): Promise<void> {
    try {
      const response = await fetch(ROOT + "manifest.json");
      if (!response.ok) return;
      const manifest = await response.json() as Manifest;
      if (manifest.version !== "3.0.0" ||
          manifest.gameDimensions[0] !== FIELD_W || manifest.gameDimensions[1] !== FIELD_H ||
          !KEYS.every((key) => manifest.layers[key]?.image)) return;
      const sprites = await Promise.all(KEYS.map((kind) => new Promise<[LayerKind, HTMLImageElement]>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve([kind, img]);
        img.onerror = () => reject(new Error("Halvard layer failed: " + kind));
        img.src = ROOT + manifest.layers[kind].image;
      })));
      const images: Partial<Record<LayerKind, HTMLImageElement>> = {};
      for (const [kind, image] of sprites) images[kind] = image;
      for (const kind of ["islands", "temples", "clouds"] as const) {
        const layer = manifest.layers[kind];
        if (!layer.frames || !layer.instances || !layer.wrapPeriod ||
            layer.instances.length === 0) return;
        const map = new Map(layer.frames.map((frame) => [frame.id, frame.rect] as [string, Rect]));
        if (layer.instances.some((instance) => !map.has(instance.frame))) return;
        this.frames[kind] = map;
      }
      this.manifest = manifest;
      this.images = images;
      this.ready = true;
    } catch {
      // v1 illustrated background remains the permanent fallback.
      this.ready = false;
    }
  }

  public drawBack(ctx: CanvasRenderingContext2D, scrollY: number, stageTick: number, phase: string): void {
    if (!this.ready) return;
    const base = this.images.base;
    if (this.visible.base && base) ctx.drawImage(base, 0, 0, FIELD_W, FIELD_H);
    else { ctx.fillStyle = "#0b1f48"; ctx.fillRect(0, 0, FIELD_W, FIELD_H); }

    const water = this.images.shimmer;
    if (water && this.visible.shimmer) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 703, FIELD_W, FIELD_H - 703);
      ctx.clip();
      ctx.globalAlpha = 0.20;
      // Horizontal reflection sways independently; never moves the horizon.
      const dx = Math.sin(scrollY * 0.016) * 9;
      const dy = Math.sin(scrollY * 0.02) * 9;
      ctx.drawImage(water, dx, dy, FIELD_W, FIELD_H);
      ctx.restore();
    }

    this.drawObjects(ctx, "islands", scrollY, 1);
    this.drawObjects(ctx, "temples", scrollY, 1);

    // Late-stage twilight and boss tone: sprites remain full detail beneath.
    const dusk = Math.min(1, Math.max(0, (stageTick - 1500) / 2200));
    const boss = phase === "boss" ? 0.09 : 0;
    ctx.save();
    ctx.fillStyle = `rgba(12, 13, 46, ${(0.025 + dusk * 0.12 + boss).toFixed(3)})`;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    ctx.restore();
  }

  public drawFront(ctx: CanvasRenderingContext2D, scrollY: number): void {
    if (!this.ready) return;
    // Foreground clouds pass Eira and enemies at 180 px/s, safely translucent.
    this.drawObjects(ctx, "clouds", scrollY, 0.58);
  }

  private drawObjects(ctx: CanvasRenderingContext2D, kind: AnimatedKind, scrollY: number, opacity: number): void {
    const image = this.images[kind];
    const layer = this.manifest?.layers[kind];
    if (!this.visible[kind] || !image || !layer?.frames || !layer.instances || !layer.wrapPeriod) return;
    ctx.save();
    ctx.globalAlpha *= opacity;
    for (const object of layer.instances) {
      const rect = this.frames[kind].get(object.frame);
      if (!rect) continue;
      const [sx, sy, sw, sh] = rect;
      const width = sw * object.scale;
      const height = sh * object.scale;
      const y = halvardParallaxY(object.y, scrollY, layer.speed, layer.wrapPeriod);
      if (y > FIELD_H || y + height < 0 ||
          object.x > FIELD_W || object.x + width < 0) continue;
      ctx.drawImage(image, sx, sy, sw, sh, object.x, y, width, height);
    }
    ctx.restore();
  }
}
