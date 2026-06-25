import Phaser from "phaser";
import { getStateCallbacks, type Room } from "colyseus.js";
import {
  CAMERA_FOLLOW_LERP,
  CAMERA_ZOOM,
  ClientMessage,
  DIRECTION_DELTAS,
  ServerMessage,
  STARTER_MAP_ID,
  TILE_SIZE,
  starterAt,
  starterById,
  type Direction,
  type SayIntent,
  type ChooseStarterIntent,
  type ChallengeIntent,
  type MoveRejectedPayload,
  type BubblePayload,
  type NoticePayload,
  type BattleStartPayload,
} from "@monstro/shared";
import { resolveInitialMapId } from "../net/worldClient.js";
import { buildWorld, type BuiltWorld } from "../world/worldMap.js";
import { findInteractable } from "../world/interactables.js";
import { tileToPixel } from "../world/grid.js";
import { LocalPlayer } from "../entities/LocalPlayer.js";
import { RemotePlayer } from "../entities/RemotePlayer.js";
import { BubbleManager, type Anchor } from "../ui/BubbleManager.js";
import type { PlayerView, WorldView } from "../net/state.js";

const LOCAL_TINT = 0x4f9dff;
const REMOTE_TINT = 0xff6b6b;
/** How long an interaction bubble stays up before auto-dismissing (ms). */
const BUBBLE_DURATION_MS = 2500;

/**
 * The overworld: renders the current map, the local player, and the remote
 * players standing on the same map. Players can warp between connected maps
 * (e.g. the route and the indoor starter room); when the local player's `mapId`
 * changes we rebuild the tilemap and re-filter which remotes are visible.
 */
export class WorldScene extends Phaser.Scene {
  private room!: Room<WorldView>;
  private world!: BuiltWorld;
  private currentMapId!: string;
  private local?: LocalPlayer;
  private readonly remotes = new Map<string, RemotePlayer>();
  private callbacks!: ReturnType<typeof getStateCallbacks<WorldView>>;
  private bubbles!: BubbleManager;
  /** Tile the local player was on when the current PRIVATE bubble was shown. */
  private privateBubbleTile?: { tx: number; ty: number };
  /** Starter awaiting a confirm press (set after the first examine of a table). */
  private pendingStarterId?: string;

  constructor() {
    super("world");
  }

  init(data: { room: Room<WorldView> }): void {
    this.room = data.room;
  }

  create(): void {
    this.callbacks = getStateCallbacks(this.room);

    this.cameras.main
      .setZoom(CAMERA_ZOOM)
      .setRoundPixels(true)
      .setBackgroundColor("#0b1020");

    this.bubbles = new BubbleManager(this, (id) => this.playerAnchor(id));

    this.loadMap(resolveInitialMapId(this.room));
    this.registerStateHandlers();
    this.registerMessageHandlers();
    this.registerInteraction();
  }

  update(): void {
    this.local?.update();
    this.bubbles.update();
    this.dismissPrivateBubbleOnMove();
  }

  /**
   * Build (or rebuild) the tilemap for `mapId`, then resync entities: reposition
   * the local player and show only the remotes standing on this map.
   */
  private loadMap(mapId: string): void {
    this.currentMapId = mapId;
    this.bubbles?.hideAll();

    // Tear down the previous tilemap layers, if any.
    if (this.world) {
      for (const layer of this.world.layers) layer.destroy();
      this.world.tilemap.destroy();
    }

    this.world = buildWorld(this, mapId);
    this.cameras.main.setBounds(0, 0, this.world.widthPx, this.world.heightPx);

    const collision = {
      grid: this.world.collision,
      width: this.world.width,
      height: this.world.height,
    };

    // Reposition the local player onto the new map (the avatar persists so the
    // camera keeps following it without re-binding).
    const me = this.room.state.players.get(this.room.sessionId);
    if (me && this.local) {
      this.local.setCollision(collision);
      this.local.teleport(me.tx, me.ty, me.facing);
    }

    // Rebuild the set of visible remotes for the current map.
    for (const remote of this.remotes.values()) remote.destroy();
    this.remotes.clear();
    this.room.state.players.forEach((player, key) => {
      if (key !== this.room.sessionId && player.mapId === this.currentMapId) {
        this.addRemote(key, player);
      }
    });
  }

