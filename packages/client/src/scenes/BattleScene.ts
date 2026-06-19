import Phaser from "phaser";
import { type Room } from "colyseus.js";
import {
  ClientMessage,
  ServerMessage,
  type BattleAction,
  type BattleState,
  type BattleSnapshotPayload,
  type BattleEventsPayload,
  type BattleEndedPayload,
  type BattleActIntent,
} from "@monstro/shared";
import { joinBattle } from "../net/battleClient.js";
import { BattleHud } from "../battle/BattleHud.js";
import { BattleLog } from "../battle/BattleLog.js";
import { BattleMenu } from "../battle/BattleMenu.js";
import { BattleAnimator } from "../battle/BattleAnimator.js";
import { Battlefield } from "../battle/Battlefield.js";
import { fitBattleCamera } from "../battle/camera.js";
import type { BattleRoomView } from "../battle/types.js";

interface BattleSceneData {
  reservation: unknown;
  kind: "wild" | "pvp";
  /** The WorldRoom, so we can report the battle's conclusion and unfreeze. */
  worldRoom: Room;
}

/**
 * Renders a battle and relays the player's chosen actions to the BattleRoom.
 * It holds NO battle rules — the server (running the shared engine) is
 * authoritative; this scene animates snapshots/events and collects input.
 */
export class BattleScene extends Phaser.Scene {
  private worldRoom!: Room;
  private battleRoom?: Room<BattleRoomView>;
  private yourSide = 0;
  private state?: BattleState;
  private field!: Battlefield;
  private playerHud!: BattleHud;
  private enemyHud!: BattleHud;
  private log!: BattleLog;
  private menu!: BattleMenu;
  private animator!: BattleAnimator;
  private finished = false;
  private greeted = false;
  /** Serialises async presentation so end-of-battle text never races ahead. */
  private queue: Promise<void> = Promise.resolve();

  constructor() {
    super("battle");
  }

  init(data: BattleSceneData): void {
    this.worldRoom = data.worldRoom;
    this.finished = false;
    this.greeted = false;
    this.state = undefined;
    this.queue = Promise.resolve();
  }

  create(): void {
    fitBattleCamera(this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    });

    this.field = new Battlefield(this);
    this.enemyHud = new BattleHud(this, false);
    this.playerHud = new BattleHud(this, true);
    this.log = new BattleLog(this);
    this.menu = new BattleMenu(this, (action) => this.sendAction(action));

    void this.connect();
  }

  private onResize(): void {
    fitBattleCamera(this);
  }

  private async connect(): Promise<void> {
    const data = this.sys.settings.data as BattleSceneData;
    this.log.set("Connecting to battle...");
    try {
      this.battleRoom = await joinBattle(data.reservation);
      this.registerHandlers(this.battleRoom);
    } catch (err) {
      console.error("[battle] failed to join:", err);
      this.log.set("Could not start the battle.");
      this.time.delayedCall(1500, () => this.finish());
    }
  }

  private registerHandlers(room: Room<BattleRoomView>): void {
    room.onMessage<BattleSnapshotPayload>(ServerMessage.BattleSnapshot, (p) => {
      this.yourSide = p.yourSide;
      this.applySnapshot(p.state);
    });
    room.onMessage<BattleEventsPayload>(ServerMessage.BattleEvents, (p) => {
      this.enqueue(() => this.playEvents(p));
    });
    room.onMessage<BattleEndedPayload>(ServerMessage.BattleEnded, (p) => {
      this.enqueue(() => this.handleEnded(p));
    });
  }

  /** The HUD that displays a given side, accounting for the player's view. */
  private hudFor(side: number): BattleHud {
    return side === this.yourSide ? this.playerHud : this.enemyHud;
  }

  private hudPair(): [BattleHud, BattleHud] {
    return [this.hudFor(0), this.hudFor(1)];
  }

  private applySnapshot(state: BattleState): void {
    this.state = state;
    this.animator = new BattleAnimator(this, this.hudPair(), this.log, this.yourSide);

    for (const side of state.sides) {
      this.hudFor(side.index).setMonster(side.party[side.activeIndex]);
    }

    // PvP: show the opposing trainer's name above their monster's name.
    const foe = state.sides[(this.yourSide ^ 1) as 0 | 1];
    if (state.kind === "pvp" && foe.trainerName) this.enemyHud.showTrainer(foe.trainerName);
    else this.enemyHud.hideTrainer();

    if (!this.greeted) {
      this.greeted = true;
      const intro =
        state.kind === "wild"
          ? `A wild ${foe.party[foe.activeIndex].name} appeared!`
          : `${foe.trainerName} wants to battle!`;
      this.log.set(intro);
    }

    this.promptIfNeeded();
  }

  /** Chain async presentation tasks so they always play in arrival order. */
  private enqueue(task: () => Promise<void>): void {
    this.queue = this.queue
      .then(task)
      .catch((err) => console.error("[battle] presentation error:", err));
  }

  private async playEvents(payload: BattleEventsPayload): Promise<void> {
    if (this.finished) return;
    this.menu.hide();
    await this.animator.play(payload.events, payload.state);
    this.state = payload.state;
    this.promptIfNeeded();
  }

  /** Open the command menu when it's this client's turn to choose. */
  private promptIfNeeded(): void {
    const state = this.state;
    if (!state || this.finished) return;
    if (state.phase === "choosing") {
      this.menu.show(state, this.yourSide, false);
    } else if (state.phase === "await-switch" && state.mustSwitch.includes(this.yourSide)) {
      this.menu.show(state, this.yourSide, true);
    }
  }

  private sendAction(action: BattleAction): void {
    this.battleRoom?.send(ClientMessage.BattleAct, { action } satisfies BattleActIntent);
  }

  private async handleEnded(payload: BattleEndedPayload): Promise<void> {
    if (this.finished) return;
    this.menu.hide();
    // On a successful run the "Got away safely!" line is already shown by the
    // run event animation, so don't overwrite it with a duplicate.
    if (!payload.ranAway) {
      const text =
        payload.winner === null
          ? "The battle ended in a draw."
          : payload.winner === payload.yourSide
            ? "You won the battle!"
            : "You were defeated...";
      this.log.set(text);
    }
    this.time.delayedCall(2200, () => this.finish());
  }

  /** Leave the battle, tell the world we're done, and resume the overworld. */
  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.menu.destroy();
    try {
      this.worldRoom.send(ClientMessage.BattleConcluded, {});
    } catch (err) {
      console.warn("[battle] could not notify world room:", err);
    }
    void this.battleRoom?.leave();
    this.scene.wake("world");
    this.scene.stop();
  }
}
