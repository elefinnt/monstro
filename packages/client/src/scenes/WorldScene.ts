import Phaser from "phaser";
import { getStateCallbacks, type Room } from "colyseus.js";
import {
  CAMERA_FOLLOW_LERP,
  CAMERA_ZOOM,
  ServerMessage,
  type Direction,
  type MoveRejectedPayload,
} from "@monstro/shared";
import { buildWorld, type BuiltWorld } from "../world/worldMap.js";
import { LocalPlayer } from "../entities/LocalPlayer.js";
import { RemotePlayer } from "../entities/RemotePlayer.js";
import type { PlayerView, WorldView } from "../net/state.js";

const LOCAL_TINT = 0x4f9dff;
const REMOTE_TINT = 0xff6b6b;

/** The overworld: renders the map, the local player, and remote players. */
export class WorldScene extends Phaser.Scene {
  private room!: Room<WorldView>;
  private world!: BuiltWorld;
  private local?: LocalPlayer;
  private readonly remotes = new Map<string, RemotePlayer>();
  private callbacks!: ReturnType<typeof getStateCallbacks<WorldView>>;

  constructor() {
    super("world");
  }

  init(data: { room: Room<WorldView> }): void {
    this.room = data.room;
  }

  create(): void {
    this.world = buildWorld(this);

    this.cameras.main
      .setZoom(CAMERA_ZOOM)
      .setBounds(0, 0, this.world.widthPx, this.world.heightPx)
      .setRoundPixels(true)
      .setBackgroundColor("#0b1020");

    this.callbacks = getStateCallbacks(this.room);
    this.registerStateHandlers();
    this.registerMessageHandlers();
  }

  update(): void {
    this.local?.update();
  }

  private registerStateHandlers(): void {
    const $ = this.callbacks;
    $(this.room.state).players.onAdd((player: PlayerView, key: string) => {
      if (key === this.room.sessionId) this.spawnLocal(player);
      else this.spawnRemote(key, player);
    });
    $(this.room.state).players.onRemove((_player: PlayerView, key: string) => {
      this.remotes.get(key)?.destroy();
      this.remotes.delete(key);
    });
  }

  private registerMessageHandlers(): void {
    this.room.onMessage<MoveRejectedPayload>(ServerMessage.MoveRejected, (payload) => {
      this.local?.reconcile(payload.tx, payload.ty, payload.facing);
    });
  }

  private spawnLocal(player: PlayerView): void {
    if (this.local) return;
    this.local = new LocalPlayer(
      this,
      this.room,
      { grid: this.world.collision, width: this.world.width, height: this.world.height },
      {
        tx: player.tx,
        ty: player.ty,
        tint: LOCAL_TINT,
        label: `${player.username} (you)`,
      },
    );
    this.cameras.main.startFollow(
      this.local.avatar.container,
      true,
      CAMERA_FOLLOW_LERP,
      CAMERA_FOLLOW_LERP,
    );
  }

  private spawnRemote(key: string, player: PlayerView): void {
    const remote = new RemotePlayer(this, {
      tx: player.tx,
      ty: player.ty,
      tint: REMOTE_TINT,
      label: player.username,
      facing: player.facing,
    });
    this.remotes.set(key, remote);

    const $ = this.callbacks;
    $(player).listen("tx", () => remote.applyPosition(player.tx, player.ty));
    $(player).listen("ty", () => remote.applyPosition(player.tx, player.ty));
    $(player).listen("facing", (value: Direction) => remote.setFacing(value));
  }
}
