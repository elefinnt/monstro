import Phaser from "phaser";
import { NUM } from "./palette.js";

/** Colour pair (fill + 1px bottom dither band) for a given HP fraction. */
function colourFor(frac: number): [number, number] {
  if (frac > 0.5) return [NUM.hpGreen, NUM.hpGreenDark];
  if (frac > 0.2) return [NUM.hpYellow, NUM.hpYellowDark];
  return [NUM.hpRed, NUM.hpRedDark];
}

/**
 * Emerald-style HP bar: 1px dark outline, dark track, a flat colour fill and a
 * 1px darker band along the bottom = a 2-step dither (no gradient). The fill
 * colour steps green -> yellow -> red as HP drops. Positioned in canvas space.
 */
export class HpBar {
  private readonly track: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly band: Phaser.GameObjects.Rectangle;
  private readonly outline: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number,
    depth: number,
  ) {
    this.outline = scene.add
      .rectangle(x - 1, y - 1, width + 2, height + 2, NUM.boxOutline)
      .setOrigin(0, 0)
      .setDepth(depth);
    this.track = scene.add
      .rectangle(x, y, width, height, NUM.hpTrack)
      .setOrigin(0, 0)
      .setDepth(depth);
    this.fill = scene.add
      .rectangle(x, y, width, height, NUM.hpGreen)
      .setOrigin(0, 0)
      .setDepth(depth);
    this.band = scene.add
      .rectangle(x, y + height - 1, width, 1, NUM.hpGreenDark)
      .setOrigin(0, 0)
      .setDepth(depth);
  }

  /** Set the bar to a 0..1 fraction, updating width and colour step. */
  setFraction(frac: number): void {
    const clamped = Phaser.Math.Clamp(frac, 0, 1);
    const w = Math.max(0, Math.round(this.width * clamped));
    const [fill, dark] = colourFor(clamped);
    this.fill.setSize(w, this.height).setPosition(this.x, this.y).setFillStyle(fill);
    this.band.setSize(w, 1).setPosition(this.x, this.y + this.height - 1).setFillStyle(dark);
  }

  destroy(): void {
    this.outline.destroy();
    this.track.destroy();
    this.fill.destroy();
    this.band.destroy();
  }
}
