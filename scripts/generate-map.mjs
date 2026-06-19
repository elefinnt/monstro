/**
 * Generates a placeholder Tiled (.json) overworld map for Monstro.
 *
 * This produces a real Tiled-format export that Phaser can load directly and the
 * server can parse for collision. Art is placeholder (the client builds a
 * coloured-tile texture at runtime), so networking is not blocked by real assets.
 * Replace this with a hand-authored Tiled map (e.g. Tuxemon tilesets) later.
 *
 * Run with: pnpm generate:map
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../assets/maps/route.json");

const WIDTH = 40;
const HEIGHT = 30;
const TILE = 16;

// Tile gids (Tiled is 1-indexed; firstgid = 1).
const GID = {
  GRASS: 1,
  PATH: 2,
  TALL_GRASS: 3,
  WATER: 4,
  TREE: 5,
  ROCK: 6,
};

const idx = (x, y) => y * WIDTH + x;

const ground = new Array(WIDTH * HEIGHT).fill(GID.GRASS);
const grass = new Array(WIDTH * HEIGHT).fill(0);
const collision = new Array(WIDTH * HEIGHT).fill(0);

// Horizontal + vertical dirt path.
const pathRow = Math.floor(HEIGHT / 2);
const pathCol = Math.floor(WIDTH / 2);
for (let x = 1; x < WIDTH - 1; x++) ground[idx(x, pathRow)] = GID.PATH;
for (let y = 1; y < HEIGHT - 1; y++) ground[idx(pathCol, y)] = GID.PATH;

// Tall-grass patches (avoid the path so the player can always walk through).
const patches = [
  { x: 4, y: 4, w: 6, h: 4 },
  { x: 28, y: 6, w: 7, h: 5 },
  { x: 6, y: 20, w: 8, h: 5 },
  { x: 26, y: 21, w: 6, h: 4 },
];
for (const p of patches) {
  for (let y = p.y; y < p.y + p.h; y++) {
    for (let x = p.x; x < p.x + p.w; x++) {
      if (ground[idx(x, y)] !== GID.PATH) grass[idx(x, y)] = GID.TALL_GRASS;
    }
  }
}

// A small pond (water = blocked).
for (let y = 18; y < 23; y++) {
  for (let x = 32; x < 37; x++) {
    if (ground[idx(x, y)] !== GID.PATH) collision[idx(x, y)] = GID.WATER;
  }
}

// A few rocks dotted around (blocked).
for (const [x, y] of [
  [12, 8],
  [20, 12],
  [22, 24],
  [9, 14],
]) {
  if (ground[idx(x, y)] !== GID.PATH) collision[idx(x, y)] = GID.ROCK;
}

// Tree border (blocked), leaving gaps where the path exits the map edges.
for (let x = 0; x < WIDTH; x++) {
  if (x !== pathCol) {
    collision[idx(x, 0)] = GID.TREE;
    collision[idx(x, HEIGHT - 1)] = GID.TREE;
  }
}
for (let y = 0; y < HEIGHT; y++) {
  if (y !== pathRow) {
    collision[idx(0, y)] = GID.TREE;
    collision[idx(WIDTH - 1, y)] = GID.TREE;
  }
}

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
  layers: [
    layer("ground", ground),
    layer("grass", grass),
    layer("collision", collision),
  ],
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(map, null, 2));
console.log(`Wrote ${OUT} (${WIDTH}x${HEIGHT} tiles @ ${TILE}px)`);
