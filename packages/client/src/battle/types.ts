/** Client-side mirror of the BattleRoom's (minimal) synced schema. */
export interface BattleRoomView {
  battleId: string;
  kind: string;
  phase: string;
  turn: number;
}

/** Visual tint per elemental type, used for placeholder monster bodies. */
export const TYPE_COLOURS: Record<string, number> = {
  normal: 0xb0a878,
  fire: 0xf08030,
  water: 0x6890f0,
  grass: 0x78c850,
  electric: 0xf8d030,
};
