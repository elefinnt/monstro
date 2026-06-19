import Phaser from "phaser";
import type { Direction } from "@monstro/shared";
import { CAMERA_ZOOM, DIRECTION_DELTAS } from "@monstro/shared";
import { PLAYER_TEXTURE } from "../render/textures.js";
import { tileToPixel } from "../world/grid.js";

/** Logical (world-space) font size for name labels. */
const LABEL_FONT_PX = 6;

/**
 * Supersample factor for label text. The camera zooms the whole scene with
 * nearest-neighbour filtering (pixelArt), which would make a 6px font blocky.
 * We render the glyphs at a higher resolution and scale the object back down so
 * the label stays crisp at the current zoom and device pixel ratio.
 */
const LABEL_SS = Math.max(
  2,
  Math.ceil(CAMERA_ZOOM * (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)),
);

export interface AvatarOptions {
  tx: number;
  ty: number;
  tint: number;
  label: string;
  facing?: Direction;
}

/**
 * Shared overworld avatar visual: a tinted placeholder body, a small facing
 * marker, and a name label. Used by both the local and remote players so the
 * rendering stays consistent.
 */
export class Avatar {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly marker: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private moveTween?: Phaser.Tweens.Tween;
  private facing: Direction;

  constructor(
    private readonly scene: Phaser.Scene,
    opts: AvatarOptions,
  ) {
    this.facing = opts.facing ?? "down";

    this.body = scene.add.image(0, 0, PLAYER_TEXTURE).setTint(opts.tint);
    this.marker = scene.add.rectangle(0, 0, 4, 4, 0x111111, 0.9);
    this.label = scene.add
      .text(0, -14, opts.label, {
        fontFamily: "monospace",
        fontSize: `${LABEL_FONT_PX * LABEL_SS}px`,
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.4)",
        padding: { x: 2 * LABEL_SS, y: 1 * LABEL_SS },
      })
      .setOrigin(0.5, 1)
      .setScale(1 / LABEL_SS);
    // Smooth filtering for the label only; tiles/sprites stay pixel-art.
    this.label.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

    this.container = scene.add.container(tileToPixel(opts.tx), tileToPixel(opts.ty), [
      this.body,
      this.marker,
      this.label,
    ]);
    this.container.setDepth(10);
    this.applyFacing();
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  /** The direction this avatar is currently facing. */
  get facingDir(): Direction {
    return this.facing;
  }

  setFacing(dir: Direction): void {
    this.facing = dir;
    this.applyFacing();
  }

  /** Snap immediately to a tile (no animation). */
  snapToTile(tx: number, ty: number): void {
    this.moveTween?.stop();
    this.container.setPosition(tileToPixel(tx), tileToPixel(ty));
  }

  /** Smoothly slide to a tile over the given duration (interpolation/step). */
  tweenToTile(tx: number, ty: number, durationMs: number, onComplete?: () => void): void {
    this.moveTween?.stop();
    this.moveTween = this.scene.tweens.add({
      targets: this.container,
      x: tileToPixel(tx),
      y: tileToPixel(ty),
      duration: durationMs,
      ease: "Linear",
      onComplete: () => onComplete?.(),
    });
  }

  destroy(): void {
    this.moveTween?.stop();
    this.container.destroy();
  }

  private applyFacing(): void {
    const { dx, dy } = DIRECTION_DELTAS[this.facing];
    this.marker.setPosition(dx * 4, dy * 4 - 1);
  }
}
