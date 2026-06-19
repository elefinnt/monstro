import { Schema, type } from "@colyseus/schema";

/**
 * Minimal synced state for a BattleRoom. The rich battle model lives in the
 * pure engine and is broadcast as JSON snapshots/events via messages, so this
 * schema only carries lightweight metadata (handy for the lobby/inspector).
 */
export class BattleRoomState extends Schema {
  @type("string") battleId = "";
  @type("string") kind = "wild";
  @type("string") phase = "choosing";
  @type("number") turn = 1;
}
