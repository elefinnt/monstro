import Phaser from "phaser";
import { speciesById, type MonsterInstance } from "@monstro/shared";
import { BARS, BOXES, DEPTH, SPRITES } from "./layout.js";
import { HEX, NUM, TYPE_NUM } from "./palette.js";
import { PixelBox } from "./PixelBox.js";
import { HpBar } from "./HpBar.js";
import { ExpBar } from "./ExpBar.js";
import { pixelText } from "./text.js";

/** Renders one combatant: a GBA info box (name/level/HP[/EXP]) and a body. */
export class BattleHud {
  private readonly scene: Phaser.Scene;
  private readonly isPlayer: boolean;
  private readonly box: PixelBox;
  private readonly body: Phaser.GameObjects.Arc;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly hpBar: HpBar;
  private readonly hpNumber?: Phaser.GameObjects.Text;
  private readonly expBar?: ExpBar;
  private trainerText?: Phaser.GameObjects.Text;

  private maxHp = 1;
  private displayedHp = 1;

  constructor(scene: Phaser.Scene, isPlayer: boolean) {
    this.scene = scene;
    this.isPlayer = isPlayer;

    const sprite = isPlayer ? SPRITES.player : SPRITES.opponent;
    this.body = scene.add
      .circle(sprite.cx, sprite.cy, sprite.r, NUM.white)
      .setStrokeStyle(1, NUM.boxOutline)
      .setDepth(DEPTH.sprite);

    const r = isPlayer ? BOXES.player : BOXES.opponent;
    this.box = new PixelBox(scene, r.x, r.y, r.w, r.h, DEPTH.box);

    const nameY = r.y + (isPlayer ? 5 : 13);
    this.nameText = pixelText(scene, r.x + 6, nameY, "", { size: 7 }).setDepth(DEPTH.text);
    this.levelText = pixelText(scene, r.x + r.w - 6, nameY, "", { size: 7, originX: 1 }).setDepth(
      DEPTH.text,
    );

    if (isPlayer) {
      this.hpBar = new HpBar(scene, r.x + 20, r.y + 18, BARS.hpWidth, BARS.hpHeight, DEPTH.bar);
      this.hpNumber = pixelText(scene, r.x + r.w - 6, r.y + 26, "", {
        size: 6,
        originX: 1,
      }).setDepth(DEPTH.text);
      this.expBar = new ExpBar(scene, r.x + 22, r.y + 32, BARS.expWidth, BARS.expHeight, DEPTH.bar);
      pixelText(scene, r.x + 6, r.y + 17, "HP", { size: 6, color: dim() }).setDepth(DEPTH.text);
      pixelText(scene, r.x + 6, r.y + 30, "EXP", { size: 5, color: dim() }).setDepth(DEPTH.text);
    } else {
      this.hpBar = new HpBar(scene, r.x + 20, r.y + 22, BARS.hpWidth, BARS.hpHeight, DEPTH.bar);
      pixelText(scene, r.x + 6, r.y + 21, "HP", { size: 6, color: dim() }).setDepth(DEPTH.text);
    }
  }

  /** Show a trainer name above the name row (PvP opponent only). */
  showTrainer(name: string): void {
    if (this.isPlayer) return;
    const r = BOXES.opponent;
    if (!this.trainerText) {
      this.trainerText = pixelText(this.scene, r.x + 6, r.y + 4, "", {
        size: 6,
        color: HEX.opponent,
      }).setDepth(DEPTH.text);
    }
    this.trainerText.setText(name).setVisible(true);
  }

  hideTrainer(): void {
    this.trainerText?.setVisible(false);
  }

  /** Bind a monster and reset the HUD to its current HP (no animation). */
  setMonster(monster: MonsterInstance): void {
    this.maxHp = monster.stats.hp;
    this.displayedHp = monster.currentHp;
    this.nameText.setText(monster.name);
    this.levelText.setText(`Lv${monster.level}`);
    const type = speciesById(monster.speciesId)?.types[0] ?? "normal";
    this.body.setFillStyle(TYPE_NUM[type] ?? NUM.typeNormal);
    this.body.setAlpha(1).setVisible(true).setScale(1);
    this.applyHp(monster.currentHp);
  }

  /** Tween the HP bar/number to a new value; resolves when the tween ends. */
  animateHp(toHp: number): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.addCounter({
        from: this.displayedHp,
        to: toHp,
        duration: 450,
        ease: "Quad.Out",
        onUpdate: (tween) => this.applyHp(tween.getValue() ?? toHp),
        onComplete: () => {
          this.applyHp(toHp);
          resolve();
        },
      });
    });
  }

  /** Fade and shrink the body to signal a faint; resolves when done. */
  animateFaint(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.body,
        alpha: 0,
        scale: 0.3,
        y: this.body.y + 10,
        duration: 500,
        ease: "Quad.In",
        onComplete: () => resolve(),
      });
    });
  }

  private applyHp(hp: number): void {
    const clamped = Phaser.Math.Clamp(hp, 0, this.maxHp);
    this.displayedHp = clamped;
    this.hpBar.setFraction(this.maxHp > 0 ? clamped / this.maxHp : 0);
    this.hpNumber?.setText(`${Math.ceil(clamped)}/${this.maxHp}`);
  }

  destroy(): void {
    this.box.destroy();
    this.body.destroy();
    this.nameText.destroy();
    this.levelText.destroy();
    this.hpBar.destroy();
    this.hpNumber?.destroy();
    this.expBar?.destroy();
    this.trainerText?.destroy();
  }
}

/** A slightly faded near-black for the small "HP"/"EXP" captions. */
function dim(): string {
  return "#5a5a4e";
}
