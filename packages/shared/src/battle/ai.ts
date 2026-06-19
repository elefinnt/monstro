/**
 * Opponent AI. This is just another way to produce a `BattleAction`, so a wild
 * monster or NPC trainer slots into the exact same engine as a human player.
 */
import type { BattleAction, BattleState } from "./types.js";
import { moveById } from "./data/index.js";
import { effectivenessAgainst } from "./data/typeChart.js";
import { speciesById } from "./data/index.js";
import { activeMonster } from "./factory.js";
import type { Rng } from "./rng.js";

/** Pick this side's move for the turn. Favours type-effective, higher-power moves. */
export function chooseAiAction(state: BattleState, sideIndex: number, rng: Rng): BattleAction {
  const side = state.sides[sideIndex];
  const foe = state.sides[(sideIndex ^ 1) as 0 | 1];
  const foeTypes = speciesById(activeMonster(foe).speciesId)?.types ?? ["normal"];

  const usable = activeMonster(side).moves.filter((m) => m.pp > 0);
  const pool = usable.length > 0 ? usable : activeMonster(side).moves;

  let best: { moveId: string; score: number } | undefined;
  for (const slot of pool) {
    const def = moveById(slot.moveId);
    if (!def) continue;
    const eff = effectivenessAgainst(def.type, foeTypes);
    // A little jitter so the AI isn't perfectly predictable.
    const score = def.power * eff + rng.range(0, 5);
    if (!best || score > best.score) best = { moveId: slot.moveId, score };
  }

  return { kind: "move", moveId: best?.moveId ?? pool[0]?.moveId ?? "tackle" };
}

/** Pick a replacement after a faint: the first living party member. */
export function chooseAiSwitch(state: BattleState, sideIndex: number): number {
  const side = state.sides[sideIndex];
  const idx = side.party.findIndex((m, i) => i !== side.activeIndex && m.currentHp > 0);
  return idx === -1 ? side.activeIndex : idx;
}
