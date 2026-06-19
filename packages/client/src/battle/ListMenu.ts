import Phaser from "phaser";
import { CANVAS_W, DEPTH, STRIP } from "./layout.js";
import { HEX } from "./palette.js";
import { PixelBox } from "./PixelBox.js";
import { pixelText } from "./text.js";
import { Cursor } from "./Cursor.js";

/** One row in a vertical list (used for switching monsters). */
export interface ListItem {
  label: string;
  enabled: boolean;
}

const MAX_ROWS = 3;
const TITLE_Y = STRIP.y + 5;
const FIRST_ROW_Y = STRIP.y + 17;
const ROW_H = 11;
const TEXT_X = 16;

/**
 * A full-width vertical list occupying the bottom strip — used for the "switch
 * to..." / forced-replacement submenu. Pure view; state lives in `BattleMenu`.
 */
export class ListMenu {
  private readonly box: PixelBox;
  private readonly title: Phaser.GameObjects.Text;
  private readonly rows: Phaser.GameObjects.Text[] = [];
  private readonly cursor: Cursor;

  constructor(scene: Phaser.Scene) {
    this.box = new PixelBox(scene, 0, STRIP.y, CANVAS_W, STRIP.h, DEPTH.menu);
    this.title = pixelText(scene, 8, TITLE_Y, "", { size: 6, color: HEX.player }).setDepth(
      DEPTH.menu + 1,
    );
    for (let i = 0; i < MAX_ROWS; i++) {
      this.rows.push(
        pixelText(scene, TEXT_X, FIRST_ROW_Y + i * ROW_H, "", { size: 6 }).setDepth(DEPTH.menu + 1),
      );
    }
    this.cursor = new Cursor(scene, DEPTH.cursor);
    this.setVisible(false);
  }

  render(title: string, items: ListItem[], selected: number): void {
    this.setVisible(true);
    this.title.setText(title);
    this.rows.forEach((row, i) => {
      const item = items[i];
      if (!item) {
        row.setVisible(false);
        return;
      }
      row.setVisible(true).setText(item.label).setColor(item.enabled ? HEX.boxOutline : HEX.disabled);
    });
    const visibleSel = Math.min(selected, MAX_ROWS - 1);
    this.cursor.moveTo(TEXT_X - 9, FIRST_ROW_Y + visibleSel * ROW_H - 1);
  }

  setVisible(visible: boolean): void {
    this.box.setVisible(visible);
    this.title.setVisible(visible);
    for (const row of this.rows) row.setVisible(visible);
    if (!visible) this.cursor.hide();
  }

  destroy(): void {
    this.box.destroy();
    this.title.destroy();
    for (const row of this.rows) row.destroy();
    this.cursor.destroy();
  }
}
