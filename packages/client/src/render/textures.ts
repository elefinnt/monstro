import Phaser from "phaser";
import { TILE_SIZE } from "@monstro/shared";

/** Texture key for the generated placeholder tileset. */
export const TILESET_TEXTURE = "placeholder-tileset";
/** Texture key for the generated placeholder player body. */
export const PLAYER_TEXTURE = "placeholder-player";

/** Tileset colours indexed by (gid - 1); matches scripts/generate-map.mjs. */
const TILE_COLOURS = [
  "#5fa84e", // 1 grass
  "#c8a96a", // 2 path
  "#2f7d32", // 3 tall grass
  "#3a78c2", // 4 water
  "#1f5d2a", // 5 tree
  "#8a8a8a", // 6 rock
];

/**
 * Build a placeholder tileset texture: one 16x16 coloured cell per tile gid,
 * laid out horizontally. This stands in for real Tuxemon art until Phase 3.
 */
export function buildTilesetTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TILESET_TEXTURE)) return;

  const cols = TILE_COLOURS.length;
  const tex = scene.textures.createCanvas(TILESET_TEXTURE, cols * TILE_SIZE, TILE_SIZE);
  const ctx = tex?.getContext();
  if (!tex || !ctx) return;

  TILE_COLOURS.forEach((colour, i) => {
    ctx.fillStyle = colour;
    ctx.fillRect(i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    // Subtle inner border so adjacent tiles read as a grid.
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.strokeRect(i * TILE_SIZE + 0.5, 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
  });
  tex.refresh();
}

/** Build a simple white player body texture (tinted per player at runtime). */
export function buildPlayerTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(PLAYER_TEXTURE)) return;

  const w = 12;
  const h = 14;
  const tex = scene.textures.createCanvas(PLAYER_TEXTURE, w, h);
  const ctx = tex?.getContext();
  if (!tex || !ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, h - 3, w, 3); // shaded feet
  tex.refresh();
}
