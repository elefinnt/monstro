import { Room, type Client } from "colyseus";
import {
  ClientMessage,
  ServerMessage,
  DEFAULT_MAP_ID,
  DIRECTION_DELTAS,
  MAX_BUBBLE_TEXT_LEN,
  STARTER_MAP_ID,
  STEP_DURATION_MS,
  allMapIds,
  findWarp,
  isStarterId,
  isWalkable,
  starterAt,
  type Direction,
  type MoveIntent,
  type FaceIntent,
  type SayIntent,
  type ChooseStarterIntent,
  type WelcomePayload,
  type MoveRejectedPayload,
  type BubblePayload,
  type NoticePayload,
  type WorldJoinOptions,
} from "@monstro/shared";
import { WorldState } from "../schema/WorldState.js";
import { PlayerState } from "../schema/PlayerState.js";
import { loadWorldMap, type LoadedMap } from "../world/mapLoader.js";

const VALID_DIRECTIONS = new Set<Direction>(["up", "down", "left", "right"]);

/**
 * The shared overworld. Authoritative for movement and presence across multiple
 * connected maps/rooms (e.g. the route and the indoor starter room). Each player
 * tracks their own `mapId`; stepping onto a warp tile moves them between maps.
 * Wild (PvE) battles will later run as in-world sessions here; PvP uses a
 * separate BattleRoom while avatars stay frozen in this room.
 */
export class WorldRoom extends Room<WorldState> {
  /** Loaded maps keyed by id, so warps between rooms are instant. */
  private readonly maps = new Map<string, LoadedMap>();

  onCreate(options: { mapId?: string }): void {
    const spawnMapId = options?.mapId ?? DEFAULT_MAP_ID;

    this.state = new WorldState();
    this.state.mapId = spawnMapId;

    // Preload every map reachable through the warp graph plus the spawn map.
    for (const id of new Set([spawnMapId, ...allMapIds()])) this.mapFor(id);

    this.onMessage<MoveIntent>(ClientMessage.Move, (client, msg) =>
      this.handleMove(client, msg),
    );
    this.onMessage<FaceIntent>(ClientMessage.Face, (client, msg) =>
      this.handleFace(client, msg),
    );
    this.onMessage<SayIntent>(ClientMessage.Say, (client, msg) =>
      this.handleSay(client, msg),
    );
    this.onMessage<ChooseStarterIntent>(ClientMessage.ChooseStarter, (client, msg) =>
      this.handleChooseStarter(client, msg),
    );
  }

  onJoin(client: Client, options?: WorldJoinOptions): void {
    const spawnMapId = this.state.mapId;
    const spawn = this.findSpawn(spawnMapId);
    const player = new PlayerState();
    player.id = client.sessionId;
    player.username = sanitiseUsername(options?.username) ?? `Trainer-${client.sessionId.slice(0, 4)}`;
    player.mapId = spawnMapId;
    player.tx = spawn.tx;
    player.ty = spawn.ty;
    player.facing = "down";
    this.state.players.set(client.sessionId, player);

    const welcome: WelcomePayload = {
      sessionId: client.sessionId,
      mapId: spawnMapId,
      tx: spawn.tx,
      ty: spawn.ty,
    };
    client.send(ServerMessage.Welcome, welcome);
    console.log(`[WorldRoom] ${player.username} joined on ${spawnMapId} at (${spawn.tx}, ${spawn.ty})`);
  }

