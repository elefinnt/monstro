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
/** Keep the bubble at least this many world px inside the camera edges. */
const SCREEN_MARGIN = 2;
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
  /** Cached bubble size (world px) so re-anchoring can re-run the layout. */
  private bubbleW = 0;
  private bubbleH = 0;

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
    this.text.setPosition(0, 0);
    // Display size in world px (the text object is scaled down by 1 / TEXT_SS).
    this.bubbleW = this.text.width / TEXT_SS + PAD_X * 2;
    this.bubbleH = this.text.height / TEXT_SS + PAD_Y * 2;

    this.layout(opts.anchorX, opts.anchorY);
    this.container.setVisible(true);

    if (opts.durationMs && opts.durationMs > 0) {
      this.hideTimer = this.scene.time.delayedCall(opts.durationMs, () => this.hide());
    }
  }

  /** Re-anchor a visible bubble (e.g. follow a player walking around). */
  moveTo(anchorX: number, anchorY: number): void {
    this.layout(anchorX, anchorY);
  }

  /**
   * Position the bubble around the anchor while keeping it inside the camera
   * view: it sits above the anchor by default, flips below when there isn't
   * room above, and slides horizontally to stay on-screen. The tail is drawn
   * to keep pointing at the anchor regardless of where the body ends up.
   */
  private layout(anchorX: number, anchorY: number): void {
    const w = this.bubbleW;
    const h = this.bubbleH;
    const halfOffset = TAIL_GAP + TAIL_HEIGHT + h / 2;
    const view = this.scene.cameras.main.worldView;

    // Prefer above the anchor; flip below if the top would clip off-screen.
    const tailUp = anchorY - halfOffset - h / 2 < view.top + SCREEN_MARGIN;
    let centreY = anchorY + (tailUp ? halfOffset : -halfOffset);
    // Keep the body within the view vertically when the bubble fits.
    if (h + 2 * SCREEN_MARGIN <= view.height) {
      const minY = view.top + SCREEN_MARGIN + h / 2;
      const maxY = view.bottom - SCREEN_MARGIN - h / 2;
      centreY = Phaser.Math.Clamp(centreY, minY, maxY);
    }

    // Centre on the anchor horizontally, then clamp within the view.
    let centreX = anchorX;
    if (w + 2 * SCREEN_MARGIN <= view.width) {
      const minX = view.left + SCREEN_MARGIN + w / 2;
      const maxX = view.right - SCREEN_MARGIN - w / 2;
      centreX = Phaser.Math.Clamp(centreX, minX, maxX);
    }

    // Tail base slides toward the anchor but stays under the rounded body.
    const tailLimit = Math.max(0, w / 2 - TAIL_HALF_WIDTH - 4);
    const tailX = Phaser.Math.Clamp(anchorX - centreX, -tailLimit, tailLimit);

    this.drawBubble(w, h, tailUp, tailX);
    this.container.setPosition(centreX, centreY);
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

  private drawBubble(w: number, h: number, tailUp: boolean, tailX: number): void {
    const left = -w / 2;
    const top = -h / 2;
    const radius = Math.min(4, h / 2);

    this.bg.clear();
    this.bg.fillStyle(FILL, 1);
    this.bg.lineStyle(1, STROKE, 1);
    this.bg.fillRoundedRect(left, top, w, h, radius);
    this.bg.strokeRoundedRect(left, top, w, h, radius);

    // Tail points at the anchor: down off the bottom edge by default, or up off
    // the top edge when the bubble had to flip below the anchor. The base sits
    // just inside the body so it blends in, and the tip aligns with `tailX`.
    const baseY = tailUp ? top + 0.5 : top + h - 0.5;
    const tipY = tailUp ? top - TAIL_HEIGHT : top + h + TAIL_HEIGHT;
    const baseLeft = tailX - TAIL_HALF_WIDTH;
    const baseRight = tailX + TAIL_HALF_WIDTH;

    this.bg.fillStyle(FILL, 1);
    this.bg.beginPath();
    this.bg.moveTo(baseLeft, baseY);
    this.bg.lineTo(baseRight, baseY);
    this.bg.lineTo(tailX, tipY);
    this.bg.closePath();
    this.bg.fillPath();
    // Re-stroke the tail edges (skip the base so it blends into the body).
    this.bg.lineStyle(1, STROKE, 1);
    this.bg.beginPath();
    this.bg.moveTo(baseLeft, baseY);
    this.bg.lineTo(tailX, tipY);
    this.bg.lineTo(baseRight, baseY);
    this.bg.strokePath();
  }
}
