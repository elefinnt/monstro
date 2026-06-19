/**
 * The three starter monsters offered in the lab. This is the single source of
 * truth for both the client (rendering the choice prompt) and the authoritative
 * server (validating a player's pick).
 *
 * Each starter sits on a specific lab table tile; a player picks it by standing
 * beside the table and facing that tile. Coordinates are tile (not pixel)
 * positions and must match the tables placed in the lab map.
 */

import { STARTER_ROOM_MAP_ID } from "./constants.js";

export interface StarterDef {
  /** Stable id stored against the player (e.g. "ember"). */
  id: string;
  /** Display name shown in the selection prompt. */
  name: string;
  /** Lab table tile the player must be facing to pick this starter. */
  tx: number;
  ty: number;
}

/** Map the starters live on (only the lab offers them). */
export const STARTER_MAP_ID = STARTER_ROOM_MAP_ID;

export const STARTERS: readonly StarterDef[] = [
  { id: "ember", name: "Ember", tx: 3, ty: 3 },
  { id: "sprout", name: "Sprout", tx: 5, ty: 3 },
  { id: "ripple", name: "Ripple", tx: 7, ty: 3 },
];

/** Type guard: is `id` one of the valid starter ids? */
export function isStarterId(id: unknown): id is string {
  return typeof id === "string" && STARTERS.some((s) => s.id === id);
}

/** The starter sitting on tile (tx, ty), if any. */
export function starterAt(tx: number, ty: number): StarterDef | undefined {
  return STARTERS.find((s) => s.tx === tx && s.ty === ty);
}

/** The starter with the given id, if any. */
export function starterById(id: string): StarterDef | undefined {
  return STARTERS.find((s) => s.id === id);
}