  /** Lazily load (and cache) a map by id. */
  private mapFor(mapId: string): LoadedMap {
    let map = this.maps.get(mapId);
    if (!map) {
      map = loadWorldMap(mapId);
      this.maps.set(mapId, map);
    }
    return map;
  }

  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
    console.log(`[WorldRoom] ${client.sessionId} left`);
  }

  private handleMove(client: Client, msg: MoveIntent): void {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.battling) return;

    const dir = msg?.dir;
    if (!isDirection(dir)) return;

    player.facing = dir;

    const prevTx = player.tx;
    const prevTy = player.ty;
    const world = this.mapFor(player.mapId);
    const delta = DIRECTION_DELTAS[dir];
    const nx = player.tx + delta.dx;
    const ny = player.ty + delta.dy;

    if (!isWalkable(world.collision, world.width, world.height, nx, ny)) {
      const payload: MoveRejectedPayload = { tx: player.tx, ty: player.ty, facing: dir };
      client.send(ServerMessage.MoveRejected, payload);
      return;
    }

    player.tx = nx;
    player.ty = ny;

    // Stepping onto a warp tile teleports the player to the linked room.
    const warp = findWarp(player.mapId, nx, ny);
    if (warp) {
      // The lab is one-and-done: once a starter is chosen, re-entry is blocked.
      if (warp.toMap === STARTER_MAP_ID && player.starterId !== "") {
        player.tx = prevTx;
        player.ty = prevTy;
        player.moving = false;
        const rejected: MoveRejectedPayload = { tx: prevTx, ty: prevTy, facing: dir };
        client.send(ServerMessage.MoveRejected, rejected);
        const notice: NoticePayload = { text: "The lab is closed to you now." };
        client.send(ServerMessage.Notice, notice);
        return;
      }
      player.mapId = warp.toMap;
      player.tx = warp.toTx;
      player.ty = warp.toTy;
      if (warp.toFacing) player.facing = warp.toFacing;
      player.moving = false;
      console.log(`[WorldRoom] ${player.username} warped to ${warp.toMap} (${warp.toTx}, ${warp.toTy})`);
      return;
    }

    player.moving = true;
    this.clock.setTimeout(() => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.moving = false;
    }, STEP_DURATION_MS);
  }

  private handleFace(client: Client, msg: FaceIntent): void {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.battling) return;
    if (isDirection(msg?.dir)) player.facing = msg.dir;
  }

  /**
   * Broadcast a public speech bubble anchored above the sender. Every client
   * receives it (including the sender) and renders it above that player's
   * avatar if they can see them. Private bubbles never reach the server.
   */
  private handleSay(client: Client, msg: SayIntent): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const text = sanitiseText(msg?.text);
    if (!text) return;

    const payload: BubblePayload = { sessionId: client.sessionId, text };
    this.broadcast(ServerMessage.Bubble, payload);
  }

  /**
   * Authoritatively grant a starter. The pick is only honoured if the player is
   * actually in the lab, hasn't already chosen, sent a valid starter id, and is
   * standing beside (facing) that starter's table — so the client can't fabricate
   * a choice. State is in-memory only, so a refresh resets it (dev/test phase).
   */
  private handleChooseStarter(client: Client, msg: ChooseStarterIntent): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    if (player.starterId !== "") return;
    if (player.mapId !== STARTER_MAP_ID) return;
    if (!isStarterId(msg?.starterId)) return;

    const delta = DIRECTION_DELTAS[player.facing as Direction];
    const facing = starterAt(player.tx + delta.dx, player.ty + delta.dy);
    if (!facing || facing.id !== msg.starterId) return;

    player.starterId = facing.id;
    console.log(`[WorldRoom] ${player.username} chose ${facing.name}`);

    const notice: NoticePayload = { text: `${facing.name} is now your partner!` };
    client.send(ServerMessage.Notice, notice);
  }

  /** First walkable tile on `mapId`, scanning outward from the map centre. */
  private findSpawn(mapId: string): { tx: number; ty: number } {
    const world = this.mapFor(mapId);
    const cx = Math.floor(world.width / 2);
    const cy = Math.floor(world.height / 2);
    const occupied = new Set<string>();
    this.state.players.forEach((p) => {
      if (p.mapId === mapId) occupied.add(`${p.tx},${p.ty}`);
    });

    for (let r = 0; r < Math.max(world.width, world.height); r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = cx + dx;
          const ty = cy + dy;
          if (!isWalkable(world.collision, world.width, world.height, tx, ty)) continue;
          if (occupied.has(`${tx},${ty}`)) continue;
          return { tx, ty };
        }
      }
    }
    return { tx: cx, ty: cy };
  }
}

function isDirection(value: unknown): value is Direction {
  return typeof value === "string" && VALID_DIRECTIONS.has(value as Direction);
}

function sanitiseUsername(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const trimmed = name.trim().slice(0, 16);
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitiseText(text: unknown): string | undefined {
  if (typeof text !== "string") return undefined;
  const trimmed = text.trim().slice(0, MAX_BUBBLE_TEXT_LEN);
  return trimmed.length > 0 ? trimmed : undefined;
}
