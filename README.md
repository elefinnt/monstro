# Monstro

A multiplayer, Pokémon-Emerald-style 2D game that runs in the browser. Walk a
shared tile world, see other players move in real time, and (soon) encounter,
catch, and battle monsters.

> Private, for-fun project. See `CREDITS.md` for asset licence hygiene.

## Tech stack

| Layer | Choice |
|---|---|
| Language | TypeScript (client + server) |
| Client rendering | Phaser 3 |
| Networking | Colyseus (authoritative server) |
| Server runtime | Node.js |
| Map editor | Tiled (exports JSON) |
| Persistence | SQLite → PostgreSQL via Prisma (later phases) |
| Package manager | pnpm (workspaces) |
| Build/dev | Vite (client), tsx (server) |

The whole project is standardised on **16×16 tiles**. The server is
authoritative: clients send *intents* and the server validates and broadcasts.

## Repo layout

```
packages/
  shared/   types + pure logic shared by client & server
  server/   Colyseus rooms, schema, world/map loading
  client/   Phaser scenes, entities, networking
assets/
  maps/     Tiled .json maps (generated placeholder for now)
scripts/    map generator
```

## Prerequisites

- Node.js 20+ (tested on 24)
- pnpm 10+

## Getting started

```powershell
pnpm install

# (Re)generate the placeholder map if needed
pnpm generate:map

# Run server (Colyseus) and client (Vite) together
pnpm dev
```

Then open the client (Vite prints the URL, usually http://localhost:5173).
Open it in **two browser tabs** to see two players walk around the same world.

Run them separately if you prefer:

```powershell
pnpm dev:server   # ws://localhost:2567
pnpm dev:client   # http://localhost:5173
```

### Controls

- Arrow keys or WASD — move (grid-locked, one tile per step)

## Configuration

Client reads `VITE_SERVER_URL` (defaults to `ws://<host>:2567`). See
`.env.example`. Server reads `PORT` (default `2567`).

## Build & typecheck

```powershell
pnpm typecheck
pnpm build
```

## Roadmap

- **Phase 0** — Skeleton (pnpm workspace, Vite + Colyseus). ✅
- **Phase 1** — Single-player tile world (map render, grid movement, collision). ✅
- **Phase 2** — Multiplayer presence (synced positions, two tabs see each other). ✅
- **Phase 3** — Wild encounters (Tuxemon assets, in-world battle session).
- **Phase 4** — Catching (server catch rolls, DB persistence).
- **Phase 5** — PvP battles (disposable BattleRoom, shared battle logic).
- **Phase 6** — Polish & deploy (accounts, persistence, hosting).

## Database

Persistence arrives in later phases. **The user manages all DB migrations** — the
agent will never run migrations; it will flag when a schema change is needed.
