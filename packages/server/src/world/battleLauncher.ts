/**
 * Bridges the overworld to a BattleRoom. Builds the battle configuration from
 * the player(s) involved, spins up a dedicated room via the Colyseus
 * matchmaker, and reserves a seat per participant. The returned payload is sent
 * to the client, which consumes the reservation to join the battle.
 *
 * PvE (wild) and PvP go through the same room type; only the side composition
 * differs (one AI side vs. two human sides).
 */
import { matchMaker } from "colyseus";
import {
  randomSeed,
  createRng,
  pickEncounter,
  speciesById,
  type BattleRoomOptions,
  type BattleSideInit,
  type BattleJoinOptions,
  type BattleStartPayload,
} from "@monstro/shared";
import type { PlayerState } from "../schema/PlayerState.js";

/** Level of the player's monster until party persistence exists (DB-managed). */
const PLAYER_MONSTER_LEVEL = 5;

function humanSide(player: PlayerState): BattleSideInit {
  return {
    actor: "human",
    sessionId: player.id,
    trainerName: player.username,
    party: [{ speciesId: player.starterId, level: PLAYER_MONSTER_LEVEL }],
  };
}

/**
 * Create a wild (PvE) battle for `player`. Returns the handshake payload, or
 * `null` if the map has no encounter table or the species roll failed.
 */
export async function startWildBattle(
  player: PlayerState,
): Promise<BattleStartPayload | null> {
  const seed = randomSeed();
  const encounter = pickEncounter(player.mapId, createRng(seed));
  if (!encounter) return null;

  const wildName = speciesById(encounter.speciesId)?.name ?? "Wild Monster";
  const options: BattleRoomOptions = {
    kind: "wild",
    seed,
    sides: [
      humanSide(player),
      {
        actor: "ai",
        trainerName: `Wild ${wildName}`,
        party: [{ speciesId: encounter.speciesId, level: encounter.level }],
      },
    ],
  };

  const room = await matchMaker.createRoom("battle", options);
  const reservation = await matchMaker.reserveSeatFor(room, { side: 0 } satisfies BattleJoinOptions);
  return { reservation, side: 0, kind: "wild" };
}

/** Create a PvP battle between two players. Returns a payload for each. */
export async function startPvpBattle(
  challenger: PlayerState,
  opponent: PlayerState,
): Promise<{ challenger: BattleStartPayload; opponent: BattleStartPayload }> {
  const seed = randomSeed();
  const options: BattleRoomOptions = {
    kind: "pvp",
    seed,
    sides: [humanSide(challenger), humanSide(opponent)],
  };

  const room = await matchMaker.createRoom("battle", options);
  const resA = await matchMaker.reserveSeatFor(room, { side: 0 } satisfies BattleJoinOptions);
  const resB = await matchMaker.reserveSeatFor(room, { side: 1 } satisfies BattleJoinOptions);

  return {
    challenger: { reservation: resA, side: 0, kind: "pvp" },
    opponent: { reservation: resB, side: 1, kind: "pvp" },
  };
}
