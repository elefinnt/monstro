/** Damage calculation: a trimmed-down version of the mainline formula. */
import type { MonsterInstance, MoveDef } from "./types.js";
import { speciesById } from "./data/index.js";
import { effectivenessAgainst } from "./data/typeChart.js";
import type { Rng } from "./rng.js";

export interface DamageResult {
  /** HP removed (already clamped to >= 0; 0 when it had no effect). */
  amount: number;
  /** Type multiplier (0, 0.25, 0.5, 1, 2, 4). */
  effectiveness: number;
  crit: boolean;
}

const CRIT_CHANCE = 1 / 16;
const CRIT_MULTIPLIER = 1.5;

/** Compute the damage `move` from `attacker` deals to `defender`. */
export function computeDamage(
  attacker: MonsterInstance,
  defender: MonsterInstance,
  move: MoveDef,
  rng: Rng,
): DamageResult {
  const defenderSpecies = speciesById(defender.speciesId);
  const attackerSpecies = speciesById(attacker.speciesId);
  const defenderTypes = defenderSpecies?.types ?? ["normal"];
  const attackerTypes = attackerSpecies?.types ?? ["normal"];

  const effectiveness = effectivenessAgainst(move.type, defenderTypes);
  if (effectiveness === 0 || move.power <= 0) {
    return { amount: 0, effectiveness, crit: false };
  }

  const atk = move.category === "physical" ? attacker.stats.atk : attacker.stats.spAtk;
  const def = move.category === "physical" ? defender.stats.def : defender.stats.spDef;

  const base =
    Math.floor(
      Math.floor((Math.floor((2 * attacker.level) / 5 + 2) * move.power * atk) / def) / 50,
    ) + 2;

  const crit = rng.chance(CRIT_CHANCE);
  const stab = attackerTypes.includes(move.type) ? 1.5 : 1;
  const variance = rng.range(85, 100) / 100;

  const amount = Math.max(
    1,
    Math.floor(base * stab * effectiveness * (crit ? CRIT_MULTIPLIER : 1) * variance),
  );

  return { amount, effectiveness, crit };
}
