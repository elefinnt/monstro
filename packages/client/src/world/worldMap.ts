import Phaser from "phaser";
import { TILE_SIZE, buildCollisionGrid, type TiledMap } from "@monstro/shared";
import { TILESET_TEXTURE, buildTilesetTexture, buildPlayerTexture } from "../render/textures.js";
import routeMap from "../../../../assets/maps/route.json";

const MAP_KEY = "route";

export interface BuiltWorld {
  collision: boolean[][];
  width: number;
  height: number;
  widthPx: number;
  heightPx: number;
}

/**
 * Renders the Tiled map with placeholder textures and returns the collision grid
 * (derived from the same JSON the server uses) for client-side prediction.
 */
export function buildWorld(scene: Phaser.Scene): BuiltWorld {
  buildTilesetTexture(scene);
  buildPlayerTexture(scene);

  const data = routeMap as unknown as TiledMap;

  if (!scene.cache.tilemap.exists(MAP_KEY)) {
    scene.cache.tilemap.add(MAP_KEY, {
      format: Phaser.Tilemaps.Formats.TILED_JSON,
      data,
    });
  }

  const map = scene.make.tilemap({ key: MAP_KEY });
  const tiles = map.addTilesetImage("placeholder", TILESET_TEXTURE, TILE_SIZE, TILE_SIZE, 0, 0);
  if (tiles) {
    map.createLayer("ground", tiles, 0, 0);
    map.createLayer("grass", tiles, 0, 0);
    map.createLayer("collision", tiles, 0, 0);
  }

  return {
    collision: buildCollisionGrid(data),
    width: data.width,
    height: data.height,
    widthPx: data.width * TILE_SIZE,
    heightPx: data.height * TILE_SIZE,
  };
}
