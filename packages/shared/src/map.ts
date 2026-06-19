/**
 * Minimal Tiled (.json) map typing plus helpers shared by client and server.
 *
 * The client feeds the same JSON to Phaser's tilemap loader; the server reads it
 * to build an authoritative collision grid for validating movement. Keeping the
 * parsing here guarantees both sides agree on what is walkable.
 */

export interface TiledLayer {
  name: string;
  type: "tilelayer" | "objectgroup" | string;
  width?: number;
  height?: number;
  /** Row-major tile gids (0 === empty). Present on tile layers. */
  data?: number[];
  visible?: boolean;
  properties?: TiledProperty[];
}

export interface TiledProperty {
  name: string;
  type: string;
  value: unknown;
}

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: Array<{ firstgid: number; name?: string; source?: string }>;
}

/** Conventional layer names used across the project. */
export const LAYER = {
  Ground: "ground",
  Grass: "grass",
  Collision: "collision",
} as const;

export function getTileLayer(map: TiledMap, name: string): TiledLayer | undefined {
  return map.layers.find((l) => l.type === "tilelayer" && l.name === name);
}

/**
 * Build a boolean collision grid (true === blocked) from the collision layer.
 * Any non-zero gid on the collision layer is treated as solid.
 */
export function buildCollisionGrid(map: TiledMap): boolean[][] {
  const grid: boolean[][] = Array.from({ length: map.height }, () =>
    new Array<boolean>(map.width).fill(false),
  );

  const layer = getTileLayer(map, LAYER.Collision);
  if (!layer?.data) return grid;

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const gid = layer.data[y * map.width + x] ?? 0;
      if (gid !== 0) grid[y][x] = true;
    }
  }
  return grid;
}

/** True if a tile coordinate is inside the map AND not blocked. */
export function isWalkable(
  grid: boolean[][],
  width: number,
  height: number,
  tx: number,
  ty: number,
): boolean {
  if (tx < 0 || ty < 0 || tx >= width || ty >= height) return false;
  return !grid[ty][tx];
}

/** True if the given tile is tall grass (used later for wild encounters). */
export function isTallGrass(map: TiledMap, tx: number, ty: number): boolean {
  const layer = getTileLayer(map, LAYER.Grass);
  if (!layer?.data) return false;
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return false;
  return (layer.data[ty * map.width + tx] ?? 0) !== 0;
}
