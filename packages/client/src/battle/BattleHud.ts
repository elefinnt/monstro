import Phaser from "phaser";
import { speciesById, type MonsterInstance } from "@monstro/shared";
import { TYPE_COLOURS } from "./types.js";

export interface BattleHudOptions {
  /** Top-left of the info box (name + HP). */
  boxX: number;
  boxY: number;
  /** Centre of the monster's body placeholder. */
  bodyX: number;
  bodyY: number;
  /** Player side shows an HP number; enemy side hides it (Pokemon convention). */
  isPlayer: boolean;
}

const BOX_W = 220;
const BOX_H = 56;
const BAR_W = 160;
const BAR_H = 8;
const BODY_R = 44;

/** Renders one combatant: an info box (name/level/HP) and a body placeholder. */
export class BattleHud {
  private readonly scene: Phaser.Scene;
  private readonly opts: BattleHudOptions;
  private readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Arc;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly barFill: Phaser.GameObjects.Rectangle;
  private maxHp = 1;

  constructor(scene: Phaser.Scene, opts: BattleHudOptions) {
    this.scene = scene;
    this.opts = opts;

    this.body = scene.add
      .circle(opts.bodyX, opts.bodyY, BODY_R, 0xffffff)
      .setStrokeStyle(3, 0x1b1b1b)
      .setDepth(5);

    const box = scene.add.rectangle(0, 0, BOX_W, BOX_H, 0xfdfdf5).setOrigin(0, 0);
    box.setStrokeStyle(2, 0x1b1b1b);

    this.nameText = scene.add
      .text(10, 8, "", { fontFamily: "monospace", fontSize: "16px", color: "#1b1b1b" })
      .setOrigin(0, 0);

    const barBg = scene.add
      .rectangle(10, 38, BAR_W, BAR_H, 0x5a5a5a)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x1b1b1b);
    this.barFill = scene.add.rectangle(11, 39, BAR_W - 2, BAR_H - 2, 0x4caf50).setOrigin(0, 0);

    this.hpText = scene.add
      .text(10 + BAR_W + 8, 34, "", { fontFamily: "monospace", fontSize: "12px", color: "#1b1b1b" })
      .setOrigin(0, 0)
      .setVisible(opts.isPlayer);

    this.container = scene.add
      .container(opts.boxX, opts.boxY, [box, this.nameText, barBg, this.barFill, this.hpText])
      .setDepth(20);
  }

  /** Bind a monster and reset the HUD to its current HP (no animation). */
  setMonster(monster: MonsterInstance): void {
    this.maxHp = monster.stats.hp;
    this.nameText.setText(`${monster.name}  Lv${monster.level}`);
    const type = speciesById(monster.speciesId)?.types[0] ?? "normal";
    this.body.setFillStyle(TYPE_COLOURS[type] ?? 0xb0a878);
    this.body.setAlpha(1).setVisible(true);
    this.body.setScale(1);
    this.applyHp(monster.currentHp, false);
  }

  /** Tween the HP bar/number to a new value; resolves when the tween ends. */
  animateHp(toHp: number): Promise<void> {
    return new Promise((resolve) => {
      const ratio = this.scene.tweens.addCounter({
        from: Number(this.barFill.getData("hp") ?? this.maxHp),
        to: toHp,
        duration: 450,
        ease: "Quad.Out",
        onUpdate: (tween) => this.applyHp(tween.getValue() ?? toHp, false),
        onComplete: () => {
          this.applyHp(toHp, false);
          resolve();
        },
      });
      void ratio;
    });
  }

  /** Fade and shrink the body to signal a faint; resolves when done. */
  animateFaint(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.body,
        alpha: 0,
        scale: 0.4,
        y: this.opts.bodyY + 20,
        duration: 500,
        ease: "Quad.In",
        onComplete: () => resolve(),
      });
    });
  }

  private applyHp(hp: number, _animated: boolean): void {
    const clamped = Phaser.Math.Clamp(hp, 0, this.maxHp);
    const frac = this.maxHp > 0 ? clamped / this.maxHp : 0;
    this.barFill.width = Math.max(0, (BAR_W - 2) * frac);
    this.barFill.setFillStyle(frac > 0.5 ? 0x4caf50 : frac > 0.2 ? 0xf6c343 : 0xe24a4a);
    this.barFill.setData("hp", clamped);
    this.hpText.setText(`${Math.ceil(clamped)}/${this.maxHp}`);
  }

  destroy(): void {
    this.container.destroy();
    this.body.destroy();
  }
}
