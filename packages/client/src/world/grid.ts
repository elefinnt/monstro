import { TILE_SIZE } from "@monstro/shared";

/** Centre-of-tile pixel coordinate for a tile index on one axis. */
export function tileToPixel(tile: number): number {
  return tile * TILE_SIZE + TILE_SIZE / 2;
}

/** Tile index containing a given pixel coordinate on one axis. */
export function pixelToTile(pixel: number): number {
  return Math.floor(pixel / TILE_SIZE);
}
