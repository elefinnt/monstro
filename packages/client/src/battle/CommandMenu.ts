import Phaser from "phaser";
import { DEPTH, STRIP } from "./layout.js";
import { HEX } from "./palette.js";
import { PixelBox } from "./PixelBox.js";
import { pixelText } from "./text.js";
import { Cursor } from "./Cursor.js";

/** One selectable command cell. */
export interface CommandItem {
  label: string;
  enabled: boolean;
}

const BOX_X = STRIP.messageWidth;
const COLS = [BOX_X + 12, BOX_X + 50];
const ROWS = [STRIP.y + 10, STRIP.y + 28];

/**
 * The FIGHT / BAG / MONSTER / RUN command panel: a 2x2 grid occupying the
 * right 96px of the bottom strip, with the red selection arrow. Pure view —
 * navigation/state lives in `BattleMenu`.
 */
export class CommandMenu {
  private readonly box: PixelBox;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly cursor: Cursor;

  constructor(scene: Phaser.Scene) {
    this.box = new PixelBox(scene, BOX_X, STRIP.y, STRIP.commandWidth, STRIP.h, DEPTH.menu);
    for (let i = 0; i < 4; i++) {
      const text = pixelText(scene, COLS[i % 2], ROWS[Math.floor(i / 2)], "", { size: 7 }).setDepth(
        DEPTH.menu + 1,
      );
      this.labels.push(text);
    }
    this.cursor = new Cursor(scene, DEPTH.cursor);
    this.setVisible(false);
  }

  /** Render the four items and place the cursor at `selected`. */
  render(items: CommandItem[], selected: number): void {
    this.setVisible(true);
    items.forEach((item, i) => {
      this.labels[i]
        .setText(item.label)
        .setColor(item.enabled ? HEX.boxOutline : HEX.disabled);
    });
    const col = selected % 2;
    const row = Math.floor(selected / 2);
    this.cursor.moveTo(COLS[col] - 8, ROWS[row] - 1);
  }

  setVisible(visible: boolean): void {
    this.box.setVisible(visible);
    for (const label of this.labels) label.setVisible(visible);
    if (!visible) this.cursor.hide();
  }

  destroy(): void {
    this.box.destroy();
    for (const label of this.labels) label.destroy();
    this.cursor.destroy();
  }
}
