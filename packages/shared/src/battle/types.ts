/**
 * Core battle data model. These are plain, serialisable types with NO engine
 * behaviour and NO dependency on Phaser or Colyseus. The authoritative server
 * and the rendering client both speak in these shapes; the engine
 * (`engine.ts`) transforms a `BattleState` into a new one plus a list of
 * `BattleEvent`s the client animates.
 */

/** Elemental types. Deliberately small for the MVP; extend the type chart too. */
export type ElementType = "normal" | "fire" | "water" | "grass" | "electric";

/** Physical moves use atk/def; special moves use spAtk/spDef. */
export type MoveCategory = "physical" | "special";

/** The six battle stats. */
export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

/** Static definition of a move (shared data, never mutated). */
export interface MoveDef {
  id: string;
  name: string;
  type: ElementType;
  category: MoveCategory;
  /** Base power. */
  power: number;
  /** Accuracy 0..100; 100 (or more) never misses. */
  accuracy: number;
  /** Higher resolves first regardless of speed. 0 is normal. */
  priority: number;
  /** Power points (uses) the move starts with. */
  maxPp: number;
}

/** Static definition of a monster species (shared data, never mutated). */
export interface SpeciesDef {
  id: string;
  name: string;
  types: ElementType[];
  baseStats: Stats;
  /** Move ids this species can know. */
  learnset: string[];
}

/** A known move on a specific monster instance (tracks remaining PP). */
export interface MoveSlot {
  moveId: string;
  pp: number;
  maxPp: number;
}

/**
 * A concrete monster owned by a trainer (or generated for a wild encounter).
 * `stats` are the computed maximums for this level; `currentHp` is the live HP.
 */
export interface MonsterInstance {
  /** Unique id within a single battle (so events can target a monster). */
  uid: string;
  speciesId: string;
  /** Display name (nickname or species name). */
  name: string;
  level: number;
  stats: Stats;
  currentHp: number;
  moves: MoveSlot[];
}

/** Who controls a side: a connected client, or the server AI. */
export type ActorKind = "human" | "ai";

/** One competitor in a battle (a trainer and their party). */
export interface BattleSide {
  index: 0 | 1;
  actor: ActorKind;
  /** Session id of the controlling client (humans only). */
  sessionId?: string;
  trainerName: string;
  party: MonsterInstance[];
  /** Index into `party` of the monster currently in play. */
  activeIndex: number;
}

/**
 * - `choosing`: both sides pick an action for the turn.
 * - `resolving`: transient; the engine is applying a turn (never persisted).
 * - `await-switch`: one or more sides must send in a replacement after a faint.
 * - `ended`: the battle is over (see `winner` / `ranAway`).
 */
export type BattlePhase = "choosing" | "await-switch" | "ended";

/** A complete, serialisable battle snapshot. */
export interface BattleState {
  battleId: string;
  kind: "wild" | "pvp";
  /** 1-based turn counter. */
  turn: number;
  phase: BattlePhase;
  sides: [BattleSide, BattleSide];
  /** Side indices that must choose a replacement (only when await-switch). */
  mustSwitch: number[];
  /** Winning side index when ended, or null (draw or fled). */
  winner: number | null;
  /** True if the battle ended because a side successfully fled. */
  ranAway: boolean;
}

/** A turn action chosen by a side. */
export type BattleAction =
  | { kind: "move"; moveId: string }
  | { kind: "switch"; partyIndex: number }
  | { kind: "run" };

/**
 * Things that happened during a turn, in order. The client renders these as an
 * animation queue (text lines, HP tweens, faints). The authoritative state is
 * the post-turn `BattleState`; events are purely for presentation.
 */
export type BattleEvent =
  | { kind: "turn-start"; turn: number }
  | { kind: "move-used"; side: number; monsterUid: string; moveId: string; moveName: string }
  | { kind: "move-missed"; side: number; moveName: string }
  | {
      kind: "damage";
      side: number;
      monsterUid: string;
      amount: number;
      remainingHp: number;
      maxHp: number;
      /** Type-effectiveness multiplier applied (0, 0.25, 0.5, 1, 2, 4). */
      effectiveness: number;
      crit: boolean;
    }
  | { kind: "faint"; side: number; monsterUid: string; name: string }
  | { kind: "switch"; side: number; toUid: string; toName: string }
  | { kind: "run"; side: number; success: boolean }
  | { kind: "battle-end"; winner: number | null; ranAway: boolean }
  | { kind: "message"; text: string };

/** The result of any engine transition: the next state plus events to play. */
export interface EngineResult {
  state: BattleState;
  events: BattleEvent[];
}
