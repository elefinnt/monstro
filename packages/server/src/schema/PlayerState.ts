import { Schema, type } from "@colyseus/schema";

/**
 * Per-player synced state in the WorldRoom. Positions are in TILE coordinates
 * (not pixels) — the client converts to pixels using TILE_SIZE.
 */
export class PlayerState extends Schema {
  @type("string") id = "";
  @type("string") username = "";
  /** Id of the map this player is currently standing on. */
  @type("string") mapId = "";
  @type("number") tx = 0;
  @type("number") ty = 0;
  /** One of the Direction values ("up" | "down" | "left" | "right"). */
  @type("string") facing = "down";
  /** True while a grid-step is in progress (drives walk animation). */
  @type("boolean") moving = false;
  /** Frozen during a battle (PvP); avatar stays put in the world. */
  @type("boolean") battling = false;
  /** Chosen starter monster id, or "" if not yet chosen (in-memory only). */
  @type("string") starterId = "";
}
