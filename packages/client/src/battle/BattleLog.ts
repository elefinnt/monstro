import Phaser from "phaser";

/** The bottom message box that narrates the battle ("Ember used Ember!"). */
export class BattleLog {
  private readonly box: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.box = scene.add
      .rectangle(x, y, width, height, 0x10131c)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xf5f5f5)
      .setDepth(30);
    this.text = scene.add
      .text(x + 14, y + 12, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#f5f5f5",
        wordWrap: { width: width - 28 },
      })
      .setOrigin(0, 0)
      .setDepth(31);
  }

  set(message: string): void {
    this.text.setText(message);
  }

  clear(): void {
    this.text.setText("");
  }

  destroy(): void {
    this.box.destroy();
    this.text.destroy();
  }
}
