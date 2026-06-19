import { Schema, MapSchema, type } from "@colyseus/schema";
import { PlayerState } from "./PlayerState.js";

/** Root synced state for a WorldRoom instance. */
export class WorldState extends Schema {
  @type("string") mapId = "route";
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
