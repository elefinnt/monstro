/**
 * Wild-encounter tables and roll helpers. Keyed by map id; stepping onto a tall
 * grass tile rolls against the per-step rate, then (on a hit) picks a species
 * and level from that map's table. All randomness flows through an `Rng` so the
 * server stays authoritative and deterministic.
 */
import type { Rng } from "./rng.js";

export interface EncounterEntry {
  speciesId: string;
  minLevel: number;
  maxLevel: number;
  /** Relative weight within the table (need not sum to anything in particular). */
  weight: number;
}

export interface EncounterTable {
  /** Per-step chance of triggering a battle while in grass (0..1). */
  rate: number;
  entries: readonly EncounterEntry[];
}

const TABLES: Record<string, EncounterTable> = {
  route: {
    rate: 0.12,
    entries: [
      { speciesId: "bugbit", minLevel: 2, maxLevel: 5, weight: 45 },
      { speciesId: "pebblet", minLevel: 2, maxLevel: 4, weight: 35 },
      { speciesId: "sparkit", minLevel: 3, maxLevel: 5, weight: 20 },
    ],
  },
};

/** The encounter table for a map, if any grass battles can happen there. */
export function encounterTable(mapId: string): EncounterTable | undefined {
  return TABLES[mapId];
}

/** Roll whether a step in grass triggers a wild battle on this map. */
export function rollEncounter(mapId: string, rng: Rng): boolean {
  const table = TABLES[mapId];
  if (!table) return false;
  return rng.chance(table.rate);
}

/** Pick a species + level for a wild encounter on this map. */
export function pickEncounter(
  mapId: string,
  rng: Rng,
): { speciesId: string; level: number } | undefined {
  const table = TABLES[mapId];
  if (!table || table.entries.length === 0) return undefined;

  const total = table.entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng.next() * total;
  for (const entry of table.entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      return { speciesId: entry.speciesId, level: rng.range(entry.minLevel, entry.maxLevel) };
    }
  }
  const last = table.entries[table.entries.length - 1];
  return { speciesId: last.speciesId, level: rng.range(last.minLevel, last.maxLevel) };
}
