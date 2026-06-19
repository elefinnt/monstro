/**
 * The battle engine: pure, deterministic transitions over `BattleState`.
 *
 * Nothing here touches the network, the DOM, or wall-clock time. Given the same
 * state, actions, and `Rng`, it always yields the same next state and the same
 * ordered list of `BattleEvent`s. The server runs this authoritatively; the
 * client may run the very same code to predict/animate.
 */
import type {
  BattleAction,
  BattleEvent,
  BattleSide,
  BattleState,
  EngineResult,
  MonsterInstance,
} from "./types.js";
import { moveById } from "./data/index.js";
import { computeDamage } from "./damage.js";
import { activeMonster, sideDefeated } from "./factory.js";
import type { Rng } from "./rng.js";

/** Deep-clone a state so transitions stay pure (no mutation of the input). */
function clone(state: BattleState): BattleState {
  return structuredClone(state);
}

/** Ordering weight for an action: switches resolve before any attack. */
function actionPriority(action: BattleAction): number {
  if (action.kind === "switch") return 6;
  if (action.kind === "move") return moveById(action.moveId)?.priority ?? 0;
  return 0;
}

/**
 * Resolve a full turn from both sides' chosen actions. Returns the next state
 * (phase `choosing`, `await-switch`, or `ended`) plus the events to animate.
 */
export function resolveTurn(
  state: BattleState,
  actions: [BattleAction, BattleAction],
  rng: Rng,
): EngineResult {
  const next = clone(state);
  const events: BattleEvent[] = [{ kind: "turn-start", turn: next.turn }];

  // Fleeing (wild only) short-circuits the whole turn.
  const runner = actions.findIndex((a) => a.kind === "run");
  if (runner !== -1 && next.kind === "wild") {
    events.push({ kind: "run", side: runner, success: true });
    next.phase = "ended";
    next.ranAway = true;
    next.winner = null;
    events.push({ kind: "battle-end", winner: null, ranAway: true });
    return { state: next, events };
  }

  // Order sides: higher action priority first, then faster active monster.
  const order: Array<0 | 1> = [0, 1];
  order.sort((a, b) => {
    const pa = actionPriority(actions[a]);
    const pb = actionPriority(actions[b]);
    if (pa !== pb) return pb - pa;
    const sa = activeMonster(next.sides[a]).stats.speed;
    const sb = activeMonster(next.sides[b]).stats.speed;
    if (sa !== sb) return sb - sa;
    return rng.chance(0.5) ? -1 : 1;
  });

  for (const sideIndex of order) {
    if (next.phase === "ended") break;
    applyAction(next, sideIndex, actions[sideIndex], events, rng);
  }

  finalisePostTurn(next, events);
  return { state: next, events };
}

/** Apply one side's chosen action, mutating `state` and appending events. */
function applyAction(
  state: BattleState,
  sideIndex: 0 | 1,
  action: BattleAction,
  events: BattleEvent[],
  rng: Rng,
): void {
  const side = state.sides[sideIndex];

  if (action.kind === "switch") {
    performSwitch(side, action.partyIndex, events);
    return;
  }
  if (action.kind === "run") {
    // Run in a context where it can't succeed (e.g. PvP) just wastes the turn.
    events.push({ kind: "run", side: sideIndex, success: false });
    return;
  }

  const attacker = activeMonster(side);
  if (attacker.currentHp <= 0) return; // fainted earlier this turn

  const move = moveById(action.moveId);
  const slot = attacker.moves.find((m) => m.moveId === action.moveId);
  if (!move || !slot) return;
  if (slot.pp > 0) slot.pp -= 1;

  const foeIndex = (sideIndex ^ 1) as 0 | 1;
  const defenderSide = state.sides[foeIndex];
  const defender = activeMonster(defenderSide);

  events.push({
    kind: "move-used",
    side: sideIndex,
    monsterUid: attacker.uid,
    moveId: move.id,
    moveName: move.name,
  });

  if (move.accuracy < 100 && !rng.chance(move.accuracy / 100)) {
    events.push({ kind: "move-missed", side: sideIndex, moveName: move.name });
    return;
  }

  const result = computeDamage(attacker, defender, move, rng);
  defender.currentHp = Math.max(0, defender.currentHp - result.amount);

  events.push({
    kind: "damage",
    side: foeIndex,
    monsterUid: defender.uid,
    amount: result.amount,
    remainingHp: defender.currentHp,
    maxHp: defender.stats.hp,
    effectiveness: result.effectiveness,
    crit: result.crit,
  });

  if (defender.currentHp <= 0) {
    events.push({ kind: "faint", side: foeIndex, monsterUid: defender.uid, name: defender.name });
  }
}

/** Move a side's active monster to `partyIndex` (no validation of legality). */
function performSwitch(side: BattleSide, partyIndex: number, events: BattleEvent[]): void {
  if (!isSwitchable(side.party[partyIndex], side.activeIndex, partyIndex)) return;
  side.activeIndex = partyIndex;
  const now = activeMonster(side);
  events.push({ kind: "switch", side: side.index, toUid: now.uid, toName: now.name });
}

function isSwitchable(
  target: MonsterInstance | undefined,
  currentIndex: number,
  partyIndex: number,
): boolean {
  return Boolean(target) && target!.currentHp > 0 && partyIndex !== currentIndex;
}

/** Decide the phase after a turn: ended, await-switch, or back to choosing. */
function finalisePostTurn(state: BattleState, events: BattleEvent[]): void {
  if (state.phase === "ended") return;

  const lost = state.sides.map((s) => sideDefeated(s));
  if (lost[0] || lost[1]) {
    state.phase = "ended";
    state.winner = lost[0] && lost[1] ? null : lost[0] ? 1 : 0;
    events.push({ kind: "battle-end", winner: state.winner, ranAway: false });
    return;
  }

  const mustSwitch: number[] = [];
  for (const side of state.sides) {
    if (activeMonster(side).currentHp <= 0) mustSwitch.push(side.index);
  }

  if (mustSwitch.length > 0) {
    state.phase = "await-switch";
    state.mustSwitch = mustSwitch;
  } else {
    state.phase = "choosing";
    state.mustSwitch = [];
    state.turn += 1;
  }
}

/**
 * Apply a forced replacement after a faint. When no side still owes a switch,
 * the battle returns to the `choosing` phase for the next turn.
 */
export function applyForcedSwitch(
  state: BattleState,
  sideIndex: number,
  partyIndex: number,
  _rng: Rng,
): EngineResult {
  const next = clone(state);
  const events: BattleEvent[] = [];
  const side = next.sides[sideIndex];

  performSwitch(side, partyIndex, events);
  next.mustSwitch = next.mustSwitch.filter((i) => i !== sideIndex);

  if (next.mustSwitch.length === 0 && next.phase !== "ended") {
    next.phase = "choosing";
    next.turn += 1;
  }

  return { state: next, events };
}

/**
 * Validate that a chosen action is legal for a side right now. Used by the
 * room (and could be reused client-side to grey out illegal options).
 */
export function isLegalAction(state: BattleState, sideIndex: number, action: BattleAction): boolean {
  const side = state.sides[sideIndex];
  if (!side) return false;

  if (action.kind === "run") {
    return state.kind === "wild" && state.phase === "choosing";
  }
  if (action.kind === "switch") {
    const target = side.party[action.partyIndex];
    return isSwitchable(target, side.activeIndex, action.partyIndex);
  }
  // move
  if (state.phase !== "choosing") return false;
  const active = activeMonster(side);
  return active.moves.some((m) => m.moveId === action.moveId);
}
