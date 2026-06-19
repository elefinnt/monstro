import Phaser from "phaser";
import { NUM } from "./palette.js";

/**
 * Thin EXP bar (player side only). Render-only for now: `MonsterInstance` has
 * no experience/level-progress field yet, so it draws empty (0%). Once EXP data
 * is added to the synced battle model, call `setFraction` with the real value.
 */
export class ExpBar {
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly band: Phaser.GameObjects.Rectangle;
  private readonly parts: Phaser.GameObjects.Rectangle[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number,
    depth: number,
  ) {
    const outline = scene.add
      .rectangle(x - 1, y - 1, width + 2, height + 2, NUM.boxOutline)
      .setOrigin(0, 0);
    const track = scene.add.rectangle(x, y, width, height, NUM.expTrack).setOrigin(0, 0);
    this.fill = scene.add.rectangle(x, y, 0, height, NUM.expBlue).setOrigin(0, 0);
    this.band = scene.add.rectangle(x, y + height - 1, 0, 1, NUM.expBlueDark).setOrigin(0, 0);
    this.parts.push(outline, track, this.fill, this.band);
    for (const part of this.parts) part.setDepth(depth);
  }

  /** Set the bar to a 0..1 fraction of the current level's EXP. */
  setFraction(frac: number): void {
    const w = Math.max(0, Math.round(this.width * Phaser.Math.Clamp(frac, 0, 1)));
    this.fill.setSize(w, this.height).setPosition(this.x, this.y);
    this.band.setSize(w, 1).setPosition(this.x, this.y + this.height - 1);
  }

  destroy(): void {
    for (const part of this.parts) part.destroy();
    this.parts.length = 0;
  }
}
