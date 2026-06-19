/**
 * Battle screen layout — every position/size is in the fixed internal GBA
 * canvas space (240x160). The battle camera integer-scales this region up to
 * fill the window (see `fitCamera` in BattleScene), so these numbers are the
 * single source of truth and map 1:1 to the design spec.
 */

/** Internal canvas width (GBA native). */
export const CANVAS_W = 240;
/** Internal canvas height (GBA native). */
export const CANVAS_H = 160;

/** A simple rectangle in canvas space. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Battlefield background bands + platforms. */
export const FIELD = {
  /** Y at which the sky changes from the top band to the bottom band. */
  skySplitY: 58,
  opponentPlatform: { x: 150, y: 64, w: 60, h: 14 } as Rect,
  playerPlatform: { x: 8, y: 100, w: 92, h: 20 } as Rect,
};

/** Centre point + radius of each combatant's body placeholder sprite. */
export const SPRITES = {
  opponent: { cx: 180, cy: 52, r: 18 },
  player: { cx: 54, cy: 88, r: 22 },
};

/** Info-box footprints (top-left origin). */
export const BOXES = {
  opponent: { x: 4, y: 4, w: 112, h: 32 } as Rect,
  player: { x: 110, y: 70, w: 126, h: 40 } as Rect,
};

/** Bottom control strip: message box + (optional) menu panel, all 48px tall. */
export const STRIP = {
  y: CANVAS_H - 48,
  h: 48,
  /** Full-width message box (message-only states). */
  fullWidth: CANVAS_W,
  /** Message box width when sharing the strip with the command menu. */
  messageWidth: 144,
  /** Command menu sits to the right of the narrowed message box. */
  commandWidth: 96,
  /** Move-list panel width (left) + side panel width (right) = 240. */
  moveListWidth: 164,
  moveSideWidth: 76,
};

/** HP/EXP bar dimensions (inner track widths shown inside the info boxes). */
export const BARS = {
  hpWidth: 84,
  hpHeight: 6,
  expWidth: 92,
  expHeight: 3,
};

/** Selection cursor (the red triangle) footprint. */
export const CURSOR = {
  w: 7,
  h: 10,
};

/** Render order. Higher draws on top. */
export const DEPTH = {
  field: 0,
  sprite: 5,
  box: 20,
  bar: 21,
  text: 22,
  message: 30,
  menu: 40,
  cursor: 42,
};
