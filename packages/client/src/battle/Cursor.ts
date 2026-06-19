import Phaser from "phaser";
import { CURSOR } from "./layout.js";
import { NUM } from "./palette.js";

/** The Emerald-style selection arrow: a small right-pointing red triangle. */
export class Cursor {
  private readonly tri: Phaser.GameObjects.Triangle;

  constructor(scene: Phaser.Scene, depth: number) {
    this.tri = scene.add
      .triangle(0, 0, 0, 0, 0, CURSOR.h, CURSOR.w, CURSOR.h / 2, NUM.cursorRed)
      .setOrigin(0, 0)
      .setDepth(depth)
      .setVisible(false);
  }

  /** Place the cursor's top-left at (x, y) and show it. */
  moveTo(x: number, y: number): void {
    this.tri.setPosition(x, y).setVisible(true);
  }

  hide(): void {
    this.tri.setVisible(false);
  }

  destroy(): void {
    this.tri.destroy();
  }
}
