/**
 * Network message contracts shared by client and server.
 *
 * The server is authoritative: clients send *intents* (e.g. "I want to move
 * up"); the server validates and broadcasts authoritative state via the synced
 * schema. These message types describe the non-schema, request/response traffic.
 */

import type { Direction } from "./constants.js";

/** Messages sent FROM the client TO the server. */
export const ClientMessage = {
  /** Intent to step one tile in a direction. */
  Move: "move",
  /** Intent to turn to face a direction without moving (blocked step). */
  Face: "face",
} as const;

export type ClientMessageType = (typeof ClientMessage)[keyof typeof ClientMessage];

export interface MoveIntent {
  dir: Direction;
}

export interface FaceIntent {
  dir: Direction;
}

/** Messages sent FROM the server TO the client (outside synced schema). */
export const ServerMessage = {
  /** Sent once on join so the client knows which session id is "me". */
  Welcome: "welcome",
  /** Server rejected a move intent; client should reconcile/snap back. */
  MoveRejected: "move-rejected",
} as const;

export type ServerMessageType = (typeof ServerMessage)[keyof typeof ServerMessage];

export interface WelcomePayload {
  sessionId: string;
  mapId: string;
  tx: number;
  ty: number;
}

export interface MoveRejectedPayload {
  tx: number;
  ty: number;
  facing: Direction;
}

/** Options passed by the client when joining the WorldRoom. */
export interface WorldJoinOptions {
  username?: string;
}
