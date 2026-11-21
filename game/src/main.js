// Moonlit Archive — boot, the game loop and the screen state machine.
// Screens: title, play, paused, level-done, caught, game-over, win.
// A ?shot=cover|sneak|alert|complete query stages a screenshot scene instead
// of the title screen.
import { CANVAS_HEIGHT, CANVAS_WIDTH, GAME } from './config.js';
import { LEVELS } from './levels.js';
import { createAudio } from './audio.js';
import { createInput, pressed, readMove, takeClick } from './input.js';
import { drawGame } from './render.js';
import { stageShot } from './shots.js';
import { createGameWorld, stepWorld, throwInkwell } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const audio = createAudio();
const input = createInput(canvas);
input.onFirstGesture = () => audio.ensure();
input.attach();

const game = {
  levels: LEVELS,
  levelIndex: 0,
  world: null,
  screen: 'title',
  lives: GAME.lives,
  elapsed: 0,
  levelSeconds: 0,
  levelStart: 0,
  levelRating: '',
  finalRating: '',
  hallsCleared: 0,
  totalSeals: 0,
  bestSeconds: 0,
};

function loadLevel(index) {
  game.levelIndex = index;
  game.world = createGameWorld(LEVELS[index], index, 11);
  game.levelStart = game.elapsed;
  game.screen = 'play';
}

function startRun() {
  game.lives = GAME.lives;
  game.elapsed = 0;
  game.hallsCleared = 0;
  game.totalSeals = 0;
  loadLevel(0);
}

function rateRun() {
  const total = game.totalSeals;
  if (game.elapsed < 420 && total === 9) return 'A ghost run — nine seals, never truly seen. The wardens swear the archive is haunted.';
  if (total >= 7) return 'A quiet shadow — the ledger is safe and the seals nearly all yours.';
  if (total >= 4) return 'A careful thief — seen, perhaps, but never caught.';
  return 'A loud escape — the ledger is safe, but the wardens will remember tonight.';
}

function onCaught() {
  game.lives -= 1;
  audio.playEvent('caught');
  if (game.lives <= 0) {
    game.screen = 'game-over';
  } else {
    game.screen = 'caught';
  }
}

function update(dt) {
  if (game.screen === 'title') {
    if (pressed(input, 'Enter')) startRun();
    return;
  }
  if (game.screen === 'paused') {
    if (pressed(input, 'Enter', 'p', 'P')) game.screen = 'play';
    if (pressed(input, 'r', 'R')) loadLevel(game.levelIndex);
    return;
  }
  if (game.screen === 'level-done') {
    if (pressed(input, 'Enter')) {
      if (game.levelIndex + 1 >= LEVELS.length) {
        game.screen = 'win';
        game.finalRating = rateRun();
        if (game.bestSeconds === 0 || game.elapsed < game.bestSeconds) game.bestSeconds = game.elapsed;
        audio.playEvent('win');
      } else {
        loadLevel(game.levelIndex + 1);
      }
    }
    return;
  }
  if (game.screen === 'caught') {
    if (pressed(input, 'Enter')) loadLevel(game.levelIndex);
    return;
  }
  if (game.screen === 'game-over' || game.screen === 'win') {
    if (pressed(input, 'Enter')) startRun();
    return;
  }

  // Play.
  game.elapsed += dt;
  if (pressed(input, 'p', 'P')) {
    game.screen = 'paused';
    return;
  }
  if (pressed(input, 'm', 'M')) audio.setMuted(!audio.muted);
  if (pressed(input, 'r', 'R')) {
    loadLevel(game.levelIndex);
    return;
  }
  const move = readMove(input);
  const click = takeClick(input);
  if (click && game.world.inkwells > 0) {
    if (throwInkwell(game.world, click.x, click.y)) audio.playEvent('throw');
  }
  const events = stepWorld(game.world, move, dt);
  for (const event of events) audio.playEvent(event);
  if (game.world.caught) {
    onCaught();
    return;
  }
  if (game.world.levelDone) {
    game.levelSeconds = game.elapsed - game.levelStart;
    game.hallsCleared += 1;
    game.totalSeals += game.world.sealsTaken;
    game.levelRating = game.world.sealsTaken === game.world.seals.length
      ? 'Every seal pocketed — a perfect, silent hall.'
      : 'The ledger is yours. The wardens never knew.';
    audio.playEvent('exit');
    game.screen = 'level-done';
  }
}

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  // A staged screenshot scene is a frozen moment: draw it, never advance it.
  if (!shot) update(dt);
  drawGame(ctx, game);
  requestAnimationFrame(frame);
}

// A screenshot scene stages a frozen moment; the loop still draws it.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  game.world = createGameWorld(LEVELS[0], 0, 11);
  stageShot(shot, game);
  window.__moonlitShot = shot;
} else {
  game.world = createGameWorld(LEVELS[0], 0, 11);
}
window.__moonlit = { game };
requestAnimationFrame(frame);
