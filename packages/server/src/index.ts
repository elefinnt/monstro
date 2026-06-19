/** Colyseus bootstrap. Defines rooms and starts the WebSocket server. */

import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { WorldRoom } from "./rooms/WorldRoom.js";
import { BattleRoom } from "./rooms/BattleRoom.js";

const PORT = Number(process.env.PORT ?? 2567);

const gameServer = new Server({
  transport: new WebSocketTransport(),
});

gameServer.define("world", WorldRoom);
gameServer.define("battle", BattleRoom);

gameServer
  .listen(PORT)
  .then(() => console.log(`[monstro] Colyseus listening on ws://localhost:${PORT}`))
  .catch((err) => {
    console.error("[monstro] failed to start server:", err);
    process.exit(1);
  });
