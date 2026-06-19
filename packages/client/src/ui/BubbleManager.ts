import Phaser from "phaser";
import { TextBubble } from "./TextBubble.js";

/** A world-space point a bubble can anchor its tail to. */
export interface Anchor {
  x: number;
  y: number;
}

/** Resolves the current world anchor for a player's session id, if visible. */
export type AnchorResolver = (sessionId: string) => Anchor | undefined;

/**
 * Owns every speech bubble in the scene and keeps the two kinds distinct:
 *
 * - PRIVATE: a single local-only bubble shown at a fixed world anchor (e.g.
 *   examining a starter table). Never leaves this client.
 * - PUBLIC: one bubble per player, anchored above that player's avatar and
 *   driven by server broadcasts, so everyone on the map sees the same thing.
 *   These follow their avatar as it walks (re-anchored each frame in `update`).
 */
export class BubbleManager {
  private readonly privateBubble: TextBubble;
  private readonly publicBubbles = new Map<string, TextBubble>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly resolveAnchor: AnchorResolver,
  ) {
    this.privateBubble = new TextBubble(scene);
  }

  get isPrivateVisible(): boolean {
    return this.privateBubble.isVisible;
  }

  /** Show the local-only bubble at a fixed world anchor. */
  showPrivate(text: string, anchorX: number, anchorY: number, durationMs: number): void {
    this.privateBubble.show({ text, anchorX, anchorY, durationMs });
  }

  hidePrivate(): void {
    this.privateBubble.hide();
  }

  /**
   * Show/replace the public bubble above a player. Ignored if that player can't
   * currently be anchored (e.g. they're on another map), since there's nothing
   * to render the bubble above.
   */
  showPublic(sessionId: string, text: string, durationMs: number): void {
    const anchor = this.resolveAnchor(sessionId);
    if (!anchor) return;

    let bubble = this.publicBubbles.get(sessionId);
    if (!bubble) {
      bubble = new TextBubble(this.scene);
      this.publicBubbles.set(sessionId, bubble);
    }
    bubble.show({ text, anchorX: anchor.x, anchorY: anchor.y, durationMs });
  }

  /** Re-anchor visible public bubbles so they follow their moving avatars. */
  update(): void {
    for (const [sessionId, bubble] of this.publicBubbles) {
      if (!bubble.isVisible) continue;
      const anchor = this.resolveAnchor(sessionId);
      if (anchor) bubble.moveTo(anchor.x, anchor.y);
      else bubble.hide();
    }
  }

  /** Destroy a player's public bubble (they left or changed map). */
  removePlayer(sessionId: string): void {
    const bubble = this.publicBubbles.get(sessionId);
    if (!bubble) return;
    bubble.destroy();
    this.publicBubbles.delete(sessionId);
  }

  /** Hide every bubble (e.g. on a map change). */
  hideAll(): void {
    this.privateBubble.hide();
    for (const bubble of this.publicBubbles.values()) bubble.hide();
  }
}
