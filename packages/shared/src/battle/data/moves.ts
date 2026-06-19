/** Static move definitions. The single source of truth for move behaviour. */
import type { MoveDef } from "../types.js";

export const MOVES: readonly MoveDef[] = [
  { id: "tackle", name: "Tackle", type: "normal", category: "physical", power: 40, accuracy: 100, priority: 0, maxPp: 35 },
  { id: "scratch", name: "Scratch", type: "normal", category: "physical", power: 40, accuracy: 100, priority: 0, maxPp: 35 },
  { id: "quick-jab", name: "Quick Jab", type: "normal", category: "physical", power: 40, accuracy: 100, priority: 1, maxPp: 30 },
  { id: "ember", name: "Ember", type: "fire", category: "special", power: 45, accuracy: 100, priority: 0, maxPp: 25 },
  { id: "flame-burst", name: "Flame Burst", type: "fire", category: "special", power: 65, accuracy: 95, priority: 0, maxPp: 15 },
  { id: "water-gun", name: "Water Gun", type: "water", category: "special", power: 45, accuracy: 100, priority: 0, maxPp: 25 },
  { id: "aqua-pulse", name: "Aqua Pulse", type: "water", category: "special", power: 65, accuracy: 95, priority: 0, maxPp: 15 },
  { id: "vine-whip", name: "Vine Whip", type: "grass", category: "physical", power: 45, accuracy: 100, priority: 0, maxPp: 25 },
  { id: "leaf-slash", name: "Leaf Slash", type: "grass", category: "physical", power: 65, accuracy: 95, priority: 0, maxPp: 15 },
  { id: "spark", name: "Spark", type: "electric", category: "special", power: 45, accuracy: 100, priority: 0, maxPp: 25 },
];

const BY_ID = new Map<string, MoveDef>(MOVES.map((m) => [m.id, m]));

export function moveById(id: string): MoveDef | undefined {
  return BY_ID.get(id);
}
