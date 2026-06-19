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
  /** Emit a PUBLIC speech bubble above this player (everyone on the map sees it). */
  Say: "say",
  /** Pick a starter monster (only valid while in the lab, facing its table). */
  ChooseStarter: "choose-starter",
} as const;

export type ClientMessageType = (typeof ClientMessage)[keyof typeof ClientMessage];

export interface MoveIntent {
  dir: Direction;
}

export interface FaceIntent {
  dir: Direction;
}

export interface SayIntent {
  text: string;
}

export interface ChooseStarterIntent {
  /** Id of the chosen starter (must be a valid STARTERS id). */
  starterId: string;
}

/** Maximum length of a public bubble's text (server truncates beyond this). */
export const MAX_BUBBLE_TEXT_LEN = 80;

/** Messages sent FROM the server TO the client (outside synced schema). */
export const ServerMessage = {
  /** Sent once on join so the client knows which session id is "me". */
  Welcome: "welcome",
  /** Server rejected a move intent; client should reconcile/snap back. */
  MoveRejected: "move-rejected",
  /** A PUBLIC speech bubble to render above the named player's avatar. */
  Bubble: "bubble",
  /** A PRIVATE, server-originated message for one client (e.g. "already chosen"). */
  Notice: "notice",
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

export interface BubblePayload {
  /** Session id of the player the bubble is anchored above. */
  sessionId: string;
  text: string;
}

export interface NoticePayload {
  /** Short message shown privately above the local player. */
  text: string;
}

/** Options passed by the client when joining the WorldRoom. */
export interface WorldJoinOptions {
  username?: string;
}
