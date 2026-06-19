/**
 * Static, per-map interaction targets the player can examine by facing them and
 * pressing the action key. These drive a local text bubble for generic flavour
 * objects (signs, props, etc.).
 *
 * The lab's starter tables are NOT listed here: they have dedicated pick/confirm
 * logic and live in `@monstro/shared`'s `starters.ts` (the single source of
 * truth shared with the authoritative server).
 *
 * Coordinates are tile (not pixel) positions and refer to the tile the player
 * is FACING (the object sits on a solid tile; the player stands beside it).
 */

export interface Interactable {
  /** Tile the player must be facing to trigger this interaction. */
  tx: number;
  ty: number;
  /** Text shown in the bubble when interacted with. */
  label: string;
}

/** Interactables keyed by the map they live on. */
export const INTERACTABLES: Record<string, readonly Interactable[]> = {};

/** Returns the interactable on `mapId` at tile (tx, ty), if any. */
export function findInteractable(
  mapId: string,
  tx: number,
  ty: number,
): Interactable | undefined {
  return INTERACTABLES[mapId]?.find((i) => i.tx === tx && i.ty === ty);
}
