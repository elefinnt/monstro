import Phaser from "phaser";
import { STEP_DURATION_MS, type Direction } from "@monstro/shared";
import { Avatar } from "./Avatar.js";

/**
 * A player controlled by another client. Its tile position is authoritative
 * (driven by the synced schema); we interpolate the sprite toward each new tile
 * so movement looks smooth rather than teleporting.
 */
export class RemotePlayer {
  private readonly avatar: Avatar;

  constructor(
    scene: Phaser.Scene,
    spawn: { tx: number; ty: number; tint: number; label: string; facing: Direction },
  ) {
    this.avatar = new Avatar(scene, spawn);
  }

  /** Apply an authoritative position update with interpolation. */
  applyPosition(tx: number, ty: number): void {
    this.avatar.tweenToTile(tx, ty, STEP_DURATION_MS);
  }

  setFacing(dir: Direction): void {
    this.avatar.setFacing(dir);
  }

  destroy(): void {
    this.avatar.destroy();
  }
}
