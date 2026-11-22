# Public Opinion

Public Opinion is a browser party game for 4–12 players. See [AGENTS.md](./AGENTS.md) for game rules and implementation requirements.

## Local playtesting

These are the planned workflows. The app's startup commands, port, and test scripts will be added once the app is scaffolded.

### One computer, four players

1. Start the local app and PostgreSQL.
2. Open the local game URL in four separate browser profiles. Give each profile its own window so you can switch between players quickly. Ordinary tabs in one profile share browser storage, as do multiple private windows in some browsers.
3. Create a room in one window. Join using the same room code and a different screen name in each of the other three windows.
4. Start the match. Refresh one window mid-turn to check that it returns to the same seat and shows the player's last accepted action.

### Desktop and phone in one room

1. Connect both devices to the same Wi-Fi network. Start the local app in LAN mode so the game server listens on `0.0.0.0`. Only the web app and its WebSocket endpoint need to be reachable from the phone.
2. Find your computer's local IP address in its network settings. On both devices, visit the same LAN URL, for example `http://192.168.1.42:3000`. Substitute your actual IP address and app port.
3. Create a room on the desktop and join it from the phone with the room code. To meet the four-player minimum, join from two more isolated desktop profiles or invite two more devices.

If the phone cannot load the URL, check the server bind address, host firewall, and whether the Wi-Fi isolates devices, as some guest networks do. If the page loads but the room won't connect, check that the app connects to the WebSocket endpoint on the page's host. A phone's `localhost` points to the phone itself. For devices that can't reach each other over the LAN, use the hosted playtest URL once available.

### Automated multiplayer tests

The planned Playwright harness will create at least four isolated browser contexts. Run it headed to watch the players or headless for repeatable checks. Use controlled card draws and a test clock for rule tests. Use the normal timers when manually checking how the game feels. The first multiplayer scenario should verify Modifier privacy, vote moves, and refresh recovery.
