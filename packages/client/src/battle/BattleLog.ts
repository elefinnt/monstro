import Phaser from "phaser";
import { DEPTH, STRIP } from "./layout.js";
import { PixelBox } from "./PixelBox.js";
import { pixelText } from "./text.js";

/**
 * The bottom message box that narrates the battle ("Ember used Ember!"). An
 * Emerald-style off-white panel with dark pixel text, spanning the full bottom
 * strip. Menus overlay its right portion when open.
 */
export class BattleLog {
  private readonly box: PixelBox;
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.box = new PixelBox(scene, 0, STRIP.y, STRIP.fullWidth, STRIP.h, DEPTH.message);
    this.text = pixelText(scene, 8, STRIP.y + 9, "", {
      size: 7,
      wrapWidth: STRIP.fullWidth - 16,
    }).setDepth(DEPTH.message + 1);
  }

  set(message: string): void {
    this.text.setText(message);
  }

  clear(): void {
    this.text.setText("");
  }

  destroy(): void {
    this.box.destroy();
    this.text.destroy();
  }
}
