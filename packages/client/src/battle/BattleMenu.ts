import Phaser from "phaser";
import { moveById, type BattleAction, type BattleState } from "@monstro/shared";
import { CommandMenu, type CommandItem } from "./CommandMenu.js";
import { MoveSelectMenu, type MoveView } from "./MoveSelectMenu.js";
import { ListMenu, type ListItem } from "./ListMenu.js";

type MenuMode = "command" | "move" | "switch";

/** Logic for one selectable entry: whether it can be chosen and what it does. */
interface Entry {
  enabled: boolean;
  onSelect: () => void;
}

/**
 * Keyboard-driven battle command menu. Owns the mode/selection state and key
 * handling, delegating rendering to the GBA-style view components (2x2 command
 * grid, move list + type/PP panel, vertical switch list). Emits a
 * `BattleAction` via the callback when the player commits.
 */
export class BattleMenu {
  private readonly commandView: CommandMenu;
  private readonly moveView: MoveSelectMenu;
  private readonly switchView: ListMenu;

  private state?: BattleState;
  private yourSide = 0;
  private mode: MenuMode = "command";
  private index = 0;
  private entries: Entry[] = [];
  private forced = false;
  private open = false;

  constructor(
    scene: Phaser.Scene,
    private readonly onAction: (action: BattleAction) => void,
  ) {
    this.commandView = new CommandMenu(scene);
    this.moveView = new MoveSelectMenu(scene);
    this.switchView = new ListMenu(scene);
    this.bindKeys(scene);
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
    if (forced) this.enterSwitch();
    else this.enterCommand();
  }

  hide(): void {
    this.open = false;
    this.commandView.setVisible(false);
    this.moveView.setVisible(false);
    this.switchView.setVisible(false);
  }

  destroy(): void {
    this.commandView.destroy();
    this.moveView.destroy();
    this.switchView.destroy();
  }

  private bindKeys(scene: Phaser.Scene): void {
    const kb = scene.input.keyboard;
    if (!kb) return;
    kb.on("keydown-UP", () => this.navigate(0, -1));
    kb.on("keydown-DOWN", () => this.navigate(0, 1));
    kb.on("keydown-LEFT", () => this.navigate(-1, 0));
    kb.on("keydown-RIGHT", () => this.navigate(1, 0));
    for (const code of ["ENTER", "SPACE", "Z"]) kb.on(`keydown-${code}`, () => this.confirm());
    for (const code of ["X", "BACKSPACE", "ESC"]) kb.on(`keydown-${code}`, () => this.cancel());
  }

  private enterCommand(): void {
    this.mode = "command";
    const wild = this.state?.kind === "wild";
    const items: CommandItem[] = [
      { label: "FIGHT", enabled: true },
      { label: "BAG", enabled: false },
      { label: "MONSTER", enabled: this.hasSwitchTarget() },
      { label: "RUN", enabled: wild },
    ];
    this.entries = [
      { enabled: true, onSelect: () => this.enterMove() },
      { enabled: false, onSelect: () => {} },
      { enabled: this.hasSwitchTarget(), onSelect: () => this.enterSwitch() },
      { enabled: wild, onSelect: () => this.emit({ kind: "run" }) },
    ];
    this.index = 0;
    this.commandView.setVisible(true);
    this.moveView.setVisible(false);
    this.switchView.setVisible(false);
    this.commandView.render(items, this.index);
  }

  private enterMove(): void {
    const active = this.activeMonster();
    if (!active) return;
    this.mode = "move";
    const views: MoveView[] = active.moves.map((slot) => {
      const def = moveById(slot.moveId);
      return {
        name: def?.name ?? slot.moveId,
        type: def?.type ?? "normal",
        pp: slot.pp,
        maxPp: slot.maxPp,
        enabled: slot.pp > 0,
      };
    });
    this.entries = active.moves.map((slot) => ({
      enabled: slot.pp > 0,
      onSelect: () => this.emit({ kind: "move", moveId: slot.moveId }),
    }));
    this.index = Math.max(0, views.findIndex((v) => v.enabled));
    this.commandView.setVisible(false);
    this.switchView.setVisible(false);
    this.moveView.render(views, this.index);
  }

  private enterSwitch(): void {
    const side = this.state?.sides[this.yourSide];
    if (!side) return;
    this.mode = "switch";
    const items: ListItem[] = [];
    this.entries = [];
    side.party.forEach((m, i) => {
      if (i === side.activeIndex) return;
      items.push({ label: `${m.name}  Lv${m.level}  ${m.currentHp}/${m.stats.hp}`, enabled: m.currentHp > 0 });
      this.entries.push({ enabled: m.currentHp > 0, onSelect: () => this.emit({ kind: "switch", partyIndex: i }) });
    });
    this.index = Math.max(0, items.findIndex((it) => it.enabled));
    this.commandView.setVisible(false);
    this.moveView.setVisible(false);
    this.switchView.render(this.forced ? "Choose a replacement" : "Switch to...", items, this.index);
  }

  /** 2D grid navigation; `switch` mode is a single column. */
  private navigate(dCol: number, dRow: number): void {
    if (!this.open || this.entries.length === 0) return;
    const cols = this.mode === "switch" ? 1 : 2;
    const rows = Math.ceil(this.entries.length / cols);
    const col = this.index % cols;
    const row = Math.floor(this.index / cols);
    const nCol = Phaser.Math.Clamp(col + dCol, 0, cols - 1);
    const nRow = Phaser.Math.Clamp(row + dRow, 0, rows - 1);
    const next = nRow * cols + nCol;
    if (next < this.entries.length) {
      this.index = next;
      this.rerender();
    }
  }

  private rerender(): void {
    if (this.mode === "command") this.commandView.render(this.commandItems(), this.index);
    else if (this.mode === "move") this.moveView.render(this.moveViews(), this.index);
    else this.switchView.render(this.forced ? "Choose a replacement" : "Switch to...", this.switchItems(), this.index);
  }

  private confirm(): void {
    if (!this.open) return;
    const entry = this.entries[this.index];
    if (entry?.enabled) entry.onSelect();
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

  private hasSwitchTarget(): boolean {
    const side = this.state?.sides[this.yourSide];
    if (!side) return false;
    return side.party.some((m, i) => i !== side.activeIndex && m.currentHp > 0);
  }

  // Re-derive the current view's render payload from state (cheap; small lists).
  private commandItems(): CommandItem[] {
    const wild = this.state?.kind === "wild";
    return [
      { label: "FIGHT", enabled: true },
      { label: "BAG", enabled: false },
      { label: "MONSTER", enabled: this.hasSwitchTarget() },
      { label: "RUN", enabled: !!wild },
    ];
  }

  private moveViews(): MoveView[] {
    const active = this.activeMonster();
    if (!active) return [];
    return active.moves.map((slot) => {
      const def = moveById(slot.moveId);
      return {
        name: def?.name ?? slot.moveId,
        type: def?.type ?? "normal",
        pp: slot.pp,
        maxPp: slot.maxPp,
        enabled: slot.pp > 0,
      };
    });
  }

  private switchItems(): ListItem[] {
    const side = this.state?.sides[this.yourSide];
    if (!side) return [];
    const items: ListItem[] = [];
    side.party.forEach((m, i) => {
      if (i === side.activeIndex) return;
      items.push({ label: `${m.name}  Lv${m.level}  ${m.currentHp}/${m.stats.hp}`, enabled: m.currentHp > 0 });
    });
    return items;
  }
}