  private registerStateHandlers(): void {
    const $ = this.callbacks;
    $(this.room.state).players.onAdd((player: PlayerView, key: string) => {
      if (key === this.room.sessionId) {
        if (!this.local) this.spawnLocal(player);
        // Warping changes the local player's map: rebuild the world when it does.
        $(player).listen(
          "mapId",
          (value: string) => {
            if (value !== this.currentMapId) this.loadMap(value);
          },
          false,
        );
      } else {
        this.bindRemote(key, player);
      }
    });
    $(this.room.state).players.onRemove((_player: PlayerView, key: string) => {
      this.remotes.get(key)?.destroy();
      this.remotes.delete(key);
      this.bubbles.removePlayer(key);
    });
  }

  private registerMessageHandlers(): void {
    this.room.onMessage<MoveRejectedPayload>(ServerMessage.MoveRejected, (payload) => {
      this.local?.reconcile(payload.tx, payload.ty, payload.facing);
    });
    // A public bubble: render it above the named player's avatar (if visible).
    this.room.onMessage<BubblePayload>(ServerMessage.Bubble, (payload) => {
      this.bubbles.showPublic(payload.sessionId, payload.text, BUBBLE_DURATION_MS);
    });
    // A private, server-originated notice shown above the local player.
    this.room.onMessage<NoticePayload>(ServerMessage.Notice, (payload) => {
      this.showLocalNotice(payload.text);
    });
    // The server is starting a battle for us: launch the battle scene and put
    // the overworld to sleep (the avatar is frozen server-side meanwhile).
    this.room.onMessage<BattleStartPayload>(ServerMessage.BattleStart, (payload) => {
      this.enterBattle(payload);
    });
  }

  /** Hand off to the BattleScene and sleep the overworld until it returns. */
  private enterBattle(payload: BattleStartPayload): void {
    if (this.scene.isActive("battle")) return;
    this.bubbles.hideAll();
    this.scene.launch("battle", {
      reservation: payload.reservation,
      kind: payload.kind,
      worldRoom: this.room,
    });
    this.scene.sleep();
  }

  /** Bind the action keys (A-button equivalents) that trigger interactions. */
  private registerInteraction(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    for (const code of ["SPACE", "ENTER", "Z"]) {
      kb.addKey(code).on("down", () => this.interact());
    }
    // Challenge the trainer you're facing to a PvP battle.
    kb.addKey("C").on("down", () => this.challengeFacedPlayer());
  }

  /** Send a PvP challenge to the player on the faced tile (if they're a trainer). */
  private challengeFacedPlayer(): void {
    if (!this.local) return;
    const me = this.room.state.players.get(this.room.sessionId);
    if (!me || me.starterId === "") return;

    const { tx, ty } = this.local.tilePosition;
    const { dx, dy } = DIRECTION_DELTAS[this.local.facing];
    const target = this.facingPlayer(tx + dx, ty + dy);
    if (!target || target.starterId === "") return;

    this.room.send(
      ClientMessage.Challenge,
      { targetSessionId: target.id } satisfies ChallengeIntent,
    );
  }

  /**
   * Examine whatever the local player is facing:
   * - another player -> a PUBLIC bubble (sent to the server, seen by everyone);
   * - a static interactable (e.g. a starter table) -> a PRIVATE bubble (local).
   */
  private interact(): void {
    if (!this.local) return;
    const { tx, ty } = this.local.tilePosition;
    const { dx, dy } = DIRECTION_DELTAS[this.local.facing];
    const fx = tx + dx;
    const fy = ty + dy;

    const player = this.facingPlayer(fx, fy);
    if (player) {
      this.room.send(ClientMessage.Say, { text: `Hi, ${player.username}!` } satisfies SayIntent);
      return;
    }

    if (this.currentMapId === STARTER_MAP_ID) {
      const starter = starterAt(fx, fy);
      if (starter) {
        this.examineStarter(starter.id, starter.name, fx, fy);
        return;
      }
    }

    const target = findInteractable(this.currentMapId, fx, fy);
    if (target) this.showPrivateBubble(target.label, fx, fy);
  }

