import Phaser from "phaser";
import { NUM } from "./palette.js";

/**
 * An Emerald-style dialogue/UI panel: off-white fill with a crisp 1px dark
 * outline (drawn as a slightly larger outline rect behind an inset fill). Lives
 * in canvas space; callers layer text/bars on top at higher depth.
 */
export class PixelBox {
  private readonly outline: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    depth: number,
    fillColour: number = NUM.boxFill,
  ) {
    this.outline = scene.add.rectangle(x, y, w, h, NUM.boxOutline).setOrigin(0, 0).setDepth(depth);
    this.fill = scene.add
      .rectangle(x + 1, y + 1, w - 2, h - 2, fillColour)
      .setOrigin(0, 0)
      .setDepth(depth);
  }

  setFill(colour: number): void {
    this.fill.setFillStyle(colour);
  }

  setVisible(visible: boolean): void {
    this.outline.setVisible(visible);
    this.fill.setVisible(visible);
  }

  destroy(): void {
    this.outline.destroy();
    this.fill.destroy();
  }
}
