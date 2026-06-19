/**
 * Generates the starter-monster room ("lab") as a Tiled (.json) map for Monstro.
 *
 * This is a small interior room reached from the top-middle exit of `route`.
 * It uses the same placeholder tileset as the overworld so the client's runtime
 * texture builder renders it without extra art. Replace with a hand-authored
 * Tiled map later.
 *
 * Run with: pnpm generate:lab
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../assets/maps/lab.json");

const WIDTH = 11;
const HEIGHT = 9;
const TILE = 16;

// Tile gids (Tiled is 1-indexed; firstgid = 1). Matches scripts/generate-map.mjs.
const GID = {
  GRASS: 1,
  PATH: 2,
  TALL_GRASS: 3,
  WATER: 4,
  TREE: 5,
  ROCK: 6,
};

const idx = (x, y) => y * WIDTH + x;

// Floor uses the "path" tile so the interior reads as a wooden/tiled floor.
const ground = new Array(WIDTH * HEIGHT).fill(GID.PATH);
const grass = new Array(WIDTH * HEIGHT).fill(0);
const collision = new Array(WIDTH * HEIGHT).fill(0);

// Doorway in the bottom-middle wall — this tile warps back out to the route.
const DOOR_X = Math.floor(WIDTH / 2); // 5

// Solid walls around the border, leaving the door gap open.
for (let x = 0; x < WIDTH; x++) {
  collision[idx(x, 0)] = GID.TREE;
  if (x !== DOOR_X) collision[idx(x, HEIGHT - 1)] = GID.TREE;
}
for (let y = 0; y < HEIGHT; y++) {
  collision[idx(0, y)] = GID.TREE;
  collision[idx(WIDTH - 1, y)] = GID.TREE;
}

// Three starter "podiums" (rocks) along the top of the room. The player walks
// up to one to choose a starter (selection logic added separately).
for (const x of [3, 5, 7]) collision[idx(x, 3)] = GID.ROCK;

const layer = (name, data) => ({
  name,
  type: "tilelayer",
  width: WIDTH,
  height: HEIGHT,
  x: 0,
  y: 0,
  opacity: 1,
  visible: true,
  data,
});

const map = {
  type: "map",
  orientation: "orthogonal",
  renderorder: "right-down",
  compressionlevel: -1,
  infinite: false,
  width: WIDTH,
  height: HEIGHT,
  tilewidth: TILE,
  tileheight: TILE,
  nextlayerid: 4,
  nextobjectid: 1,
  tiledversion: "1.10.2",
  version: "1.10",
  tilesets: [
    {
      firstgid: 1,
      name: "placeholder",
      tilewidth: TILE,
      tileheight: TILE,
      tilecount: 6,
      columns: 6,
      image: "placeholder",
      imagewidth: TILE * 6,
      imageheight: TILE,
    },
  ],
  layers: [layer("ground", ground), layer("grass", grass), layer("collision", collision)],
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(map, null, 2));
console.log(`Wrote ${OUT} (${WIDTH}x${HEIGHT} tiles @ ${TILE}px)`);
