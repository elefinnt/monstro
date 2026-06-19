import Phaser from "phaser";
import { moveById, type BattleAction, type BattleState } from "@monstro/shared";

type MenuMode = "command" | "move" | "switch";

interface MenuItem {
  label: string;
  /** What choosing this item does: drill into a submenu or emit an action. */
  onSelect: () => void;
  enabled: boolean;
}

const ITEM_HEIGHT = 26;

/**
 * Keyboard-driven battle command menu. Top level offers Fight / Switch / Run;
 * Fight drills into the active monster's moves and Switch into the living
 * party. Emits a `BattleAction` via the callback when the player commits.
 */
export class BattleMenu {
  private readonly scene: Phaser.Scene;
  private readonly onAction: (action: BattleAction) => void;
  private readonly container: Phaser.GameObjects.Container;
  private readonly cursor: Phaser.GameObjects.Text;
  private readonly title: Phaser.GameObjects.Text;
  private texts: Phaser.GameObjects.Text[] = [];

  private state?: BattleState;
  private yourSide = 0;
  private mode: MenuMode = "command";
  private index = 0;
  private items: MenuItem[] = [];
  private forced = false;
  private open = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onAction: (action: BattleAction) => void,
  ) {
    this.scene = scene;
    this.onAction = onAction;

    const bg = scene.add
      .rectangle(0, 0, 260, 150, 0x1b2233)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xf5f5f5);
    this.title = scene.add.text(14, 8, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#9fb4d8",
    });
    this.cursor = scene.add.text(10, 34, ">", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffd166",
    });
    this.container = scene.add.container(x, y, [bg, this.title, this.cursor]).setDepth(40);
    this.container.setVisible(false);

    this.bindKeys();
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Show the menu for the current turn. `forced` jumps straight to switching. */
  show(state: BattleState, yourSide: number, forced: boolean): void {
    this.state = state;
    this.yourSide = yourSide;
    this.forced = forced;
    this.open = true;
    this.container.setVisible(true);
    if (forced) this.enterSwitch();
    else this.enterCommand();
  }

  hide(): void {
    this.open = false;
    this.container.setVisible(false);
  }

  destroy(): void {
    this.container.destroy();
  }

  private bindKeys(): void {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    kb.on("keydown-UP", () => this.move(-1));
    kb.on("keydown-DOWN", () => this.move(1));
    for (const code of ["ENTER", "SPACE", "Z"]) kb.on(`keydown-${code}`, () => this.confirm());
    for (const code of ["X", "BACKSPACE", "ESC"]) kb.on(`keydown-${code}`, () => this.cancel());
  }

  private enterCommand(): void {
    this.mode = "command";
    this.title.setText("What will you do?");
    const items: MenuItem[] = [
      { label: "Fight", onSelect: () => this.enterMove(), enabled: true },
      { label: "Switch", onSelect: () => this.enterSwitch(), enabled: true },
    ];
    if (this.state?.kind === "wild") {
      items.push({ label: "Run", onSelect: () => this.emit({ kind: "run" }), enabled: true });
    }
    this.setItems(items);
  }

  private enterMove(): void {
    const active = this.activeMonster();
    if (!active) return;
    this.mode = "move";
    this.title.setText("Choose a move");
    this.setItems(
      active.moves.map((slot) => {
        const def = moveById(slot.moveId);
        return {
          label: `${def?.name ?? slot.moveId}  ${slot.pp}/${slot.maxPp}`,
          onSelect: () => this.emit({ kind: "move", moveId: slot.moveId }),
          enabled: slot.pp > 0,
        };
      }),
    );
  }

  private enterSwitch(): void {
    const side = this.state?.sides[this.yourSide];
    if (!side) return;
    this.mode = "switch";
    this.title.setText(this.forced ? "Choose a replacement" : "Switch to...");
    const items: MenuItem[] = [];
    side.party.forEach((m, i) => {
      if (i === side.activeIndex) return;
      items.push({
        label: `${m.name}  Lv${m.level}  ${m.currentHp}/${m.stats.hp}`,
        onSelect: () => this.emit({ kind: "switch", partyIndex: i }),
        enabled: m.currentHp > 0,
      });
    });
    this.setItems(items);
  }

  private setItems(items: MenuItem[]): void {
    this.items = items;
    this.index = Math.max(0, items.findIndex((it) => it.enabled));
    if (this.index === -1) this.index = 0;
    for (const t of this.texts) t.destroy();
    this.texts = items.map((item, i) =>
      this.scene.add.text(28, 34 + i * ITEM_HEIGHT, item.label, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: item.enabled ? "#f5f5f5" : "#6b7280",
      }),
    );
    this.container.add(this.texts);
    this.refreshCursor();
  }

  private move(delta: number): void {
    if (!this.open || this.items.length === 0) return;
    let next = this.index;
    for (let i = 0; i < this.items.length; i++) {
      next = (next + delta + this.items.length) % this.items.length;
      if (this.items[next].enabled) break;
    }
    this.index = next;
    this.refreshCursor();
  }

  private refreshCursor(): void {
    this.cursor.setY(34 + this.index * ITEM_HEIGHT);
  }

  private confirm(): void {
    if (!this.open) return;
    const item = this.items[this.index];
    if (item?.enabled) item.onSelect();
  }

  private cancel(): void {
    if (!this.open || this.forced) return;
    if (this.mode !== "command") this.enterCommand();
  }

  private emit(action: BattleAction): void {
    this.hide();
    this.onAction(action);
  }

  private activeMonster() {
    const side = this.state?.sides[this.yourSide];
    return side?.party[side.activeIndex];
  }
}
