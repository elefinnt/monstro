import Phaser from "phaser";
import { CAMERA_ZOOM } from "@monstro/shared";

/** Logical (world-space) font size for bubble text. Matches the avatar label. */
const FONT_PX = 6;

/**
 * Supersample factor: the camera zooms the scene with nearest-neighbour
 * filtering, so we render glyphs larger and scale the text object back down to
 * keep them crisp at the current zoom + device pixel ratio (see Avatar label).
 */
const TEXT_SS = Math.max(
  2,
  Math.ceil(CAMERA_ZOOM * (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)),
);

/** Inner padding (world px) between the text and the bubble edge. */
const PAD_X = 4;
const PAD_Y = 3;
/** Gap (world px) between the bubble's tail tip and the anchor point. */
const TAIL_GAP = 3;
const TAIL_HALF_WIDTH = 3;
const TAIL_HEIGHT = 3;
/** Word-wrap width (world px) before the text breaks onto a new line. */
const MAX_TEXT_WIDTH = 90;
/** Drawn above avatars (depth 10) so bubbles are never occluded. */
const BUBBLE_DEPTH = 100;

const FILL = 0xfdfdf5;
const STROKE = 0x1b1b1b;
const TEXT_COLOUR = "#1b1b1b";

export interface TextBubbleOptions {
  /** The line(s) of text to display. */
  text: string;
  /** World-space point the bubble's tail points at (e.g. the target's top). */
  anchorX: number;
  anchorY: number;
  /** Auto-hide after this many ms. Omit/0 to keep it visible until hidden. */
  durationMs?: number;
}

/**
 * A reusable world-space speech bubble. A single instance can be re-shown at any
 * anchor with any text, so the same component renders table prompts, NPC lines,
 * player-to-player messages, etc. The bubble sits above the anchor with a small
 * tail pointing down at it.
 */
export class TextBubble {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private hideTimer?: Phaser.Time.TimerEvent;
  /** Vertical offset from anchor to bubble centre, kept so it can re-follow. */
  private anchorOffsetY = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.bg = scene.add.graphics();
    this.text = scene.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: `${FONT_PX * TEXT_SS}px`,
        color: TEXT_COLOUR,
        align: "center",
        wordWrap: { width: MAX_TEXT_WIDTH * TEXT_SS },
      })
      .setOrigin(0.5, 0.5)
      .setScale(1 / TEXT_SS);
    this.text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

    this.container = scene.add
      .container(0, 0, [this.bg, this.text])
      .setDepth(BUBBLE_DEPTH)
      .setVisible(false);
  }

  get isVisible(): boolean {
    return this.container.visible;
  }

  /** Show the bubble with new content at the given anchor. */
  show(opts: TextBubbleOptions): void {
    this.hideTimer?.remove();
    this.hideTimer = undefined;

    this.text.setText(opts.text);
    // Display size in world px (the text object is scaled down by 1 / TEXT_SS).
    const textW = this.text.width / TEXT_SS;
    const textH = this.text.height / TEXT_SS;
    const w = textW + PAD_X * 2;
    const h = textH + PAD_Y * 2;

    this.drawBubble(w, h);

    // Container origin is the bubble centre; lift it so the tail tip lands on
    // the anchor with a small gap, then clamp text to that centre.
    this.text.setPosition(0, 0);
    this.anchorOffsetY = TAIL_GAP + TAIL_HEIGHT + h / 2;
    this.container.setPosition(opts.anchorX, opts.anchorY - this.anchorOffsetY);
    this.container.setVisible(true);

    if (opts.durationMs && opts.durationMs > 0) {
      this.hideTimer = this.scene.time.delayedCall(opts.durationMs, () => this.hide());
    }
  }

  /** Re-anchor a visible bubble (e.g. follow a player walking around). */
  moveTo(anchorX: number, anchorY: number): void {
    this.container.setPosition(anchorX, anchorY - this.anchorOffsetY);
  }

  hide(): void {
    this.hideTimer?.remove();
    this.hideTimer = undefined;
    this.container.setVisible(false);
  }

  destroy(): void {
    this.hideTimer?.remove();
    this.container.destroy();
  }

  private drawBubble(w: number, h: number): void {
    const left = -w / 2;
    const top = -h / 2;
    const radius = Math.min(4, h / 2);

    this.bg.clear();
    this.bg.fillStyle(FILL, 1);
    this.bg.lineStyle(1, STROKE, 1);
    this.bg.fillRoundedRect(left, top, w, h, radius);
    this.bg.strokeRoundedRect(left, top, w, h, radius);

    // Downward tail pointing at the anchor below the bubble.
    const tailTop = top + h;
    this.bg.fillStyle(FILL, 1);
    this.bg.beginPath();
    this.bg.moveTo(-TAIL_HALF_WIDTH, tailTop - 0.5);
    this.bg.lineTo(TAIL_HALF_WIDTH, tailTop - 0.5);
    this.bg.lineTo(0, tailTop + TAIL_HEIGHT);
    this.bg.closePath();
    this.bg.fillPath();
    // Re-stroke the tail edges (skip the top so it blends into the body).
    this.bg.lineStyle(1, STROKE, 1);
    this.bg.beginPath();
    this.bg.moveTo(-TAIL_HALF_WIDTH, tailTop - 0.5);
    this.bg.lineTo(0, tailTop + TAIL_HEIGHT);
    this.bg.lineTo(TAIL_HALF_WIDTH, tailTop - 0.5);
    this.bg.strokePath();
  }
}
