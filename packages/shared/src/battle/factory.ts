/**
 * Builders that turn static data (species/moves) into live battle instances and
 * assemble a fresh `BattleState`. Pure and deterministic: any randomness (wild
 * species/level rolls) is taken from a passed-in `Rng`.
 */
import type {
  ActorKind,
  BattleSide,
  BattleState,
  MonsterInstance,
  MoveSlot,
  SpeciesDef,
  Stats,
} from "./types.js";
import { speciesById, moveById } from "./data/index.js";
import type { Rng } from "./rng.js";

/** Compute the max stats for a species at a given level (simplified formula). */
export function computeStats(base: Stats, level: number): Stats {
  const calc = (b: number): number => Math.floor((2 * b * level) / 100) + 5;
  return {
    hp: Math.floor((2 * base.hp * level) / 100) + level + 10,
    atk: calc(base.atk),
    def: calc(base.def),
    spAtk: calc(base.spAtk),
    spDef: calc(base.spDef),
    speed: calc(base.speed),
  };
}

/** The (up to four) most advanced moves a species knows by this level. */
function buildMoves(species: SpeciesDef): MoveSlot[] {
  return species.learnset
    .slice(-4)
    .map((id) => moveById(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map((m) => ({ moveId: m.id, pp: m.maxPp, maxPp: m.maxPp }));
}

let uidCounter = 0;
function nextUid(prefix: string): string {
  uidCounter = (uidCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}-${uidCounter}`;
}

/** Create a fresh monster instance of `speciesId` at `level`. */
export function createMonster(speciesId: string, level: number, nickname?: string): MonsterInstance {
  const species = speciesById(speciesId);
  if (!species) throw new Error(`Unknown species: ${speciesId}`);
  const stats = computeStats(species.baseStats, level);
  return {
    uid: nextUid(speciesId),
    speciesId: species.id,
    name: nickname ?? species.name,
    level,
    stats,
    currentHp: stats.hp,
    moves: buildMoves(species),
  };
}

/** Assemble one side of a battle. */
export function makeSide(
  index: 0 | 1,
  actor: ActorKind,
  trainerName: string,
  party: MonsterInstance[],
  sessionId?: string,
): BattleSide {
  return { index, actor, sessionId, trainerName, party, activeIndex: 0 };
}

/** Compose a starting `BattleState` from two prepared sides. */
export function createBattle(
  battleId: string,
  kind: "wild" | "pvp",
  side0: BattleSide,
  side1: BattleSide,
): BattleState {
  return {
    battleId,
    kind,
    turn: 1,
    phase: "choosing",
    sides: [side0, side1],
    mustSwitch: [],
    winner: null,
    ranAway: false,
  };
}

/** The active monster of a side. */
export function activeMonster(side: BattleSide): MonsterInstance {
  return side.party[side.activeIndex];
}

/** True if every monster on the side has fainted. */
export function sideDefeated(side: BattleSide): boolean {
  return side.party.every((m) => m.currentHp <= 0);
}

/** Build a wild monster for an encounter, given a species/level chosen elsewhere. */
export function createWildMonster(speciesId: string, level: number, rng: Rng): MonsterInstance {
  // The rng is threaded through so future variance (IVs, shininess) stays
  // deterministic; level/species are decided by the caller's encounter roll.
  void rng;
  return createMonster(speciesId, level);
}
