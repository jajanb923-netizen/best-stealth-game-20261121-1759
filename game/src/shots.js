// Moonlit Archive — the scripted screenshot scenes behind ?shot=cover|sneak|
// alert|complete. Each one plays the real rules forward from a fresh world,
// steered by a stealth autopilot that re-routes around vision cones and waits
// in shadow when a warden looks its way, so every frame is what a real game
// looks like and the same seed always gives the same frame.
import { TILE } from './config.js';
import { createGameWorld, findRoute, guardCanSeePlayer, stepWorld, tileToPx, tileToPy } from './world.js';

const STEP = 1 / 60;

/** Is a board point inside any guard's cone right now (probe, no side effects)? */
function pointIsWatched(world, x, y) {
  const savedX = world.player.x;
  const savedY = world.player.y;
  const savedSneak = world.player.sneaking;
  world.player.x = x;
  world.player.y = y;
  world.player.sneaking = true;
  let watched = false;
  for (const guard of world.guards) {
    if (guardCanSeePlayer(world, guard)) {
      watched = true;
      break;
    }
  }
  world.player.x = savedX;
  world.player.y = savedY;
  world.player.sneaking = savedSneak;
  return watched;
}

/**
 * Steer the player toward a goal (a point, or the ledger then the exit).
 * Waits (sneaking, in place) while the next step is watched; re-routes often.
 */
function stealthPilot(world, plan) {
  const goal = plan.goal || (world.ledger.taken ? world.exit : world.ledger);
  const goalKey = plan.goal ? 'fixed' : world.ledger.taken;
  // A warden closing in on a watched player means a collision course: back
  // away, sneaking, before the cone fills — the player outruns a patrol.
  const near = nearestGuardDistance(world);
  if (near.guard && near.distance < 130 && pointIsWatched(world, world.player.x, world.player.y)) {
    const dx = world.player.x - near.guard.x;
    const dy = world.player.y - near.guard.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: dx / length, y: dy / length, sneak: true, run: false };
  }
  if (plan.goalKey !== goalKey || plan.path.length === 0 || plan.age > 0.4) {
    plan.path = findRoute(world, world.player.x, world.player.y, goal.x, goal.y);
    plan.goalKey = goalKey;
    plan.age = 0;
    plan.node = 1;
  }
  plan.age += STEP;
  if (plan.node >= plan.path.length) return { x: 0, y: 0, sneak: true, run: false };
  const node = plan.path[plan.node];
  const dx = node.x - world.player.x;
  const dy = node.y - world.player.y;
  if (Math.hypot(dx, dy) < 8) {
    plan.node += 1;
    return { x: 0, y: 0, sneak: true, run: false };
  }
  // Patience: do not step into a watched tile while a warden is near.
  if (pointIsWatched(world, node.x, node.y)) {
    return { x: 0, y: 0, sneak: true, run: false };
  }
  return { x: dx, y: dy, sneak: true, run: false };
}

function newPlan(goal) {
  return { path: [], node: 1, age: 99, goalKey: null, goal: goal || null };
}

function runSteps(world, seconds, pilot, stopWhen, goal) {
  const plan = newPlan(goal || (pilot && pilot.goal ? pilot.goal : null));
  const total = Math.floor(seconds / STEP);
  for (let index = 0; index < total; index += 1) {
    const input = pilot ? pilot(world, plan) : { x: 0, y: 0, sneak: false, run: false };
    stepWorld(world, input, STEP);
    if (world.caught) return { caught: true };
    if (world.levelDone) return { done: true };
    if (stopWhen && stopWhen(world)) return { stopped: true };
  }
  return { timeout: true };
}

function nearestGuardDistance(world) {
  let best = Infinity;
  let bestGuard = null;
  for (const guard of world.guards) {
    const d = Math.hypot(guard.x - world.player.x, guard.y - world.player.y);
    if (d < best) {
      best = d;
      bestGuard = guard;
    }
  }
  return { distance: best, guard: bestGuard };
}

