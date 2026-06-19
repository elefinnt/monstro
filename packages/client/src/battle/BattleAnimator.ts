import Phaser from "phaser";
import type { BattleEvent, BattleState, MonsterInstance } from "@monstro/shared";
import type { BattleHud } from "./BattleHud.js";
import type { BattleLog } from "./BattleLog.js";

const TEXT_PAUSE_MS = 850;

/**
 * Plays an ordered `BattleEvent[]` as on-screen animation: log lines, HP bar
 * tweens, faints and switches. The authoritative outcome is the post-turn
 * state; this purely presents what happened.
 */
export class BattleAnimator {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly huds: [BattleHud, BattleHud],
    private readonly log: BattleLog,
    private readonly yourSide: number,
  ) {}

  /** Animate every event in order. Resolves once the queue is drained. */
  async play(events: BattleEvent[], state: BattleState): Promise<void> {
    const byUid = this.indexMonsters(state);

    for (const event of events) {
      await this.playOne(event, byUid);
    }
  }

  private async playOne(event: BattleEvent, byUid: Map<string, MonsterInstance>): Promise<void> {
    switch (event.kind) {
      case "turn-start":
        return;
      case "message":
        this.log.set(event.text);
        return this.wait(TEXT_PAUSE_MS);
      case "move-used": {
        const name = byUid.get(event.monsterUid)?.name ?? "It";
        this.log.set(`${this.label(event.side)}${name} used ${event.moveName}!`);
        return this.wait(TEXT_PAUSE_MS);
      }
      case "move-missed":
        this.log.set("But it missed!");
        return this.wait(TEXT_PAUSE_MS);
      case "damage": {
        await this.huds[event.side].animateHp(event.remainingHp);
        const note = effectivenessNote(event.effectiveness, event.crit);
        if (note) {
          this.log.set(note);
          await this.wait(TEXT_PAUSE_MS);
        }
        return;
      }
      case "faint":
        this.log.set(`${this.label(event.side)}${event.name} fainted!`);
        await this.huds[event.side].animateFaint();
        return this.wait(TEXT_PAUSE_MS);
      case "switch": {
        const monster = byUid.get(event.toUid);
        if (monster) this.huds[event.side].setMonster(monster);
        const verb = event.side === this.yourSide ? "Go!" : "Foe sent out";
        this.log.set(`${verb} ${event.toName}!`);
        return this.wait(TEXT_PAUSE_MS);
      }
      case "run":
        this.log.set(event.success ? "Got away safely!" : "Couldn't escape!");
        return this.wait(TEXT_PAUSE_MS);
      case "battle-end":
        return;
    }
  }

  /** Prefix used to disambiguate whose monster an event refers to. */
  private label(side: number): string {
    return side === this.yourSide ? "" : "Foe ";
  }

  private indexMonsters(state: BattleState): Map<string, MonsterInstance> {
    const map = new Map<string, MonsterInstance>();
    for (const side of state.sides) {
      for (const monster of side.party) map.set(monster.uid, monster);
    }
    return map;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.scene.time.delayedCall(ms, () => resolve());
    });
  }
}

function effectivenessNote(effectiveness: number, crit: boolean): string | undefined {
  if (effectiveness === 0) return "It had no effect...";
  if (crit) return "A critical hit!";
  if (effectiveness > 1) return "It's super effective!";
  if (effectiveness < 1) return "It's not very effective...";
  return undefined;
}
