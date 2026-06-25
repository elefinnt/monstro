import { Client, type Room } from "colyseus.js";
import { DEFAULT_MAP_ID, type WorldJoinOptions } from "@monstro/shared";
import { SERVER_URL } from "../config.js";
import type { WorldView } from "./state.js";

const STATE_SYNC_TIMEOUT_MS = 10_000;

/** Connect to the Colyseus server and join (or create) the shared WorldRoom. */
export async function connectToWorld(
  options: WorldJoinOptions,
): Promise<Room<WorldView>> {
  const client = new Client(SERVER_URL);
  const room = await client.joinOrCreate<WorldView>("world", options);
  await waitForWorldReady(room);
  return room;
}

/**
 * `joinOrCreate` resolves once the WebSocket handshake completes, but the first
 * schema patch (including `players`) can arrive a tick later. WorldScene reads
 * state immediately on create, so wait until the local player entry exists.
 */
function waitForWorldReady(room: Room<WorldView>): Promise<void> {
  const ready = (): boolean =>
    room.state?.players?.get(room.sessionId) !== undefined;

  if (ready()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      room.onStateChange.remove(onChange);
      reject(new Error("Timed out waiting for world state to sync"));
    }, STATE_SYNC_TIMEOUT_MS);

    const onChange = (): void => {
      if (!ready()) return;
      window.clearTimeout(timeout);
      room.onStateChange.remove(onChange);
      resolve();
    };

    room.onStateChange(onChange);
  });
}

/** Safe map id when schema has not fully decoded yet (should not happen after sync). */
export function resolveInitialMapId(room: Room<WorldView>): string {
  const me = room.state?.players?.get(room.sessionId);
  return me?.mapId || room.state?.mapId || DEFAULT_MAP_ID;
}
