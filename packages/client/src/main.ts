import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { WorldScene } from "./scenes/WorldScene.js";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#0b1020",
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: "100%",
    height: "100%",
  },
  scene: [BootScene, WorldScene],
};

new Phaser.Game(config);
