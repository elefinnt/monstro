import Phaser from "phaser";
import { HEX } from "./palette.js";

/**
 * Centralised battle-UI text creation.
 *
 * Uses standard Phaser `Text` with a clean monospace face. The battle camera
 * integer-scales the 240x160 canvas, so text would normally be rendered tiny
 * then magnified (blurry). To stay crisp we bump each label's render
 * `resolution` to roughly match the on-screen scale (zoom x DPR), so glyphs are
 * rasterised at their final size. (A pixel/bitmap font can be reintroduced
 * later behind this same helper.)
 */
const FONT_STACK = 'ui-monospace, "Segoe UI", "Courier New", monospace';

export interface PixelTextOptions {
  /** Font size in canvas pixels (pre-scale). */
  size?: number;
  /** CSS hex colour; defaults to the near-black box outline/text colour. */
  color?: string;
  /** Horizontal origin (0 = left, 1 = right). Defaults to left. */
  originX?: number;
  /** Vertical origin (0 = top, 1 = bottom). Defaults to top. */
  originY?: number;
  /** Optional word-wrap width in canvas pixels (for the message box). */
  wrapWidth?: number;
}

/** Create a crisp `Text` object positioned in canvas space. */
export function pixelText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  opts: PixelTextOptions = {},
): Phaser.GameObjects.Text {
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: FONT_STACK,
    fontSize: `${opts.size ?? 8}px`,
    color: opts.color ?? HEX.boxOutline,
  };
  if (opts.wrapWidth != null) style.wordWrap = { width: opts.wrapWidth };
  return scene.add
    .text(x, y, content, style)
    .setOrigin(opts.originX ?? 0, opts.originY ?? 0)
    .setResolution(resolutionFor(scene));
}

/** Render resolution that keeps text sharp at the current camera zoom. */
function resolutionFor(scene: Phaser.Scene): number {
  const zoom = scene.cameras?.main?.zoom ?? 1;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return Phaser.Math.Clamp(Math.round(zoom * dpr), 2, 16);
}
