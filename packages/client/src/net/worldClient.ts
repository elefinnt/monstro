import { Client, type Room } from "colyseus.js";
import type { WorldJoinOptions } from "@monstro/shared";
import { SERVER_URL } from "../config.js";
import type { WorldView } from "./state.js";

/** Connect to the Colyseus server and join (or create) the shared WorldRoom. */
export async function connectToWorld(
  options: WorldJoinOptions,
): Promise<Room<WorldView>> {
  const client = new Client(SERVER_URL);
  return client.joinOrCreate<WorldView>("world", options);
}
