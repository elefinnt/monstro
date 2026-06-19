/**
 * Deterministic, seedable pseudo-random number generator (mulberry32).
 *
 * Every random decision in a battle (damage variance, crits, accuracy, wild
 * species/levels, run attempts) MUST flow through one of these so the same seed
 * always produces the same battle. This is what lets the server be authoritative
 * while the client can replay/predict the exact same outcome, and makes the
 * engine trivially unit-testable.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Integer in [min, max] (both inclusive). */
  range(min: number, max: number): number;
  /** True with probability p (0..1). */
  chance(p: number): boolean;
  /** A random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
}

/** Create an RNG from a 32-bit unsigned integer seed. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (maxExclusive: number): number => Math.floor(next() * maxExclusive);

  return {
    next,
    int,
    range: (min, max) => min + int(max - min + 1),
    chance: (p) => next() < p,
    pick: (items) => items[int(items.length)],
  };
}

/** A reasonable random 32-bit seed (for kicking off a fresh battle). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
