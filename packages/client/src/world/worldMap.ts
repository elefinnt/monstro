import Phaser from "phaser";
import { TILE_SIZE, buildCollisionGrid, type TiledMap } from "@monstro/shared";
import { TILESET_TEXTURE, buildTilesetTexture, buildPlayerTexture } from "../render/textures.js";
import routeMap from "../../../../assets/maps/route.json";
import labMap from "../../../../assets/maps/lab.json";

/** All maps the client can render, keyed by id (mirrors assets/maps/<id>.json). */
const MAPS: Record<string, TiledMap> = {
  route: routeMap as unknown as TiledMap,
  lab: labMap as unknown as TiledMap,
};

const TILE_LAYERS = ["ground", "grass", "collision"] as const;

export interface BuiltWorld {
  collision: boolean[][];
  width: number;
  height: number;
  widthPx: number;
  heightPx: number;
  /** The Phaser tilemap + layers, so the scene can tear them down on a map switch. */
  tilemap: Phaser.Tilemaps.Tilemap;
  layers: Phaser.Tilemaps.TilemapLayer[];
}

/**
 * Renders the Tiled map for `mapId` with placeholder textures and returns the
 * collision grid (derived from the same JSON the server uses) for client-side
 * prediction, plus the created tilemap/layers for later teardown.
 */
export function buildWorld(scene: Phaser.Scene, mapId: string): BuiltWorld {
  buildTilesetTexture(scene);
  buildPlayerTexture(scene);

  const data = MAPS[mapId] ?? MAPS.route;
  const cacheKey = `map-${mapId}`;

  if (!scene.cache.tilemap.exists(cacheKey)) {
    scene.cache.tilemap.add(cacheKey, {
      format: Phaser.Tilemaps.Formats.TILED_JSON,
      data,
    });
  }

  const tilemap = scene.make.tilemap({ key: cacheKey });
  const tiles = tilemap.addTilesetImage("placeholder", TILESET_TEXTURE, TILE_SIZE, TILE_SIZE, 0, 0);
  const layers: Phaser.Tilemaps.TilemapLayer[] = [];
  if (tiles) {
    for (const name of TILE_LAYERS) {
      const layer = tilemap.createLayer(name, tiles, 0, 0);
      // Keep tiles below avatars (Avatar containers use depth 10).
      if (layer) layers.push(layer.setDepth(0));
    }
  }

  return {
    collision: buildCollisionGrid(data),
    width: data.width,
    height: data.height,
    widthPx: data.width * TILE_SIZE,
    heightPx: data.height * TILE_SIZE,
    tilemap,
    layers,
  };
}
