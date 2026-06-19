/**
 * Core, project-wide constants. The whole project is standardised on 16x16
 * tiles. Do NOT introduce other tile sizes anywhere.
 */

/** Pixel size of a single tile (width === height). */
export const TILE_SIZE = 16;

/** Default camera zoom for the overworld (~2-3x is the authentic Emerald feel). */
export const CAMERA_ZOOM = 6;

/** Duration (ms) of a single grid-step movement tween. */
export const STEP_DURATION_MS = 160;

/**
 * Camera follow lerp (0..1). The avatar sprite already animates smoothly via a
 * tween, so the camera should track it tightly (1 = locked, authentic Emerald
 * feel). Lower values add a second layer of smoothing that reads as input lag.
 */
export const CAMERA_FOLLOW_LERP = 1;

/** Identifier of the default/starting overworld map. */
export const DEFAULT_MAP_ID = "route";

/** Server tick rate (Hz) for the authoritative simulation. */
export const SERVER_TICK_RATE = 20;

/** Direction a player/entity is facing or attempting to move. */
export type Direction = "up" | "down" | "left" | "right";

/** All directions in a stable order. */
export const DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"] as const;

/** Per-direction tile deltas. */
export const DIRECTION_DELTAS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};
