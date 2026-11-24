# Popular Opinion

Popular Opinion is a private-room browser party game for 4–12 players. See [AGENTS.md](./AGENTS.md) for implementation requirements and the [Game Bible](./docs/Game_Bible.md) for the rules and card catalog.

## Start locally

With Node.js 24, pnpm 12.14.0, and Docker Compose available, run from the repository root.

```sh
pnpm install --frozen-lockfile
docker compose up -d --wait
pnpm build
pnpm start
```

Open **http://127.0.0.1:3180**. Create a game in one browser profile and join from three other profiles using the displayed room code. Tabs within one profile share the saved seat. After all four players join, the host chooses 5, 7, or 10 rounds, or a target of 50, 100, or 200 points. Each round gives every player one answering turn. Refresh a player's window during a turn to reclaim the seat and see its last accepted action.

Fastify serves the built Vite client, room API, and WebSocket endpoint on the same origin. Run `pnpm build` again after client changes. Compose exposes PostgreSQL on the host loopback at port 54329. The default database URL is for this local container. Set `DATABASE_URL` to use a different database.

## Develop with hot reload

After installing dependencies and starting PostgreSQL, run `pnpm dev` from the repository root. Open **http://127.0.0.1:5173**. Vite applies React and CSS edits in the browser and proxies room API and WebSocket traffic to Fastify. Server and shared-code edits trigger a Fastify restart, so active rooms follow the normal checkpoint recovery rules.

The dev backend listens on loopback port 3181. Set `PORT` on `pnpm dev` to choose a different backend port.

## LAN playtest

After starting PostgreSQL and building the app, start the server with:

```sh
HOST=0.0.0.0 pnpm start
```

Connect the devices to the same Wi-Fi. Open `http://<host-LAN-IP>:3180` on each device, substituting the computer's local Wi-Fi address. On macOS, find it under **System Settings → Wi-Fi → Details → TCP/IP**. Allow incoming connections on port 3180 if the host firewall prompts you. Create a room on one device and enter its code on the other three devices or isolated browser profiles. Use the same URL on a given device so its browser can find the saved seat.

## Checks

```sh
pnpm build
pnpm test
pnpm test:db
pnpm exec playwright install chromium
pnpm test:e2e
```

Start PostgreSQL before running the database and browser suites. They use the Compose database by default and create randomly coded test matches. Set `TEST_DATABASE_URL` to keep test matches in a separate PostgreSQL database. The Playwright harness starts its own server on port 3100 with shorter phase timers and uses four isolated mobile-sized Chromium contexts. Add `--headed` to the Playwright command to watch the turn.

### Verification on this machine

The local startup, PostgreSQL restart tests, and four-browser test were verified with the default Compose database. The LAN smoke test loaded the landing page and authenticated a WebSocket through the Mac’s LAN address from the Mac itself.

If Compose hangs before starting PostgreSQL, check whether Docker Desktop is responding with `docker info`. A complete quit and relaunch of Docker Desktop restored the engine during local verification.

## Milestone fixtures and assumptions

- The server shuffles the full Game Bible Prompt deck and the answering order at match start. Prompts come from the saved deck without replacement. When the deck runs out, the server reshuffles the full deck. An interrupted turn draws the next Prompt and gets a fresh timer. The server draws independently from the full Persona catalog on each regular or bonus turn. The multiplayer test fixture uses **The Troll**.
- Scoring shows final votes for five seconds and the turn awards and cumulative standings for ten seconds. After a restart, a committed result restores directly into the next scheduled turn, bonus turn, or final standings. Only started matches are checkpointed. Saved one-turn matches retain their original format.
- When multiple players qualify for a tiebreaker, the game records and displays the contenders. The tiebreaker ballot is deferred. If everyone qualifies, the game declares a shared tie.
- This lobby uses an eight-character room code and a browser-held seat token. Screen names are 1–24 characters and unique within the lobby. Answers are limited to 160 characters. The host can start with 4–12 occupied seats when every seat is connected. These are local milestone conventions.
- The interface pairs a desktop-teal backdrop with textured arcade panels.
- Tiebreaker ballots, host transfer, and automatic abandonment are deferred.
