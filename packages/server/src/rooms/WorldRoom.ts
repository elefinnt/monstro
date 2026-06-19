import { Room, type Client } from "colyseus";
import {
  ClientMessage,
  ServerMessage,
  DEFAULT_MAP_ID,
  DIRECTION_DELTAS,
  STEP_DURATION_MS,
  isWalkable,
  type Direction,
  type MoveIntent,
  type FaceIntent,
  type WelcomePayload,
  type MoveRejectedPayload,
  type WorldJoinOptions,
} from "@monstro/shared";
import { WorldState } from "../schema/WorldState.js";
import { PlayerState } from "../schema/PlayerState.js";
import { loadWorldMap, type LoadedMap } from "../world/mapLoader.js";

const VALID_DIRECTIONS = new Set<Direction>(["up", "down", "left", "right"]);

/**
 * The shared overworld. Authoritative for movement and presence. Wild (PvE)
 * battles will later run as in-world sessions here; PvP uses a separate
 * BattleRoom while avatars stay frozen in this room.
 */
export class WorldRoom extends Room<WorldState> {
  private world!: LoadedMap;

  onCreate(options: { mapId?: string }): void {
    const mapId = options?.mapId ?? DEFAULT_MAP_ID;
    this.world = loadWorldMap(mapId);

    this.state = new WorldState();
    this.state.mapId = mapId;

    this.onMessage<MoveIntent>(ClientMessage.Move, (client, msg) =>
      this.handleMove(client, msg),
    );
    this.onMessage<FaceIntent>(ClientMessage.Face, (client, msg) =>
      this.handleFace(client, msg),
    );
  }

  onJoin(client: Client, options?: WorldJoinOptions): void {
    const spawn = this.findSpawn();
    const player = new PlayerState();
    player.id = client.sessionId;
    player.username = sanitiseUsername(options?.username) ?? `Trainer-${client.sessionId.slice(0, 4)}`;
    player.tx = spawn.tx;
    player.ty = spawn.ty;
    player.facing = "down";
    this.state.players.set(client.sessionId, player);

    const welcome: WelcomePayload = {
      sessionId: client.sessionId,
      mapId: this.state.mapId,
      tx: spawn.tx,
      ty: spawn.ty,
    };
    client.send(ServerMessage.Welcome, welcome);
    console.log(`[WorldRoom] ${player.username} joined at (${spawn.tx}, ${spawn.ty})`);
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

    const delta = DIRECTION_DELTAS[dir];
    const nx = player.tx + delta.dx;
    const ny = player.ty + delta.dy;

    if (!isWalkable(this.world.collision, this.world.width, this.world.height, nx, ny)) {
      const payload: MoveRejectedPayload = { tx: player.tx, ty: player.ty, facing: dir };
      client.send(ServerMessage.MoveRejected, payload);
      return;
    }

    player.tx = nx;
    player.ty = ny;
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

  /** First walkable tile scanning outward from the map centre. */
  private findSpawn(): { tx: number; ty: number } {
    const cx = Math.floor(this.world.width / 2);
    const cy = Math.floor(this.world.height / 2);
    const occupied = new Set<string>();
    this.state.players.forEach((p) => occupied.add(`${p.tx},${p.ty}`));

    for (let r = 0; r < Math.max(this.world.width, this.world.height); r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = cx + dx;
          const ty = cy + dy;
          if (!isWalkable(this.world.collision, this.world.width, this.world.height, tx, ty)) continue;
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
