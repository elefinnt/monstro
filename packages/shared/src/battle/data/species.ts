/**
 * Static species definitions. The three starters share their ids with the lab
 * starters (see `starters.ts`) so a chosen starter maps straight to a species.
 */
import type { SpeciesDef } from "../types.js";

export const SPECIES: readonly SpeciesDef[] = [
  {
    id: "ember",
    name: "Ember",
    types: ["fire"],
    baseStats: { hp: 39, atk: 52, def: 43, spAtk: 60, spDef: 50, speed: 65 },
    learnset: ["scratch", "ember", "quick-jab", "flame-burst"],
  },
  {
    id: "sprout",
    name: "Sprout",
    types: ["grass"],
    baseStats: { hp: 45, atk: 49, def: 49, spAtk: 65, spDef: 65, speed: 45 },
    learnset: ["tackle", "vine-whip", "leaf-slash"],
  },
  {
    id: "ripple",
    name: "Ripple",
    types: ["water"],
    baseStats: { hp: 44, atk: 48, def: 65, spAtk: 50, spDef: 64, speed: 43 },
    learnset: ["tackle", "water-gun", "aqua-pulse"],
  },
  {
    id: "bugbit",
    name: "Bugbit",
    types: ["grass"],
    baseStats: { hp: 40, atk: 35, def: 30, spAtk: 20, spDef: 20, speed: 50 },
    learnset: ["tackle", "vine-whip"],
  },
  {
    id: "pebblet",
    name: "Pebblet",
    types: ["normal"],
    baseStats: { hp: 50, atk: 45, def: 50, spAtk: 25, spDef: 25, speed: 30 },
    learnset: ["tackle", "scratch"],
  },
  {
    id: "sparkit",
    name: "Sparkit",
    types: ["electric"],
    baseStats: { hp: 38, atk: 30, def: 32, spAtk: 45, spDef: 40, speed: 70 },
    learnset: ["quick-jab", "spark"],
  },
];

const BY_ID = new Map<string, SpeciesDef>(SPECIES.map((s) => [s.id, s]));

export function speciesById(id: string): SpeciesDef | undefined {
  return BY_ID.get(id);
}
