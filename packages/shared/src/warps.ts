/**
 * Warp (room-transition) definitions shared by client and server.
 *
 * A warp triggers when a player steps ONTO the trigger tile (`tx`, `ty`) on a
 * given map; the server then moves them to the destination map/tile. Keeping
 * this here means the authoritative server and the predicting client agree on
 * where the doors are.
 *
 * Coordinates are tile (not pixel) positions. The trigger tiles deliberately
 * sit on map edges/doorways; destinations sit one tile *inside* the target so
 * the player doesn't immediately re-trigger the return warp.
 */

import { DEFAULT_MAP_ID, STARTER_ROOM_MAP_ID, type Direction } from "./constants.js";

export interface Warp {
  /** Tile that triggers the warp when stepped onto. */
  tx: number;
  ty: number;
  /** Destination map id. */
  toMap: string;
  /** Destination tile on the target map. */
  toTx: number;
  toTy: number;
  /** Facing to apply on arrival (defaults to the player's current facing). */
  toFacing?: Direction;
}

/**
 * Warps keyed by the map they live on.
 *
 * - `route` top-middle exit (20, 0) -> `lab` entrance, facing up into the room.
 * - `lab` bottom-middle doorway (5, 8) -> back onto `route` just below the exit.
 */
export const WARPS: Record<string, readonly Warp[]> = {
  [DEFAULT_MAP_ID]: [
    { tx: 20, ty: 0, toMap: STARTER_ROOM_MAP_ID, toTx: 5, toTy: 7, toFacing: "up" },
  ],
  [STARTER_ROOM_MAP_ID]: [
    { tx: 5, ty: 8, toMap: DEFAULT_MAP_ID, toTx: 20, toTy: 1, toFacing: "down" },
  ],
};

/** Returns the warp on `mapId` triggered by stepping onto (tx, ty), if any. */
export function findWarp(mapId: string, tx: number, ty: number): Warp | undefined {
  return WARPS[mapId]?.find((w) => w.tx === tx && w.ty === ty);
}

/** Every map id reachable through the warp graph (used to preload maps). */
export function allMapIds(): string[] {
  const ids = new Set<string>();
  for (const [from, warps] of Object.entries(WARPS)) {
    ids.add(from);
    for (const w of warps) ids.add(w.toMap);
  }
  return [...ids];
}
