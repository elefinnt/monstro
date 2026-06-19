/**
 * Network message contracts shared by client and server.
 *
 * The server is authoritative: clients send *intents* (e.g. "I want to move
 * up"); the server validates and broadcasts authoritative state via the synced
 * schema. These message types describe the non-schema, request/response traffic.
 */

import type { Direction } from "./constants.js";
import type { BattleAction, BattleEvent, BattleState } from "./battle/types.js";

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
  /** Challenge the faced player to a PvP battle (WorldRoom). */
  Challenge: "challenge",
  /** Choose an action for the current battle turn (BattleRoom). */
  BattleAct: "battle-act",
  /** Tell the WorldRoom this client's battle is over, so it can unfreeze. */
  BattleConcluded: "battle-concluded",
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

export interface ChallengeIntent {
  /** Session id of the player being challenged (must be on the faced tile). */
  targetSessionId: string;
}

export interface BattleActIntent {
  /** The chosen move / switch / run for this turn. */
  action: BattleAction;
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
  /** WorldRoom -> client: a battle is starting; consume the seat reservation. */
  BattleStart: "battle-start",
  /** BattleRoom -> client: the full authoritative battle state. */
  BattleSnapshot: "battle-snapshot",
  /** BattleRoom -> client: events to animate, plus the resulting state. */
  BattleEvents: "battle-events",
  /** BattleRoom -> client: the battle is over. */
  BattleEnded: "battle-ended",
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

/**
 * Tells a client to join the BattleRoom. `reservation` is a Colyseus seat
 * reservation (typed loosely here to keep the shared package free of the
 * colyseus dependency); the client passes it to `consumeSeatReservation`.
 */
export interface BattleStartPayload {
  reservation: unknown;
  /** Which side (0 or 1) this client controls in the upcoming battle. */
  side: number;
  kind: "wild" | "pvp";
}

/** BattleRoom -> client: the authoritative state plus the controlled side. */
export interface BattleSnapshotPayload {
  state: BattleState;
  /** The side index this client controls (0 or 1). */
  yourSide: number;
}

/** BattleRoom -> client: an ordered batch of events and the post-turn state. */
export interface BattleEventsPayload {
  events: BattleEvent[];
  state: BattleState;
}

/** BattleRoom -> client: the final outcome. */
export interface BattleEndedPayload {
  winner: number | null;
  ranAway: boolean;
  yourSide: number;
}

/** Options the BattleRoom is created with (carries both sides' parties). */
export interface BattleRoomOptions {
  kind: "wild" | "pvp";
  seed: number;
  /** Serialised side definitions (parties already built by the WorldRoom). */
  sides: BattleSideInit[];
}

/** A side as handed to the BattleRoom at creation. */
export interface BattleSideInit {
  actor: "human" | "ai";
  sessionId?: string;
  trainerName: string;
  /** Party members described as species + level (engine builds the instances). */
  party: Array<{ speciesId: string; level: number; nickname?: string }>;
}

/** Options a client passes when consuming a battle seat reservation. */
export interface BattleJoinOptions {
  side: number;
}

/** Options passed by the client when joining the WorldRoom. */
export interface WorldJoinOptions {
  username?: string;
}
