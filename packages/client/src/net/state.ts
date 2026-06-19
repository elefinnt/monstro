/**
 * Lightweight client-side mirrors of the server schema shapes. The actual
 * decoded objects come from colyseus.js; these interfaces give us typing without
 * importing the server's decorator classes.
 */

import type { MapSchema } from "@colyseus/schema";
import type { Direction } from "@monstro/shared";

export interface PlayerView {
  id: string;
  username: string;
  tx: number;
  ty: number;
  facing: Direction;
  moving: boolean;
  battling: boolean;
}

/**
 * Typing the players map as a `MapSchema` lets `getStateCallbacks` expose the
 * collection callbacks (`onAdd`/`onRemove`) with proper item typing.
 */
export interface WorldView {
  mapId: string;
  players: MapSchema<PlayerView>;
}
