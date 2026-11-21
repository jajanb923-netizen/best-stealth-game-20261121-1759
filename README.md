# Moonlit Archive — a stealth game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/jajanb923-netizen/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/jajanb923-netizen/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A complete top-down stealth game that runs in a desktop browser from its
own static files, no network request. You are Wren, a night archivist in
the Halcyon Archive: steal the Moonpearl Ledger from each of three halls
and slip out through the green exit — unseen.

Real stealth, not a maze with a timer:

- **Vision cones that react** — wardens patrol routes you can learn; their
  cones are clipped by shelves and crates, fill with suspicion as they see
  you, and turn red when the chase begins.
- **A detection system that gives you a chance** — suspicion rises fast in
  lamplight, slowly in shadow, slower still while you sneak; break line of
  sight and a hunting warden searches, then gives up and returns to patrol.
- **Cover that works** — deep shadow floor hides you, crates and bookshelves
  block sight, and a thrown inkwell lures the nearest warden away to
  investigate the clink.
- **Three halls, rising tension** — 2 wardens in the Reading Room, 3 in the
  Gallery of Maps, 4 in the Vault of Ledgers, with seals to pocket for a
  ghost rating.
- **Feel** — footsteps that ring out when you run (and the wardens hear
  them), a suspicion arc over every warden's head, a `?` when one is unsure
  and a `!` when it hunts, lamp pools and a lantern glow against the night.

All art is drawn in code and all sounds are synthesised in the browser —
no audio files, no copied game.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080. `WASD` / arrows to move, `Shift` to sneak,
`Space` to run (loud), mouse click to throw an inkwell, `P` to pause,
`M` to mute, `R` to restart the hall, `Enter` to start.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored make.fun library.

## Layout

- `game/index.html` — the page; `game/src/main.js` boots the loop and the screens
- `game/src/config.js` — every tuning number in one place
- `game/src/levels.js` — the three halls, their maps, patrols and lamps
- `game/src/world.js` — movement, patrols, vision cones, suspicion, pickups
- `game/src/render.js` — everything the player sees, cones to HUD to overlays
- `game/src/input.js` — keyboard and mouse, translated to game coordinates
- `game/src/audio.js` — synthesised sounds, WebAudio only
- `game/src/shots.js` — the scripted screenshot scenes (`?shot=...`)
- `game/src/random.js` — the seeded generator behind the decoration
- `screenshots/` — 4 real renders of the game, the first by name is the cover
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
