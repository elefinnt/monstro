import Phaser from "phaser";
import type { Room } from "colyseus.js";
import {
  ClientMessage,
  DIRECTION_DELTAS,
  DIRECTIONS,
  STEP_DURATION_MS,
  isWalkable,
  type Direction,
  type MoveIntent,
  type FaceIntent,
} from "@monstro/shared";
import { Avatar } from "./Avatar.js";
import type { WorldView } from "../net/state.js";

interface CollisionInfo {
  grid: boolean[][];
  width: number;
  height: number;
}

/**
 * The locally-controlled player. Uses client-side prediction: it moves
 * immediately when the local collision grid says a step is valid and sends the
 * intent to the authoritative server. The scene reconciles on rejection.
 */
export class LocalPlayer {
  readonly avatar: Avatar;
  private tx: number;
  private ty: number;
  private moving = false;
  private readonly keys: Record<Direction, Phaser.Input.Keyboard.Key[]>;
  /**
   * Last direction pressed (captured on keydown). Used as a fallback when no key
   * is held at the moment a step finishes, so quick taps and direction changes
   * made mid-step are honoured instead of being dropped.
   */
  private bufferedDir?: Direction;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly room: Room<WorldView>,
    private collision: CollisionInfo,
    spawn: { tx: number; ty: number; tint: number; label: string },
  ) {
    this.tx = spawn.tx;
    this.ty = spawn.ty;
    this.avatar = new Avatar(scene, {
      tx: spawn.tx,
      ty: spawn.ty,
      tint: spawn.tint,
      label: spawn.label,
    });

    const kb = scene.input.keyboard!;
    this.keys = {
      up: [kb.addKey("UP"), kb.addKey("W")],
      down: [kb.addKey("DOWN"), kb.addKey("S")],
      left: [kb.addKey("LEFT"), kb.addKey("A")],
      right: [kb.addKey("RIGHT"), kb.addKey("D")],
    };

    for (const dir of DIRECTIONS) {
      for (const key of this.keys[dir]) {
        key.on("down", () => {
          this.bufferedDir = dir;
        });
      }
    }
  }

  get tilePosition(): { tx: number; ty: number } {
    return { tx: this.tx, ty: this.ty };
  }

  /** The direction the player is currently facing. */
  get facing(): Direction {
    return this.avatar.facingDir;
  }

  /** Called every frame by the scene. */
  update(): void {
    if (this.moving) return;
    this.tryStartStep();
  }

  /** Server rejected a move; snap back to the authoritative tile. */
  reconcile(tx: number, ty: number, facing: Direction): void {
    this.tx = tx;
    this.ty = ty;
    this.moving = false;
    this.bufferedDir = undefined;
    this.avatar.setFacing(facing);
    this.avatar.snapToTile(tx, ty);
  }

  /** Swap the collision grid (used when the player warps to another map). */
  setCollision(collision: CollisionInfo): void {
    this.collision = collision;
  }

  /** Teleport to a tile with no animation (e.g. after a room transition). */
  teleport(tx: number, ty: number, facing: Direction): void {
    this.reconcile(tx, ty, facing);
  }

  /**
   * Begin the next step if a direction is wanted. A currently-held key takes
   * priority (continuous movement); otherwise the most recent buffered tap is
   * consumed so input made during the previous step isn't lost.
   */
  private tryStartStep(): void {
    const dir = this.heldDirection() ?? this.bufferedDir;
    this.bufferedDir = undefined;
    if (!dir) return;
    this.attemptStep(dir);
  }

  private heldDirection(): Direction | undefined {
    const order: Direction[] = ["up", "down", "left", "right"];
    for (const dir of order) {
      if (this.keys[dir].some((k) => k.isDown)) return dir;
    }
    return undefined;
  }

  private attemptStep(dir: Direction): void {
    this.avatar.setFacing(dir);

    const { dx, dy } = DIRECTION_DELTAS[dir];
    const nx = this.tx + dx;
    const ny = this.ty + dy;

    if (!isWalkable(this.collision.grid, this.collision.width, this.collision.height, nx, ny)) {
      this.room.send(ClientMessage.Face, { dir } satisfies FaceIntent);
      return;
    }

    this.moving = true;
    this.tx = nx;
    this.ty = ny;
    this.room.send(ClientMessage.Move, { dir } satisfies MoveIntent);
    this.avatar.tweenToTile(nx, ny, STEP_DURATION_MS, () => {
      this.moving = false;
      // Chain straight into the next step (no idle frame at tile boundaries).
      this.tryStartStep();
    });
  }
}
