// Moonlit Archive — the stealth simulation: movement, patrols, vision cones,
// suspicion and recovery, noise and distractions, pickups and the exit.
// Pure logic, no drawing and no sound: render.js and audio.js read this state.
import { BOARD_X, BOARD_Y, COLS, GUARD, PLAYER, ROWS, TILE } from './config.js';
import { blocksMovement, blocksSight, findTiles, tileAt } from './levels.js';
import { makeRandom } from './random.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_ALERT = 'alert';
export const GUARD_SEARCH = 'search';

export function tileToPx(col) {
  return BOARD_X + col * TILE;
}

export function tileToPy(row) {
  return BOARD_Y + row * TILE;
}

export function pxToTile(x) {
  return Math.floor((x - BOARD_X) / TILE);
}

export function pyToTile(y) {
  return Math.floor((y - BOARD_Y) / TILE);
}

/** Circle-vs-tile collision: slide the circle out of blocking tiles. */
function collideCircle(world, body) {
  const r = body.radius;
  for (let row = Math.floor((body.y - r - BOARD_Y) / TILE); row <= Math.floor((body.y + r - BOARD_Y) / TILE); row += 1) {
    for (let col = Math.floor((body.x - r - BOARD_X) / TILE); col <= Math.floor((body.x + r - BOARD_X) / TILE); col += 1) {
      if (!blocksMovement(tileAt(world.level, col, row))) continue;
      const left = tileToPx(col);
      const top = tileToPy(row);
      const nearX = Math.max(left, Math.min(body.x, left + TILE));
      const nearY = Math.max(top, Math.min(body.y, top + TILE));
      const dx = body.x - nearX;
      const dy = body.y - nearY;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r || d2 === 0) continue;
      const d = Math.sqrt(d2);
      body.x = nearX + (dx / d) * r;
      body.y = nearY + (dy / d) * r;
    }
  }
}

/** Bresenham over tiles: true when no sight-blocking tile lies between two points. */
export function hasLineOfSight(world, x0, y0, x1, y1) {
  let col0 = pxToTile(x0);
  let row0 = pyToTile(y0);
  const col1 = pxToTile(x1);
  const row1 = pyToTile(y1);
  const dCol = Math.abs(col1 - col0);
  const dRow = Math.abs(row1 - row0);
  const stepCol = col0 < col1 ? 1 : -1;
  const stepRow = row0 < row1 ? 1 : -1;
  let error = dCol - dRow;
  for (let guard = 0; guard < 64; guard += 1) {
    if (!(col0 === pxToTile(x0) && row0 === pyToTile(y0)) && !(col0 === col1 && row0 === row1)) {
      if (blocksSight(tileAt(world.level, col0, row0))) return false;
    }
    if (col0 === col1 && row0 === row1) return true;
    const error2 = 2 * error;
    if (error2 > -dRow) {
      error -= dRow;
      col0 += stepCol;
    }
    if (error2 < dCol) {
      error += dCol;
      row0 += stepRow;
    }
  }
  return true;
}

function tileIsShadow(world, x, y) {
  return tileAt(world.level, pxToTile(x), pyToTile(y)) === 'S';
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Can this guard see the player right now? Returns 'lit' | 'shadow' | null.
 * Shadow floor and sneaking shrink the range; point-blank always counts.
 */
export function guardCanSeePlayer(world, guard) {
  const player = world.player;
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > GUARD.viewDistance) return null;
  const angle = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(angle, guard.facing)) > GUARD.halfAngle && distance > GUARD.closeRange) return null;
  if (!hasLineOfSight(world, guard.x, guard.y, player.x, player.y)) return null;
  const inShadow = tileIsShadow(world, player.x, player.y);
  const limit = player.sneaking
    ? GUARD.viewDistanceSneak
    : inShadow
      ? GUARD.viewDistanceShadow
      : GUARD.viewDistance;
  if (distance > limit && distance > GUARD.closeRange) return null;
  return inShadow || player.sneaking ? 'shadow' : 'lit';
}

