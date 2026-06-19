import { Room, type Client } from "colyseus";
import {
  ServerMessage,
  ClientMessage,
  createRng,
  createMonster,
  makeSide,
  createBattle,
  resolveTurn,
  applyForcedSwitch,
  chooseAiAction,
  chooseAiSwitch,
  isLegalAction,
  type Rng,
  type BattleState,
  type BattleAction,
  type BattleRoomOptions,
  type BattleJoinOptions,
  type BattleActIntent,
  type BattleSnapshotPayload,
  type BattleEventsPayload,
  type BattleEndedPayload,
} from "@monstro/shared";
import { BattleRoomState } from "../schema/BattleRoomState.js";

/** Delay before tearing the room down after the battle ends (lets clients read). */
const DISPOSE_DELAY_MS = 8000;

/**
 * Hosts a single battle. The authoritative simulation is the pure engine from
 * `@monstro/shared`; this room only collects actions and broadcasts the
 * resulting state/events. PvE and PvP are the SAME code path — the only
 * difference is whether a side's actions come from a connected client (human)
 * or are produced by the AI. Wild battles have one human seat; PvP has two.
 */
export class BattleRoom extends Room<BattleRoomState> {
  private engine!: BattleState;
  private rng!: Rng;
  /** Action chosen this turn, keyed by side index (0 | 1). */
  private readonly pending = new Map<number, BattleAction>();
  /** Map a connected client's session id to the side it controls. */
  private readonly sideOf = new Map<string, number>();

  onCreate(options: BattleRoomOptions): void {
    this.state = new BattleRoomState();
    this.rng = createRng(options.seed);
    this.maxClients = options.kind === "pvp" ? 2 : 1;

    const sides = options.sides.map((init, i) => {
      const party = init.party.map((p) => createMonster(p.speciesId, p.level, p.nickname));
      return makeSide(i as 0 | 1, init.actor, init.trainerName, party, init.sessionId);
    });
    this.engine = createBattle(this.roomId, options.kind, sides[0], sides[1]);
    this.syncMeta();

    this.onMessage<BattleActIntent>(ClientMessage.BattleAct, (client, msg) =>
      this.handleAction(client, msg),
    );
  }

  onJoin(client: Client, options?: BattleJoinOptions): void {
    const side = options?.side ?? 0;
    this.sideOf.set(client.sessionId, side);
    this.sendSnapshot(client);
  }

  onLeave(client: Client): void {
    this.sideOf.delete(client.sessionId);
    // If a human bails mid-battle, the engine simply stops being driven; the
    // room auto-disposes once empty. (A forfeit/timeout could be added here.)
  }

  /** Record a client's chosen action, then try to advance the battle. */
  private handleAction(client: Client, msg: BattleActIntent): void {
    const side = this.sideOf.get(client.sessionId);
    if (side === undefined || !msg?.action) return;
    if (!isLegalAction(this.engine, side, msg.action)) return;

    this.pending.set(side, msg.action);
    this.advance();
  }

  /**
   * Drive the battle forward as far as the currently-collected actions allow:
   * fill in AI choices, resolve a full turn when both sides have committed, and
   * process forced switches after faints.
   */
  private advance(): void {
    if (this.engine.phase === "ended") return;

    if (this.engine.phase === "choosing") {
      this.fillAiChoices();
      const a0 = this.pending.get(0);
      const a1 = this.pending.get(1);
      if (!a0 || !a1) return;

      const result = resolveTurn(this.engine, [a0, a1], this.rng);
      this.engine = result.state;
      this.pending.clear();
      this.broadcast(ServerMessage.BattleEvents, {
        events: result.events,
        state: this.engine,
      } satisfies BattleEventsPayload);
      this.afterTransition();
      return;
    }

    if (this.engine.phase === "await-switch") {
      this.fillAiSwitches();
      for (const side of [...this.engine.mustSwitch]) {
        const action = this.pending.get(side);
        if (!action || action.kind !== "switch") continue;
        const result = applyForcedSwitch(this.engine, side, action.partyIndex, this.rng);
        this.engine = result.state;
        this.pending.delete(side);
        this.broadcast(ServerMessage.BattleEvents, {
          events: result.events,
          state: this.engine,
        } satisfies BattleEventsPayload);
      }
      this.afterTransition();
    }
  }

  /** React to the phase produced by the last transition. */
  private afterTransition(): void {
    this.syncMeta();
    if (this.engine.phase === "ended") {
      this.endBattle();
      return;
    }
    // Auto-resolve AI-only obligations (e.g. an AI side that must switch).
    if (this.engine.phase === "await-switch" && this.allObligationsAreAi()) {
      this.advance();
    }
  }

  /** Give every AI side a move for the current turn (if it lacks one). */
  private fillAiChoices(): void {
    this.engine.sides.forEach((side, i) => {
      if (side.actor === "ai" && !this.pending.has(i)) {
        this.pending.set(i, chooseAiAction(this.engine, i, this.rng));
      }
    });
  }

  /** Give every AI side that must switch a replacement choice. */
  private fillAiSwitches(): void {
    for (const i of this.engine.mustSwitch) {
      const side = this.engine.sides[i];
      if (side.actor === "ai" && !this.pending.has(i)) {
        this.pending.set(i, { kind: "switch", partyIndex: chooseAiSwitch(this.engine, i) });
      }
    }
  }

  /** True if every side still owing a switch is AI-controlled. */
  private allObligationsAreAi(): boolean {
    return this.engine.mustSwitch.every((i) => this.engine.sides[i].actor === "ai");
  }

  private endBattle(): void {
    for (const client of this.clients) {
      const yourSide = this.sideOf.get(client.sessionId) ?? 0;
      client.send(ServerMessage.BattleEnded, {
        winner: this.engine.winner,
        ranAway: this.engine.ranAway,
        yourSide,
      } satisfies BattleEndedPayload);
    }
    this.clock.setTimeout(() => this.disconnect(), DISPOSE_DELAY_MS);
  }

  private sendSnapshot(client: Client): void {
    client.send(ServerMessage.BattleSnapshot, {
      state: this.engine,
      yourSide: this.sideOf.get(client.sessionId) ?? 0,
    } satisfies BattleSnapshotPayload);
  }

  private syncMeta(): void {
    this.state.battleId = this.engine.battleId;
    this.state.kind = this.engine.kind;
    this.state.phase = this.engine.phase;
    this.state.turn = this.engine.turn;
  }
}
