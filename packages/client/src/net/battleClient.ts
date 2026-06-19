import { Client, type Room } from "colyseus.js";
import { SERVER_URL } from "../config.js";
import type { BattleRoomView } from "../battle/types.js";

/**
 * Join the BattleRoom the server reserved a seat in. The `reservation` arrives
 * (as opaque JSON) in the WorldRoom's `BattleStart` message; we hand it to a
 * fresh Colyseus client which connects straight into the reserved seat.
 */
export async function joinBattle(reservation: unknown): Promise<Room<BattleRoomView>> {
  const client = new Client(SERVER_URL);
  type Reservation = Parameters<Client["consumeSeatReservation"]>[0];
  return client.consumeSeatReservation<BattleRoomView>(reservation as Reservation);
}