function makeGuard(def, index) {
  const [col, row] = def.waypoints[0];
  return {
    id: index,
    x: tileToPx(col) + TILE / 2,
    y: tileToPy(row) + TILE / 2,
    radius: GUARD.radius,
    facing: 0,
    waypoints: def.waypoints.map(([c, r]) => ({ x: tileToPx(c) + TILE / 2, y: tileToPy(r) + TILE / 2 })),
    waypointIndex: 1 % def.waypoints.length,
    pause: def.pause,
    pauseLeft: 0.4 + index * 0.5,
    state: GUARD_PATROL,
    suspicion: 0,
    lastSeenX: 0,
    lastSeenY: 0,
    memoryLeft: 0,
    searchLeft: 0,
    searchTarget: null,
    heardX: 0,
    heardY: 0,
    investigateLeft: 0,
    stepPhase: index * 1.7,
    bobPhase: index * 2.1,
  };
}

function makePlayer(start) {
  return {
    x: tileToPx(start[0]) + TILE / 2,
    y: tileToPy(start[1]) + TILE / 2,
    radius: PLAYER.radius,
    facing: Math.PI / 2,
    moving: false,
    sneaking: false,
    running: false,
    stepPhase: 0,
    hidden: false,
  };
}

/** Build a fresh world from a level object. */
export function createGameWorld(level, levelIndex, seed) {
  const random = makeRandom(seed + levelIndex * 7919);
  const start = findTiles(level, 'T')[0];
  const ledgerAt = findTiles(level, 'K')[0];
  const exitAt = findTiles(level, 'E')[0];
  const world = {
    level,
    levelIndex,
    random,
    player: makePlayer(start),
    guards: level.guards.map((def, index) => makeGuard(def, index)),
    seals: findTiles(level, '*').map(([col, row]) => ({
      x: tileToPx(col) + TILE / 2,
      y: tileToPy(row) + TILE / 2,
      taken: false,
      phase: random() * Math.PI * 2,
    })),
    ledger: {
      x: tileToPx(ledgerAt[0]) + TILE / 2,
      y: tileToPy(ledgerAt[1]) + TILE / 2,
      taken: false,
      phase: 0,
    },
    exit: { x: tileToPx(exitAt[0]) + TILE / 2, y: tileToPy(exitAt[1]) + TILE / 2 },
    inkwells: 3,
    throws: [],
    particles: [],
    time: 0,
    sealsTaken: 0,
    caught: false,
    caughtBy: -1,
    levelDone: false,
    winFlash: 0,
    alertLevel: 0, // 0 calm, 1 suspicious, 2 alert — the loudest guard decides
    dust: [],
  };
  for (let index = 0; index < 90; index += 1) {
    world.dust.push({
      x: BOARD_X + random() * COLS * TILE,
      y: BOARD_Y + random() * ROWS * TILE,
      r: 0.8 + random() * 1.6,
      drift: 3 + random() * 7,
      phase: random() * Math.PI * 2,
    });
  }
  return world;
}

function moveToward(body, targetX, targetY, speed, dt) {
  const dx = targetX - body.x;
  const dy = targetY - body.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return true;
  const step = Math.min(distance, speed * dt);
  body.x += (dx / distance) * step;
  body.y += (dy / distance) * step;
  body.facing = Math.atan2(dy, dx);
  return distance - step < 2;
}

function addParticles(world, x, y, count, colour, speed) {
  for (let index = 0; index < count; index += 1) {
    const angle = world.random() * Math.PI * 2;
    const v = speed * (0.4 + world.random() * 0.8);
    world.particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 0.5 + world.random() * 0.5,
      maxLife: 1,
      colour,
      size: 2 + world.random() * 3,
    });
  }
  if (world.particles.length > 220) world.particles.splice(0, world.particles.length - 220);
}

/** The player throws an inkwell: it lands with a clink and every nearby guard goes to look. */
export function throwInkwell(world, x, y) {
  if (world.inkwells <= 0) return false;
  world.inkwells -= 1;
  world.throws.push({ x, y, life: 0.9 });
  addParticles(world, x, y, 14, '#7fd4ff', 90);
  for (const guard of world.guards) {
    const distance = Math.hypot(guard.x - x, guard.y - y);
    if (distance < 320 && guard.state !== GUARD_ALERT) {
      guard.heardX = x;
      guard.heardY = y;
      guard.investigateLeft = 5;
      guard.state = GUARD_SUSPICIOUS;
      guard.suspicion = Math.max(guard.suspicion, 45);
    }
  }
  return true;
}