  /**
   * Two-step starter pick: the first examine of a table prompts for confirmation;
   * examining the SAME table again sends the choice to the server (which has the
   * final say). Re-examining once a starter is already owned just reminds the
   * player who their partner is.
   */
  private examineStarter(starterId: string, name: string, fx: number, fy: number): void {
    const me = this.room.state.players.get(this.room.sessionId);
    if (me && me.starterId !== "") {
      const mine = starterById(me.starterId);
      this.showPrivateBubble(`${mine?.name ?? "Your partner"} is already with you.`, fx, fy);
      return;
    }

    if (this.pendingStarterId === starterId) {
      this.room.send(
        ClientMessage.ChooseStarter,
        { starterId } satisfies ChooseStarterIntent,
      );
      this.pendingStarterId = undefined;
      this.bubbles.hidePrivate();
      return;
    }

    this.pendingStarterId = starterId;
    this.showPrivateBubble(`Choose ${name}? Examine again to confirm.`, fx, fy);
  }

  /** The other player (if any) standing on the faced tile of this map. */
  private facingPlayer(fx: number, fy: number): PlayerView | undefined {
    let found: PlayerView | undefined;
    this.room.state.players.forEach((player, key) => {
      if (key === this.room.sessionId) return;
      if (player.mapId === this.currentMapId && player.tx === fx && player.ty === fy) {
        found = player;
      }
    });
    return found;
  }

  /** Pop a local-only bubble above the tile (fx, fy). */
  private showPrivateBubble(text: string, fx: number, fy: number): void {
    this.bubbles.showPrivate(
      text,
      tileToPixel(fx),
      tileToPixel(fy) - TILE_SIZE / 2,
      BUBBLE_DURATION_MS,
    );
    this.privateBubbleTile = this.local?.tilePosition;
  }

  /** Show a server-originated notice as a private bubble above the local player. */
  private showLocalNotice(text: string): void {
    if (!this.local) return;
    const { tx, ty } = this.local.tilePosition;
    this.showPrivateBubble(text, tx, ty);
  }

  /** World anchor (top of the tile) for a player's avatar, if it's visible. */
  private playerAnchor(sessionId: string): Anchor | undefined {
    const avatar =
      sessionId === this.room.sessionId ? this.local?.avatar : this.remotes.get(sessionId);
    if (!avatar) return undefined;
    return { x: avatar.x, y: avatar.y - TILE_SIZE / 2 };
  }

  /**
   * Dismiss the private bubble as soon as the local player leaves the tile it was
   * shown on, and cancel any pending starter confirmation (so walking away aborts
   * the pick even after the prompt bubble has auto-hidden).
   */
  private dismissPrivateBubbleOnMove(): void {
    if (!this.privateBubbleTile || !this.local) return;
    const { tx, ty } = this.local.tilePosition;
    if (tx === this.privateBubbleTile.tx && ty === this.privateBubbleTile.ty) return;
    if (this.bubbles.isPrivateVisible) this.bubbles.hidePrivate();
    this.privateBubbleTile = undefined;
    this.pendingStarterId = undefined;
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

  /** Attach lifetime listeners for a remote player (called once per join). */
  private bindRemote(key: string, player: PlayerView): void {
    const $ = this.callbacks;

    const refreshVisibility = (): void => {
      const onMap = player.mapId === this.currentMapId;
      const existing = this.remotes.get(key);
      if (onMap && !existing) {
        this.addRemote(key, player);
      } else if (!onMap && existing) {
        existing.destroy();
        this.remotes.delete(key);
      }
    };

    refreshVisibility();
    $(player).listen("mapId", refreshVisibility, false);
    $(player).listen("tx", () => this.remotes.get(key)?.applyPosition(player.tx, player.ty), false);
    $(player).listen("ty", () => this.remotes.get(key)?.applyPosition(player.tx, player.ty), false);
    $(player).listen("facing", (value: Direction) => this.remotes.get(key)?.setFacing(value), false);
  }

  private addRemote(key: string, player: PlayerView): void {
    if (this.remotes.has(key)) return;
    this.remotes.set(
      key,
      new RemotePlayer(this, {
        tx: player.tx,
        ty: player.ty,
        tint: REMOTE_TINT,
        label: player.username,
        facing: player.facing,
      }),
    );
  }
}
