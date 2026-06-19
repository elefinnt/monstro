/**
 * Battle UI palette — ported 1:1 from the GBA/Emerald-style design spec.
 *
 * Phaser shapes want numeric colours (0xRRGGBB) while `Text` wants CSS strings
 * ("#rrggbb"), so each colour is exposed in both forms: `HEX` (strings) and
 * `NUM` (numbers). Keep these the single source of truth — do not re-introduce
 * raw colour literals in the battle modules.
 */

/** Canonical CSS hex strings (use for `Text` colour and any DOM-facing code). */
export const HEX = {
  appBg: "#0b1020",
  boxFill: "#fdfdf5",
  boxOutline: "#1b1b1b",
  player: "#4f9dff",
  opponent: "#ff6b6b",
  hpGreen: "#5cb85c",
  hpGreenDark: "#3a8a3a",
  hpYellow: "#f0c94a",
  hpYellowDark: "#c79c1f",
  hpRed: "#e8534a",
  hpRedDark: "#a8332c",
  hpTrack: "#2b2b22",
  hpTrackEdge: "#3a3a2e",
  expBlue: "#5db3f5",
  expBlueDark: "#2e7fc7",
  expTrack: "#1f1f18",
  cursorRed: "#e8534a",
  skyTop: "#bfe6ee",
  skyBottom: "#9fd3e0",
  groundPlayer: "#cdd98a",
  groundPlayerEdge: "#a9b96a",
  groundOpponent: "#b7d490",
  groundOpponentEdge: "#92b06e",
  typeFire: "#ef8030",
  typeGrass: "#5cab4f",
  typeWater: "#4f9de0",
  typeNormal: "#9a9a82",
  typeElectric: "#f8d030",
  white: "#ffffff",
  disabled: "#6b7280",
} as const;

type HexKey = keyof typeof HEX;

/** Convert a "#rrggbb" string to a Phaser numeric colour. */
export function toNum(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

/** Numeric (0xRRGGBB) variants for Phaser shapes, keyed identically to HEX. */
export const NUM = Object.fromEntries(
  Object.entries(HEX).map(([key, value]) => [key, toNum(value)]),
) as Record<HexKey, number>;

/** Per-element type badge colour (CSS string), matching the move's type. */
export const TYPE_HEX: Record<string, string> = {
  normal: HEX.typeNormal,
  fire: HEX.typeFire,
  water: HEX.typeWater,
  grass: HEX.typeGrass,
  electric: HEX.typeElectric,
};

/** Per-element type colour as a Phaser number (for sprite tints/shapes). */
export const TYPE_NUM: Record<string, number> = Object.fromEntries(
  Object.entries(TYPE_HEX).map(([key, value]) => [key, toNum(value)]),
);