function updateGuard(world, guard, dt, events) {
  const player = world.player;
  const seen = guardCanSeePlayer(world, guard);
  if (seen) {
    guard.lastSeenX = player.x;
    guard.lastSeenY = player.y;
    const rate = (seen === 'lit' ? GUARD.riseLit : GUARD.riseShadow) * (player.sneaking ? GUARD.riseSneak : 1);
    guard.suspicion = Math.min(GUARD.alertAt, guard.suspicion + rate * dt);
    if (guard.suspicion >= GUARD.suspiciousAt && guard.state === GUARD_PATROL) guard.state = GUARD_SUSPICIOUS;
    if (guard.suspicion >= GUARD.alertAt && guard.state !== GUARD_ALERT) {
      guard.state = GUARD_ALERT;
      guard.memoryLeft = GUARD.memorySeconds;
      events.push('alert');
      addParticles(world, guard.x, guard.y - 22, 10, '#ff5a5a', 70);
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD.fall * dt);
    if (guard.state === GUARD_SUSPICIOUS && guard.suspicion < GUARD.suspiciousAt && guard.investigateLeft <= 0) {
      guard.state = GUARD_PATROL;
    }
  }

  if (guard.state === GUARD_ALERT) {
    if (seen) guard.memoryLeft = GUARD.memorySeconds;
    else guard.memoryLeft -= dt;
    moveToward(guard, guard.lastSeenX, guard.lastSeenY, GUARD.chaseSpeed, dt);
    collideCircle(world, guard);
    if (Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD.catchDistance) {
      world.caught = true;
      world.caughtBy = guard.id;
      events.push('caught');
    }
    if (guard.memoryLeft <= 0) {
      guard.state = GUARD_SEARCH;
      guard.searchLeft = GUARD.searchSeconds;
      guard.searchTarget = { x: guard.lastSeenX, y: guard.lastSeenY };
    }
    return;
  }

  if (guard.state === GUARD_SEARCH) {
    if (guard.searchTarget) {
      const arrived = moveToward(guard, guard.searchTarget.x, guard.searchTarget.y, GUARD.searchSpeed, dt);
      collideCircle(world, guard);
      if (arrived) {
        guard.searchTarget = null;
        guard.facing += 1.9;
      }
    } else {
      guard.facing += dt * 1.4;
      guard.searchLeft -= dt;
    }
    if (guard.searchLeft <= 0) {
      guard.state = GUARD_PATROL;
      guard.suspicion = 0;
    }
    return;
  }

  // Patrol or investigate a noise.
  if (guard.investigateLeft > 0) {
    const arrived = moveToward(guard, guard.heardX, guard.heardY, GUARD.searchSpeed, dt);
    collideCircle(world, guard);
    if (arrived) {
      guard.investigateLeft -= dt;
      guard.facing += dt * 1.6;
      if (guard.investigateLeft <= 0) guard.state = GUARD_PATROL;
    }
    return;
  }
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    guard.facing += dt * 0.25;
    return;
  }
  const target = guard.waypoints[guard.waypointIndex];
  const arrived = moveToward(guard, target.x, target.y, GUARD.patrolSpeed, dt);
  collideCircle(world, guard);
  if (arrived) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.pauseLeft = guard.pause;
  }
}

/**
 * Advance the world one step. `input` is {x, y, sneak, run} in -1..1.
 * Returns a list of event names for the sound layer: alert, caught, pickup,
 * ledger, exit, throw.
 */
