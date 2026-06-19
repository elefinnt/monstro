import Phaser from "phaser";
import { CANVAS_H, CANVAS_W } from "./layout.js";
import { HEX } from "./palette.js";

/**
 * Integer-scale the fixed 240x160 battle canvas to fill the window and centre
 * it, letterboxing the remainder with the app background. Re-run on resize.
 *
 * All battle game objects live in canvas space (0..240, 0..160); the camera
 * zoom does the scaling so the design-spec coordinates map 1:1.
 */
export function fitBattleCamera(scene: Phaser.Scene): void {
  const cam = scene.cameras.main;
  const { width, height } = scene.scale;
  const zoom = Math.max(1, Math.floor(Math.min(width / CANVAS_W, height / CANVAS_H)));
  cam.setZoom(zoom);
  cam.centerOn(CANVAS_W / 2, CANVAS_H / 2);
  cam.setBackgroundColor(HEX.appBg);
}
