import Phaser from "phaser";
import { DEPTH, STRIP } from "./layout.js";
import { HEX, NUM, TYPE_NUM } from "./palette.js";
import { PixelBox } from "./PixelBox.js";
import { pixelText } from "./text.js";
import { Cursor } from "./Cursor.js";

/** One move row in the selection list. */
export interface MoveView {
  name: string;
  type: string;
  pp: number;
  maxPp: number;
  enabled: boolean;
}

const LIST_X = 0;
const SIDE_X = STRIP.moveListWidth;
const COLS = [LIST_X + 12, LIST_X + 86];
const ROWS = [STRIP.y + 10, STRIP.y + 28];

/**
 * The Fight submenu: up to four moves in a 2x2 list (left, 164px) plus a side
 * panel (right, 76px) showing the selected move's type badge and PP. Pure view.
 */
export class MoveSelectMenu {
  private readonly listBox: PixelBox;
  private readonly sideBox: PixelBox;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly badge: Phaser.GameObjects.Rectangle;
  private readonly badgeText: Phaser.GameObjects.Text;
  private readonly ppText: Phaser.GameObjects.Text;
  private readonly cursor: Cursor;

  constructor(scene: Phaser.Scene) {
    this.listBox = new PixelBox(scene, LIST_X, STRIP.y, STRIP.moveListWidth, STRIP.h, DEPTH.menu);
    this.sideBox = new PixelBox(scene, SIDE_X, STRIP.y, STRIP.moveSideWidth, STRIP.h, DEPTH.menu);

    for (let i = 0; i < 4; i++) {
      this.labels.push(
        pixelText(scene, COLS[i % 2], ROWS[Math.floor(i / 2)], "", { size: 6 }).setDepth(
          DEPTH.menu + 1,
        ),
      );
    }

    this.badge = scene.add
      .rectangle(SIDE_X + 8, STRIP.y + 10, 60, 11, NUM.typeNormal)
      .setOrigin(0, 0)
      .setStrokeStyle(1, NUM.boxOutline)
      .setDepth(DEPTH.menu + 1);
    this.badgeText = pixelText(scene, SIDE_X + 38, STRIP.y + 13, "", {
      size: 5,
      color: HEX.white,
      originX: 0.5,
    }).setDepth(DEPTH.menu + 2);
    this.ppText = pixelText(scene, SIDE_X + 8, STRIP.y + 28, "", { size: 6 }).setDepth(
      DEPTH.menu + 1,
    );

    this.cursor = new Cursor(scene, DEPTH.cursor);
    this.setVisible(false);
  }

  /** Render the move list and the side panel for the selected move. */
  render(moves: MoveView[], selected: number): void {
    this.setVisible(true);
    this.labels.forEach((label, i) => {
      const move = moves[i];
      if (!move) {
        label.setVisible(false);
        return;
      }
      label.setVisible(true).setText(move.name).setColor(move.enabled ? HEX.boxOutline : HEX.disabled);
    });

    const sel = moves[selected];
    if (sel) {
      this.badge.setFillStyle(TYPE_NUM[sel.type] ?? NUM.typeNormal);
      this.badgeText.setText(sel.type.toUpperCase());
      this.ppText.setText(`PP ${sel.pp}/${sel.maxPp}`);
      const col = selected % 2;
      const row = Math.floor(selected / 2);
      this.cursor.moveTo(COLS[col] - 8, ROWS[row] - 1);
    }
  }

  setVisible(visible: boolean): void {
    this.listBox.setVisible(visible);
    this.sideBox.setVisible(visible);
    this.badge.setVisible(visible);
    this.badgeText.setVisible(visible);
    this.ppText.setVisible(visible);
    for (const label of this.labels) label.setVisible(visible);
    if (!visible) this.cursor.hide();
  }

  destroy(): void {
    this.listBox.destroy();
    this.sideBox.destroy();
    this.badge.destroy();
    this.badgeText.destroy();
    this.ppText.destroy();
    for (const label of this.labels) label.destroy();
    this.cursor.destroy();
  }
}
