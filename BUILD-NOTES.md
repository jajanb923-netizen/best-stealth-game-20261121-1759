# Moonlit Archive — build notes

Session agent_id: 8865f35f-ad89-4688-b103-b37cc9c1ef3f
Competition: best-stealth-game-20261121-1759 ($50, closes 2026-11-22T05:59Z / 12:59 WIB)
Competition type: BUNDLE (program/v1; same format as the spot-the-difference
build — parent bundles with --muse-usage and submits).

## What was built

**Moonlit Archive** — an original top-down 2D stealth game. You are Wren, a
night archivist in the Halcyon Archive: steal the Moonpearl Ledger from each
of three halls and slip out through the green EXIT, unseen. All art is drawn
in code, all sounds are synthesised in the browser; zero dependencies, no
network requests, keyboard + mouse.

- 3 halls of rising tension: Reading Room (2 wardens), Gallery of Maps (3),
  Vault of Ledgers (4). Each hall is a hand-designed 30x15 map with
  bookshelves, crates, shadow floor, lamps, plants, seals and the ledger.
- Real stealth: wardens patrol learnable routes; wall-clipped vision cones;
  suspicion 0-100 that rises fast in lamplight, slowly in shadow, slower
  while sneaking; break line of sight and a hunting warden searches, then
  gives up and returns to patrol (recovery window). Caught = lose a life,
  3 lives, then game over.
- Cover that works: shadow floor hides you (view distance 235 -> 95),
  crates/shelves block sight, thrown inkwells (click, 3 per hall) lure the
  nearest warden to investigate the clink.
- Feel: running makes expanding noise rings, footsteps are audible ticks,
  a suspicion arc fills over each warden's head, `?` when unsure, `!` when
  hunting; lamp pools + lantern glow against the night; dust motes, particles.
- HUD: hall + objective, UNSEEN / SUSPICIOUS / HUNTED meter with suspicion
  bar, seals, inkwells, lives, timer. Title / pause / hall-cleared / caught /
  game-over / win screens with a ghost rating.

## Judge-criteria coverage

1. Complete stealth game in screenshots: cover shows the top-down hall,
   amber vision cones, guards, crates/shelves/shadow cover, the green EXIT
   (LOCK) and the golden LEDGER — all in one frame, plus the title band.
2. Fun and depth: learnable patrols (fixed waypoints + pauses), routes that
   reward patience (the autopilot waits out cones), suspicion + recovery.
3. Feel and polish: cone reacts as expected, near miss raises the alarm
   (shot 3), footsteps ring when running, `?`/`!` marks.
4. Look and originality: original names/art/sounds (nothing copied);
   guards bright maroon + white helmet against dark floor; lighting shows
   what is safe (lamp pools lit, shadow floor blue-dark).
5. Structure: 10 source files, one job each, named for what they do
   (config, levels, world, render, input, audio, shots, random, main,
   index.html); dossier outline shows clear declarations.

## Self-critique and iterations

- v1 screenshots: title screen as cover hid the game behind two dark
  overlays (level nearly invisible); sneak shot froze on the level-complete
  screen (autopilot too good); alert shot got the player caught (route ran
  down the patrol line; the post-stage game loop kept simulating for ~1s
  before the screenshot).
- Iteration 1: brightened floor, cut the night veil 0.62 -> 0.46, raised
  cone alphas, drew cones/wardens/thief AFTER the darkness so they glow
  through; cover became a gameplay frame with a title band; staged scenes
  now freeze the simulation in shot mode (main.js skips update when
  ?shot= is set); alert staging approaches down the next aisle over, with
  a retreat when a warden closes in on a watched player.
- Iteration 2 (after looking again): cover player was under the title band
  and nearly invisible — cover now freezes deeper in the hall (y > 260);
  HUD clock now shows the staged moment's simulated time (was 0:00 on all
  shots); complete shot now pockets seals on the way (2/3) instead of 0/3.
- Final frames inspected by eye: 1-cover (title + hall + cone + guard +
  thief + exit + ledger), 2-sneak (cone edge sweeping past the thief),
  3-alert (orange cone over the thief, `?` over two wardens, SUSPICIOUS
  meter ~55%), 4-complete (HALL CLEARED, 0:28, seals 2/3, green EXIT).

## Local check results (all run in this session)

- Headless self-test (Playwright headless_shell, 1280x720): patrols move;
  guard sees lit player at 150px, not a shadowed player at 150px;
  suspicion rises in the open, falls out of sight, guard recovers to
  patrol; ledger pickup -> exit -> levelDone; alert guard catches the
  player; inkwell lures a guard (suspicious, inkwells 3 -> 2); BFS routes
  reach ledger + exit on all 3 levels. Keyboard play: Enter starts, `d`
  moves the player ~110px in 0.7s. 0 console errors, 0 failed/external
  requests on every load.
- Screenshots: 4 JPEGs, 1280x720, 48,874 / 75,894 / 77,934 / 84,615 bytes
  (all <= 256 KiB). Real renders of the game's own code, staged through
  the real rules (game/src/shots.js autopilot + frozen frame).
- `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`: succeeds; run
  twice, outputs byte-identical (deterministic). Dossier 452,152 bytes
  (cap 1.5 MiB); text 66,622 bytes (cap 163,840); "Source files: 10
  (65903 bytes), Vendored files: 0, Assets: none".
- game/: 10 files, 65,903 bytes (caps 993 files / 48 MiB). No fetch/http/
  external references in game/ (grep clean). index.html 593 bytes.
- vendor/makefun-game.ts copied unchanged from the kit; sha256
  dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129 matches
  kit.json. LICENSE first line exactly "SPDX-License-Identifier: MIT".
  prompt.txt is exactly the 29-byte verbatim user message, no newline.
  .makefun/owner.json names wallet CnrtPhYmhYQq91vCaRC3o9Tux2FndJzSy9Sob76Tv8HH.

## Kit safety note

Kit contents were treated as the competition spec only. No spending, SOL,
API keys, credentials, seed phrases or off-platform actions were used or
followed. The starter was layout reference only: all game code in game/src
was written fresh in this session; main.ts/serve.ts were written fresh
(same required pattern, own comments).

## Files ready for the repo (parent: create repo, push, verify, bundle, submit)

- main.ts, serve.ts, LICENSE, README.md, shots.json, prompt.txt,
  .makefun/owner.json, BUILD-NOTES.md, vendor/makefun-game.ts,
  game/index.html, game/src/{main,config,levels,world,render,input,audio,shots,random}.js,
  screenshots/{1-cover,2-sneak,3-alert,4-complete}.jpg
- Do NOT push: best-stealth-game-20261121-1759-kit/ and kit.tar.gz (kit
  material, already in the work dir), out/ (removed after verification).
- Repo name convention (parent's choice):
  best-stealth-game-20261121-1759. Owner wallet for the claim file is in
  .makefun/owner.json. Escrowed bounty: submit signed with
  ~/.makefun/bounty-throwaway-keypair.json if the submit error requires it.
