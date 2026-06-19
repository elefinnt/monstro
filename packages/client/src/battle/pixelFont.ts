import Phaser from "phaser";

/**
 * Runtime-generated bitmap font for crisp pixel text.
 *
 * Phaser `Text` anti-aliases glyphs at the tiny sizes the GBA UI uses (5–8px),
 * and the battle camera then magnifies that soft image — which reads as blurry.
 * Instead we bake the (already-loaded) "Press Start 2P" face into a bitmap-font
 * atlas at its native 8px grid (rendered at 2x = 16px for fidelity, where glyph
 * edges fall on pixel boundaries and stay sharp), then render with `BitmapText`.
 * The camera upscales that texture with nearest-neighbour, so text stays crisp.
 */
export const PIXEL_FONT_KEY = "pixel";
const ATLAS_TEXTURE = "pixel-font-atlas";

/** Source render size (multiple of the font's 8px grid → no edge blur). */
const RENDER_SIZE = 16;
const CHARS_PER_ROW = 16;
/** Printable ASCII (space through ~). */
const CHARSET = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");

/**
 * Build the bitmap-font atlas + register it in the game's bitmap-font cache.
 * Idempotent and best called after `ensurePixelFont()` has resolved so the
 * webfont is available; safe to call again (no-op once registered).
 */
export function createPixelFont(scene: Phaser.Scene): void {
  if (scene.cache.bitmapFont.has(PIXEL_FONT_KEY)) return;

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) return;
  measure.font = `${RENDER_SIZE}px "Press Start 2P"`;
  const cellW = Math.ceil(measure.measureText("M").width) || RENDER_SIZE;
  const cellH = RENDER_SIZE + 2;

  const rows = Math.ceil(CHARSET.length / CHARS_PER_ROW);
  const canvas = document.createElement("canvas");
  canvas.width = cellW * CHARS_PER_ROW;
  canvas.height = cellH * rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.font = `${RENDER_SIZE}px "Press Start 2P"`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < CHARSET.length; i++) {
    const col = i % CHARS_PER_ROW;
    const row = Math.floor(i / CHARS_PER_ROW);
    ctx.fillText(CHARSET[i], col * cellW, row * cellH + 1);
  }

  if (scene.textures.exists(ATLAS_TEXTURE)) scene.textures.remove(ATLAS_TEXTURE);
  scene.textures.addCanvas(ATLAS_TEXTURE, canvas);

  const data = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: ATLAS_TEXTURE,
    width: cellW,
    height: cellH,
    chars: CHARSET,
    charsPerRow: CHARS_PER_ROW,
    "offset.x": 0,
    "offset.y": 0,
    "spacing.x": 0,
    "spacing.y": 0,
    lineSpacing: 0,
  });
  scene.cache.bitmapFont.add(PIXEL_FONT_KEY, data);
}
