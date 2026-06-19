import Phaser from "phaser";
import { CANVAS_H, CANVAS_W, FIELD, type Rect } from "./layout.js";
import { NUM } from "./palette.js";

/** Depth band for the static background (well below HUD/menus/sprites). */
const FIELD_DEPTH = 0;

/**
 * The static battle backdrop: two flat sky bands (no gradient) and the two
 * ground platforms the combatants stand on. Drawn in canvas space.
 */
export class Battlefield {
  private readonly parts: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    // Sky: a full-canvas top band with the lower band painted over it.
    this.add(scene.add.rectangle(0, 0, CANVAS_W, CANVAS_H, NUM.skyTop).setOrigin(0, 0));
    this.add(
      scene.add
        .rectangle(0, FIELD.skySplitY, CANVAS_W, CANVAS_H - FIELD.skySplitY, NUM.skyBottom)
        .setOrigin(0, 0),
    );

    this.platform(scene, FIELD.opponentPlatform, NUM.groundOpponent, NUM.groundOpponentEdge);
    this.platform(scene, FIELD.playerPlatform, NUM.groundPlayer, NUM.groundPlayerEdge);

    for (const part of this.parts) (part as Phaser.GameObjects.Rectangle).setDepth(FIELD_DEPTH);
  }

  /** A flat platform slab with a 2px lighter top edge. */
  private platform(scene: Phaser.Scene, r: Rect, fill: number, edge: number): void {
    this.add(scene.add.rectangle(r.x, r.y, r.w, r.h, fill).setOrigin(0, 0));
    this.add(scene.add.rectangle(r.x, r.y, r.w, 2, edge).setOrigin(0, 0));
  }

  private add(obj: Phaser.GameObjects.GameObject): void {
    this.parts.push(obj);
  }

  destroy(): void {
    for (const part of this.parts) part.destroy();
    this.parts.length = 0;
  }
}