export function stepWorld(world, input, dt) {
  const events = [];
  world.time += dt;
  const player = world.player;

  const moving = input.x !== 0 || input.y !== 0;
  player.moving = moving;
  player.sneaking = input.sneak;
  player.running = input.run && !input.sneak;
  const speed = input.sneak ? PLAYER.sneakSpeed : input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  if (moving) {
    const length = Math.hypot(input.x, input.y);
    player.x += (input.x / length) * speed * dt;
    player.y += (input.y / length) * speed * dt;
    player.facing = Math.atan2(input.y, input.x);
    player.stepPhase += dt * (input.sneak ? 7 : input.run ? 15 : 11);
    if (Math.floor(player.stepPhase) !== Math.floor(player.stepPhase - dt * 11)) {
      events.push(input.run ? 'step-loud' : 'step');
    }
    if (input.run && world.random() < dt * 14) {
      world.particles.push({
        x: player.x, y: player.y + 10, vx: 0, vy: 6, life: 0.4, maxLife: 0.4, colour: '#8a7a5a', size: 2.5,
      });
    }
  }
  collideCircle(world, player);
  player.hidden = tileIsShadow(world, player.x, player.y);

  for (const guard of world.guards) {
    guard.stepPhase += dt * (guard.state === GUARD_ALERT ? 11 : guard.state === GUARD_PATROL ? 5 : 7);
    guard.bobPhase += dt * 2;
    updateGuard(world, guard, dt, events);
  }

  // Pickups.
  for (const seal of world.seals) {
    seal.phase += dt * 2;
    if (!seal.taken && Math.hypot(player.x - seal.x, player.y - seal.y) < 26) {
      seal.taken = true;
      world.sealsTaken += 1;
      events.push('pickup');
      addParticles(world, seal.x, seal.y, 12, '#ffd76a', 80);
    }
  }
  world.ledger.phase += dt * 2;
  if (!world.ledger.taken && Math.hypot(player.x - world.ledger.x, player.y - world.ledger.y) < 28) {
    world.ledger.taken = true;
    events.push('ledger');
    addParticles(world, world.ledger.x, world.ledger.y, 22, '#ffd76a', 110);
  }

  // Exit: only opens once the ledger is taken.
  if (world.ledger.taken && Math.hypot(player.x - world.exit.x, player.y - world.exit.y) < 26) {
    world.levelDone = true;
    world.winFlash = 1;
    events.push('exit');
  }
  if (world.winFlash > 0) world.winFlash = Math.max(0, world.winFlash - dt * 1.4);

  // The loudest guard sets the global alert level for the HUD and music.
  let level = 0;
  for (const guard of world.guards) {
    if (guard.state === GUARD_ALERT) level = 2;
    else if (level < 2 && (guard.state === GUARD_SUSPICIOUS || guard.state === GUARD_SEARCH)) level = 1;
  }
  world.alertLevel = level;

  for (const t of world.throws) t.life -= dt;
  world.throws = world.throws.filter((t) => t.life > 0);
  for (const p of world.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  for (const mote of world.dust) {
    mote.phase += dt * 0.4;
    mote.x += Math.sin(mote.phase) * mote.drift * dt;
  }
  return events;
}

/** Breadth-first route over walkable tiles, for the screenshot autopilot. */
export function findRoute(world, fromX, fromY, toX, toY) {
  const startCol = pxToTile(fromX);
  const startRow = pyToTile(fromY);
  const goalCol = pxToTile(toX);
  const goalRow = pyToTile(toY);
  const key = (c, r) => `${c},${r}`;
  const prev = new Map();
  const queue = [[startCol, startRow]];
  prev.set(key(startCol, startRow), null);
  while (queue.length > 0) {
    const [col, row] = queue.shift();
    if (col === goalCol && row === goalRow) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = col + dc;
      const nr = row + dr;
      if (blocksMovement(tileAt(world.level, nc, nr))) continue;
      if (prev.has(key(nc, nr))) continue;
      prev.set(key(nc, nr), [col, row]);
      queue.push([nc, nr]);
    }
  }
  if (!prev.has(key(goalCol, goalRow))) return [];
  const path = [];
  let node = [goalCol, goalRow];
  while (node) {
    path.unshift({ x: tileToPx(node[0]) + TILE / 2, y: tileToPy(node[1]) + TILE / 2 });
    node = prev.get(key(node[0], node[1]));
  }
  return path;
}