function stageCover(game) {
  game.world = createGameWorld(game.levels[0], 0, 11);
  // Sneak a little way into the hall so the frame holds the thief, a cone
  // or two, the ledger's glow and the exit — then freeze with the title band.
  runSteps(game.world, 20, stealthPilot, (world) => {
    const { distance } = nearestGuardDistance(world);
    return distance < 320 && world.player.x > 300 && world.player.y > 260;
  });
  game.screen = 'play';
  game.coverTitle = true;
}

function stageSneak(game) {
  game.world = createGameWorld(game.levels[0], 0, 11);
  // Sneak to the open floor just left of the first warden's patrol line,
  // then hold still while the warden walks down past Wren — the cone's edge
  // sweeps by a body's width away.
  const hideout = { x: tileToPx(10) + TILE / 2, y: tileToPy(5) + TILE / 2 };
  const pilot = (world, plan) => stealthPilot(world, { ...plan, goal: hideout });
  pilot.goal = hideout;
  runSteps(game.world, 40, pilot, (world) => {
    const arrived = Math.hypot(world.player.x - hideout.x, world.player.y - hideout.y) < 12;
    if (!arrived) return false;
    const guard = world.guards[0];
    const facingDown = Math.abs(guard.facing - Math.PI / 2) < 0.6;
    const nearRow = guard.y > tileToPy(3) && guard.y < tileToPy(6);
    return facingDown && nearRow && guard.suspicion < 30;
  });
  game.screen = 'play';
}

function stageAlert(game) {
  game.world = createGameWorld(game.levels[0], 0, 11);
  // Phase one: sneak to the open floor one tile left of the first warden's
  // patrol line, approaching down the next aisle over — never on the line.
  const stand = { x: tileToPx(11) + TILE / 2, y: tileToPy(6) + TILE / 2 };
  const pilot = (world, plan) => stealthPilot(world, { ...plan, goal: stand });
  pilot.goal = stand;
  runSteps(game.world, 40, pilot, (world) => Math.hypot(world.player.x - stand.x, world.player.y - stand.y) < 12);
  // Phase two: stand in the lamplight while the cone fills — freeze while
  // the warden is still a lunge away, suspicion high, alarm not yet raised.
  for (let index = 0; index < Math.floor(20 / STEP); index += 1) {
    stepWorld(game.world, { x: 0, y: 0, sneak: false, run: false }, STEP);
    if (game.world.caught) break;
    const { distance, guard } = nearestGuardDistance(game.world);
    if (guard && guard.suspicion >= 75) break;
    if (distance < 100) break;
  }
  game.screen = 'play';
}

function stageComplete(game) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    game.world = createGameWorld(game.levels[0], 0, 11 + attempt);
    const world = game.world;
    // Pocket the nearest seal on the way, then the ledger, then the exit.
    const seal = world.seals[0];
    runSteps(world, 90, stealthPilot, (w) => w.sealsTaken >= 1, seal);
    if (world.caught) continue;
    const toLedger = runSteps(world, 120, stealthPilot, (w) => w.ledger.taken);
    if (toLedger.caught || world.caught) continue;
    const result = runSteps(world, 120, stealthPilot);
    if (result.done || world.levelDone) {
      game.screen = 'level-done';
      game.levelSeconds = world.time;
      game.levelRating = world.sealsTaken === world.seals.length
        ? 'Every seal pocketed — a perfect, silent hall.'
        : world.sealsTaken > 0
          ? 'The ledger is yours — and a seal besides. The wardens never knew.'
          : 'The ledger is yours. The wardens never knew.';
      return;
    }
  }
  // Fallback: a live hall under the title is still a true render.
  game.world = createGameWorld(game.levels[0], 0, 11);
  runSteps(game.world, 6, null);
  game.screen = 'title';
}

/**
 * Set `game` to the named scene (cover, sneak, alert or complete) and return
 * nothing; main.js draws whatever screen the scene leaves.
 */
export function stageShot(name, game) {
  game.coverTitle = false;
  if (name === 'sneak') stageSneak(game);
  else if (name === 'alert') stageAlert(game);
  else if (name === 'complete') stageComplete(game);
  else stageCover(game);
  // The HUD clock shows the staged moment's own simulated time.
  game.elapsed = game.world.time;
}
