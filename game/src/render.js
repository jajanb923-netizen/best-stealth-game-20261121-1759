// Moonlit Archive — everything the player sees: the hall, its lamps and
// shadows, the wardens' vision cones, the thief, the HUD and every overlay.
// Canvas 2D only, all art drawn in code.
import {
  BOARD_X, BOARD_Y, CANVAS_HEIGHT, CANVAS_WIDTH, COLS, GUARD, HUD_HEIGHT, ROWS, TILE,
} from './config.js';
import { findTiles, tileAt } from './levels.js';
import { makeRandom, pick, range } from './random.js';
import { pxToTile, pyToTile, tileToPx, tileToPy } from './world.js';

const SPINE_COLOURS = ['#b5543c', '#c98a2e', '#4d7a52', '#5b6fae', '#8a5ba0', '#a05a6e', '#3f8a8a'];
const FLOOR_A = '#4a3d2f';
const FLOOR_B = '#41352a';

// Decoration precomputed once per level: floor speckles and book-spine colours.
const decorationCache = new Map();
function decorationFor(level, levelIndex) {
  if (decorationCache.has(level)) return decorationCache.get(level);
  const random = makeRandom(1000 + levelIndex * 331);
  const speckles = [];
  for (let index = 0; index < 420; index += 1) {
    speckles.push({
      x: BOARD_X + random() * COLS * TILE,
      y: BOARD_Y + random() * ROWS * TILE,
      r: 0.6 + random() * 1.8,
      light: random() < 0.5,
    });
  }
  const spines = new Map();
  for (const [col, row] of findTiles(level, 'B')) {
    const books = [];
    for (let shelf = 0; shelf < 3; shelf += 1) {
      const rowBooks = [];
      for (let book = 0; book < 7; book += 1) rowBooks.push(pick(random, SPINE_COLOURS));
      books.push(rowBooks);
    }
    spines.set(`${col},${row}`, books);
  }
  const rugs = [];
  for (let index = 0; index < 4; index += 1) {
    rugs.push({
      x: BOARD_X + range(random, 1, COLS - 7) * TILE,
      y: BOARD_Y + range(random, 1, ROWS - 3) * TILE,
      w: range(random, 3.5, 5.5) * TILE,
      h: 2.4 * TILE,
      hue: pick(random, ['#5e2f3d', '#2f4a5e', '#4a3a5e']),
    });
  }
  const decoration = { speckles, spines, rugs };
  decorationCache.set(level, decoration);
  return decoration;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A vision cone clipped by walls: cast rays and stop at the first blocker. */
export function conePolygon(world, guard) {
  const points = [{ x: guard.x, y: guard.y }];
  const steps = 26;
  const reach = GUARD.viewDistance;
  for (let index = 0; index <= steps; index += 1) {
    const angle = guard.facing - GUARD.halfAngle + (2 * GUARD.halfAngle * index) / steps;
    let distance = reach;
    for (let d = 14; d <= reach; d += 8) {
      const x = guard.x + Math.cos(angle) * d;
      const y = guard.y + Math.sin(angle) * d;
      const tile = tileAt(world.level, pxToTile(x), pyToTile(y));
      if (tile === '#' || tile === 'B' || tile === 'C') {
        distance = d;
        break;
      }
    }
    points.push({ x: guard.x + Math.cos(angle) * distance, y: guard.y + Math.sin(angle) * distance });
  }
  return points;
}

function drawCone(ctx, world, guard) {
  const colour = guard.state === 'alert'
    ? '255, 70, 70'
    : guard.state === 'patrol'
      ? '255, 190, 60'
      : '255, 130, 40';
  const alpha = guard.state === 'alert' ? 0.44 : guard.state === 'patrol' ? 0.3 : 0.36;
  const points = conePolygon(world, guard);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index].x, points[index].y);
  ctx.closePath();
  ctx.fillStyle = `rgba(${colour}, ${alpha})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${colour}, 0.65)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawFloor(ctx, world, decoration) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const x = tileToPx(col);
      const y = tileToPy(row);
      ctx.fillStyle = (col + row) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
  for (const rug of decoration.rugs) {
    ctx.fillStyle = rug.hue;
    ctx.globalAlpha = 0.5;
    roundRect(ctx, rug.x, rug.y, rug.w, rug.h, 8);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,220,150,0.25)';
    ctx.lineWidth = 2;
    roundRect(ctx, rug.x + 6, rug.y + 6, rug.w - 12, rug.h - 12, 5);
    ctx.stroke();
  }
  for (const speckle of decoration.speckles) {
    ctx.fillStyle = speckle.light ? 'rgba(255,235,200,0.05)' : 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.arc(speckle.x, speckle.y, speckle.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawShadowTile(ctx, world) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (tileAt(world.level, col, row) !== 'S') continue;
      const x = tileToPx(col);
      const y = tileToPy(row);
      ctx.fillStyle = 'rgba(38, 58, 110, 0.42)';
      ctx.fillRect(x, y, TILE, TILE);
      // A faint crescent marks the deep shadow.
      ctx.strokeStyle = 'rgba(180, 200, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + TILE / 2, y + TILE / 2, 9, Math.PI * 0.25, Math.PI * 1.35);
      ctx.stroke();
    }
  }
}

function drawLampPools(ctx, world) {
  for (const [col, row] of world.level.lamps) {
    const x = tileToPx(col) + TILE / 2;
    const y = tileToPy(row) + TILE / 2;
    const glow = ctx.createRadialGradient(x, y, 6, x, y, 130);
    glow.addColorStop(0, 'rgba(255, 205, 110, 0.34)');
    glow.addColorStop(1, 'rgba(255, 205, 110, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2118';
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFurniture(ctx, world, decoration) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const tile = tileAt(world.level, col, row);
      const x = tileToPx(col);
      const y = tileToPy(row);
      if (tile === '#') {
        ctx.fillStyle = '#1d2738';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#2c3a52';
        ctx.fillRect(x, y, TILE, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, y + 7, TILE, 2);
      } else if (tile === 'B') {
        ctx.fillStyle = '#4a2f1d';
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        const books = decoration.spines.get(`${col},${row}`) || [];
        for (let shelf = 0; shelf < 3; shelf += 1) {
          for (let book = 0; book < 7; book += 1) {
            ctx.fillStyle = books[shelf] ? books[shelf][book] : '#666';
            ctx.fillRect(x + 5 + book * 4.4, y + 5 + shelf * 11, 3.4, 9);
          }
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
      } else if (tile === 'C') {
        ctx.fillStyle = '#6b4a26';
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = '#8a6534';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + TILE - 3, y + TILE - 3);
        ctx.moveTo(x + TILE - 3, y + 3);
        ctx.lineTo(x + 3, y + TILE - 3);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
      } else if (tile === 'P') {
        ctx.fillStyle = '#7a3b22';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE - 10, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3f7a3a';
        for (let leaf = 0; leaf < 5; leaf += 1) {
          const angle = -Math.PI / 2 + (leaf - 2) * 0.5;
          ctx.beginPath();
          ctx.ellipse(
            x + TILE / 2 + Math.cos(angle) * 8, y + TILE / 2 + Math.sin(angle) * 8 - 4,
            5, 10, angle, 0, Math.PI * 2,
          );
          ctx.fill();
        }
      }
    }
  }
}

function drawExit(ctx, world) {
  const { x, y } = world.exit;
  const open = world.ledger.taken;
  const pulse = 0.7 + Math.sin(world.time * 3) * 0.3;
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 70);
  glow.addColorStop(0, open ? `rgba(90, 255, 150, ${0.5 * pulse})` : 'rgba(90, 255, 150, 0.14)');
  glow.addColorStop(1, 'rgba(90, 255, 150, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = open ? '#1f7a44' : '#274a35';
  roundRect(ctx, x - 17, y - 17, 34, 34, 6);
  ctx.fill();
  ctx.strokeStyle = open ? '#7dffab' : '#4a7a5e';
  ctx.lineWidth = 2.5;
  roundRect(ctx, x - 17, y - 17, 34, 34, 6);
  ctx.stroke();
  ctx.fillStyle = open ? '#c9ffe0' : '#7aa88d';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCK', x, y - 1);
  if (!open) {
    // A small drawn padlock on the locked door.
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y + 22, 5, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(x - 6, y + 22, 12, 8);
  }
}

function drawLedgerAndSeals(ctx, world) {
  if (!world.ledger.taken) {
    const { x, y } = world.ledger;
    const bob = Math.sin(world.ledger.phase) * 3;
    const glow = ctx.createRadialGradient(x, y + bob, 2, x, y + bob, 46);
    glow.addColorStop(0, 'rgba(255, 215, 106, 0.55)');
    glow.addColorStop(1, 'rgba(255, 215, 106, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y + bob, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a6d1f';
    roundRect(ctx, x - 11, y - 14 + bob, 22, 28, 3);
    ctx.fill();
    ctx.fillStyle = '#ffd76a';
    roundRect(ctx, x - 9, y - 12 + bob, 18, 24, 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 12 + bob);
    ctx.lineTo(x, y + 12 + bob);
    ctx.stroke();
    ctx.fillStyle = '#8a6d1f';
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('LEDGER', x, y + 28 + bob);
  }
  for (const seal of world.seals) {
    if (seal.taken) continue;
    const bob = Math.sin(seal.phase) * 2.5;
    const glow = ctx.createRadialGradient(seal.x, seal.y + bob, 2, seal.x, seal.y + bob, 30);
    glow.addColorStop(0, 'rgba(150, 220, 255, 0.5)');
    glow.addColorStop(1, 'rgba(150, 220, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(seal.x, seal.y + bob, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8e8f5';
    ctx.beginPath();
    ctx.arc(seal.x, seal.y + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a6a8a';
    ctx.beginPath();
    ctx.arc(seal.x, seal.y + bob, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGuard(ctx, world, guard) {
  const bob = Math.sin(guard.bobPhase) * 1.2;
  const uniform = guard.state === 'alert' ? '#d9382b' : guard.state === 'patrol' ? '#b03a2e' : '#c05a1e';
  // Body: bright uniform, clearly visible against the dark floor.
  ctx.fillStyle = uniform;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob, guard.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob, guard.radius, 0, Math.PI * 2);
  ctx.stroke();
  // White helmet.
  ctx.fillStyle = '#f2ead8';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob - 3, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.facing) * 3, guard.y + bob - 3 + Math.sin(guard.facing) * 3, 2, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick.
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(guard.x + Math.cos(guard.facing) * (guard.radius - 2), guard.y + bob + Math.sin(guard.facing) * (guard.radius - 2));
  ctx.lineTo(guard.x + Math.cos(guard.facing) * (guard.radius + 6), guard.y + bob + Math.sin(guard.facing) * (guard.radius + 6));
  ctx.stroke();
  // Suspicion arc above the head.
  if (guard.suspicion > 2) {
    ctx.strokeStyle = guard.suspicion >= GUARD.alertAt ? '#ff4646' : '#ffb13c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y + bob - 20, 9, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / 100) * Math.PI * 2);
    ctx.stroke();
  }
  // ? when suspicious, ! when hunting.
  if (guard.state === 'alert' || guard.state === 'search') {
    ctx.fillStyle = '#ff4646';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y + bob - 28);
  } else if (guard.state === 'suspicious') {
    ctx.fillStyle = '#ffcf4d';
    ctx.font = 'bold 18px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y + bob - 28);
  }
}

function drawPlayer(ctx, world) {
  const player = world.player;
  const crouch = player.sneaking ? 0.82 : 1;
  // Lantern light around the thief.
  const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 64);
  glow.addColorStop(0, 'rgba(255, 220, 140, 0.30)');
  glow.addColorStop(1, 'rgba(255, 220, 140, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 64, 0, Math.PI * 2);
  ctx.fill();
  // Cloak.
  ctx.fillStyle = '#1f8a7a';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y, 13, 13 * crouch, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8affdd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(player.x, player.y, 13, 13 * crouch, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Hood + face.
  ctx.fillStyle = '#14655a';
  ctx.beginPath();
  ctx.arc(player.x, player.y - 2 * crouch, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9c4';
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.facing) * 3, player.y - 2 * crouch + Math.sin(player.facing) * 3, 3, 0, Math.PI * 2);
  ctx.fill();
  // Hidden-in-shadow shimmer.
  if (player.hidden) {
    ctx.strokeStyle = 'rgba(160, 190, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Running makes noise: an expanding ring the wardens can hear.
  if (player.running && player.moving) {
    const phase = (world.time * 2.2) % 1;
    ctx.strokeStyle = `rgba(255, 220, 150, ${0.5 * (1 - phase)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 16 + phase * 46, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawParticles(ctx, world) {
  for (const particle of world.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.colour;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const mote of world.dust) {
    ctx.fillStyle = `rgba(220, 230, 255, ${0.10 + 0.08 * Math.sin(mote.phase)})`;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const t of world.throws) {
    ctx.globalAlpha = Math.min(1, t.life * 2);
    ctx.fillStyle = '#7fd4ff';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(127, 212, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 8 + (0.9 - t.life) * 40, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// The night itself: a dark veil with holes punched where light falls.
let darkCanvas = null;
function drawDarkness(ctx, world) {
  if (!darkCanvas) {
    darkCanvas = document.createElement('canvas');
    darkCanvas.width = CANVAS_WIDTH;
    darkCanvas.height = CANVAS_HEIGHT;
  }
  const dctx = darkCanvas.getContext('2d');
  dctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  dctx.fillStyle = 'rgba(6, 10, 26, 0.46)';
  dctx.fillRect(BOARD_X, BOARD_Y, COLS * TILE, ROWS * TILE);
  dctx.globalCompositeOperation = 'destination-out';
  const punch = (x, y, radius, strength) => {
    const glow = dctx.createRadialGradient(x, y, 4, x, y, radius);
    glow.addColorStop(0, `rgba(0,0,0,${strength})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = glow;
    dctx.beginPath();
    dctx.arc(x, y, radius, 0, Math.PI * 2);
    dctx.fill();
  };
  for (const [col, row] of world.level.lamps) punch(tileToPx(col) + TILE / 2, tileToPy(row) + TILE / 2, 150, 0.85);
  punch(world.player.x, world.player.y, 110, 0.7);
  for (const guard of world.guards) punch(guard.x, guard.y, 70, 0.45);
  punch(world.exit.x, world.exit.y, 80, 0.5);
  if (!world.ledger.taken) punch(world.ledger.x, world.ledger.y, 60, 0.5);
  dctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(darkCanvas, 0, 0);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function drawHud(ctx, game) {
  const { world } = game;
  ctx.fillStyle = '#0d1322';
  ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = 'rgba(255, 215, 106, 0.25)';
  ctx.fillRect(0, HUD_HEIGHT - 2, CANVAS_WIDTH, 2);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(`Hall ${world.levelIndex + 1} — ${world.level.name}`, 24, 24);
  ctx.fillStyle = '#c9d4e8';
  ctx.font = '15px Georgia, serif';
  const objective = world.ledger.taken
    ? 'Ledger in hand — reach the green EXIT, unseen.'
    : 'Steal the Moonpearl Ledger, then reach the EXIT.';
  ctx.fillText(objective, 24, 50);
  // Alert meter, centre.
  const alertText = world.alertLevel === 2 ? 'HUNTED' : world.alertLevel === 1 ? 'SUSPICIOUS' : 'UNSEEN';
  const alertColour = world.alertLevel === 2 ? '#ff4646' : world.alertLevel === 1 ? '#ffb13c' : '#7dffab';
  ctx.textAlign = 'center';
  ctx.fillStyle = alertColour;
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText(`● ${alertText}`, CANVAS_WIDTH / 2, 26);
  const loudest = Math.max(0, ...world.guards.map((g) => g.suspicion));
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, CANVAS_WIDTH / 2 - 90, 42, 180, 10, 5);
  ctx.fill();
  ctx.fillStyle = alertColour;
  roundRect(ctx, CANVAS_WIDTH / 2 - 90, 42, 180 * (loudest / 100), 10, 5);
  ctx.fill();
  // Right side: seals, inkwells, lives, timer.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#c9d4e8';
  ctx.font = '16px Georgia, serif';
  ctx.fillText(`Seals ${world.sealsTaken}/${world.seals.length}   Ink ${world.inkwells}   Lives ${'◆'.repeat(game.lives)}${'◇'.repeat(Math.max(0, 3 - game.lives))}`, CANVAS_WIDTH - 24, 24);
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText(`TIME ${formatTime(game.elapsed)}`, CANVAS_WIDTH - 24, 50);
  // Bottom hint bar.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8fa0bd';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('WASD / arrows — move    SHIFT — sneak    CLICK — throw an inkwell    P — pause    M — mute    R — restart hall', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 12);
}

function panel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 8, 18, 0.72)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const width = 640;
  const height = 150 + lines.length * 30;
  const x = (CANVAS_WIDTH - width) / 2;
  const y = (CANVAS_HEIGHT - height) / 2;
  ctx.fillStyle = '#101a30';
  roundRect(ctx, x, y, width, height, 14);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, width, height, 14);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText(title, CANVAS_WIDTH / 2, y + 62);
  ctx.fillStyle = '#dfe7f5';
  ctx.font = '17px Georgia, serif';
  lines.forEach((line, index) => {
    ctx.fillText(line, CANVAS_WIDTH / 2, y + 106 + index * 30);
  });
}

function drawCoverTitle(ctx) {
  ctx.fillStyle = 'rgba(5, 8, 18, 0.66)';
  ctx.fillRect(BOARD_X, BOARD_Y, COLS * TILE, 80);
  ctx.fillStyle = 'rgba(255, 215, 106, 0.4)';
  ctx.fillRect(BOARD_X, BOARD_Y + 80, COLS * TILE, 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('MOONLIT ARCHIVE', CANVAS_WIDTH / 2, BOARD_Y + 40);
  ctx.fillStyle = '#dfe7f5';
  ctx.font = 'italic 16px Georgia, serif';
  ctx.fillText('Steal the ledger. Dodge the wardens. Vanish.', CANVAS_WIDTH / 2, BOARD_Y + 66);
}

function drawTitle(ctx, game) {
  const { world } = game;
  ctx.fillStyle = 'rgba(5, 8, 18, 0.62)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 66px Georgia, serif';
  ctx.fillText('MOONLIT ARCHIVE', CANVAS_WIDTH / 2, 210);
  ctx.fillStyle = '#c9d4e8';
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText('A stealth game in three halls — steal the ledger, dodge the wardens, vanish.', CANVAS_WIDTH / 2, 252);
  ctx.fillStyle = '#dfe7f5';
  ctx.font = '17px Georgia, serif';
  const lines = [
    'WASD / arrows — move      SHIFT — sneak (slow, quiet, harder to spot)',
    'CLICK — throw an inkwell to lure a warden away      Dark blue floor hides you',
    'A warden’s cone fills as it sees you — break line of sight before it turns red.',
    'Take the golden LEDGER, then slip out through the green EXIT, unseen.',
  ];
  lines.forEach((line, index) => ctx.fillText(line, CANVAS_WIDTH / 2, 320 + index * 30));
  ctx.fillStyle = '#7dffab';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText('—  Press ENTER to begin the night  —', CANVAS_WIDTH / 2, 480);
  ctx.fillStyle = '#8fa0bd';
  ctx.font = '14px Georgia, serif';
  ctx.fillText('Wren the archivist · three halls · three wardens on the first, four on the last', CANVAS_WIDTH / 2, 516);
  if (game.bestSeconds > 0) {
    ctx.fillStyle = '#ffd76a';
    ctx.font = '15px Georgia, serif';
    ctx.fillText(`Best escape so far: ${formatTime(game.bestSeconds)}`, CANVAS_WIDTH / 2, 544);
  }
  void world;
}

/** Draw one frame of the game. `game` carries world, screen and stats. */
export function drawGame(ctx, game) {
  const { world } = game;
  const decoration = decorationFor(world.level, world.levelIndex);
  ctx.fillStyle = '#070b16';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawFloor(ctx, world, decoration);
  drawShadowTile(ctx, world);
  drawLampPools(ctx, world);
  drawFurniture(ctx, world, decoration);
  drawExit(ctx, world);
  drawLedgerAndSeals(ctx, world);
  // The night veil falls over the hall, but cones, wardens and thief are
  // drawn after it, so they stay bright against the dark floor.
  drawDarkness(ctx, world);
  for (const guard of world.guards) drawCone(ctx, world, guard);
  for (const guard of world.guards) drawGuard(ctx, world, guard);
  drawPlayer(ctx, world);
  drawParticles(ctx, world);
  drawHud(ctx, game);
  if (game.coverTitle) drawCoverTitle(ctx);

  if (game.screen === 'title') drawTitle(ctx, game);
  else if (game.screen === 'paused') {
    panel(ctx, 'PAUSED', ['The wardens wait. Take a breath.', 'ENTER — keep sneaking      R — restart this hall'], '#ffd76a');
  } else if (game.screen === 'level-done') {
    panel(ctx, 'HALL CLEARED', [
      `Hall ${world.levelIndex + 1} escaped in ${formatTime(game.levelSeconds)} — seals ${world.sealsTaken}/${world.seals.length}.`,
      game.levelRating,
      'ENTER — slip into the next hall',
    ], '#7dffab');
  } else if (game.screen === 'caught') {
    ctx.fillStyle = `rgba(180, 20, 20, ${0.18 + 0.1 * Math.sin(world.time * 6)})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    panel(ctx, 'SPOTTED!', [
      'A warden laid hands on Wren.',
      game.lives > 0 ? `${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left — the night is not over.` : 'No lives left.',
      'ENTER — try this hall again',
    ], '#ff4646');
  } else if (game.screen === 'game-over') {
    panel(ctx, 'CAUGHT IN THE DARK', [
      'The wardens found Wren three times. The archive keeps its ledger… for now.',
      `You escaped ${game.hallsCleared} ${game.hallsCleared === 1 ? 'hall' : 'halls'}.`,
      'ENTER — begin the night again',
    ], '#ff4646');
  } else if (game.screen === 'win') {
    panel(ctx, 'THE LEDGER IS SAFE', [
      `All three halls escaped in ${formatTime(game.elapsed)} — seals ${game.totalSeals}/9.`,
      game.finalRating,
      'ENTER — play the night again',
    ], '#ffd76a');
  }
}
