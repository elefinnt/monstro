/**
 * Type-effectiveness multipliers. `TYPE_CHART[attacking][defending]` gives the
 * multiplier applied to damage. Missing entries default to 1 (neutral).
 */
import type { ElementType } from "../types.js";

type Chart = Partial<Record<ElementType, Partial<Record<ElementType, number>>>>;

const CHART: Chart = {
  fire: { grass: 2, water: 0.5, fire: 0.5 },
  water: { fire: 2, grass: 0.5, water: 0.5 },
  grass: { water: 2, fire: 0.5, grass: 0.5 },
  electric: { water: 2, grass: 0.5, electric: 0.5 },
  normal: {},
};

/** Effectiveness of one attacking type against a single defending type. */
export function typeMultiplier(attacking: ElementType, defending: ElementType): number {
  return CHART[attacking]?.[defending] ?? 1;
}

/** Combined effectiveness of an attacking type against a (possibly dual) type. */
export function effectivenessAgainst(
  attacking: ElementType,
  defendingTypes: readonly ElementType[],
): number {
  return defendingTypes.reduce((acc, t) => acc * typeMultiplier(attacking, t), 1);
}
