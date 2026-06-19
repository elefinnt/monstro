/**
 * Loads a Tiled (.json) map from the shared assets directory and derives the
 * authoritative collision grid. The server uses this to validate movement.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCollisionGrid, type TiledMap } from "@monstro/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Repo-root assets dir, overridable via MONSTRO_ASSETS_DIR for deployment. */
function assetsDir(): string {
  return (
    process.env.MONSTRO_ASSETS_DIR ??
    resolve(__dirname, "../../../../assets")
  );
}

export interface LoadedMap {
  id: string;
  map: TiledMap;
  collision: boolean[][];
  width: number;
  height: number;
}

export function loadWorldMap(mapId: string): LoadedMap {
  const file = resolve(assetsDir(), "maps", `${mapId}.json`);
  const raw = readFileSync(file, "utf-8");
  const map = JSON.parse(raw) as TiledMap;
  return {
    id: mapId,
    map,
    collision: buildCollisionGrid(map),
    width: map.width,
    height: map.height,
  };
}
