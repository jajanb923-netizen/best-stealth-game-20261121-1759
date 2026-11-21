// Moonlit Archive — tuning numbers. Every speed, range and rate the stealth
// simulation uses lives here, so balancing is one file.
export const TILE = 40;
export const COLS = 30;
export const ROWS = 15;
export const HUD_HEIGHT = 72;
export const BOARD_X = 40;
export const BOARD_Y = 72;
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const PLAYER = {
  radius: 13,
  walkSpeed: 150,
  sneakSpeed: 82,
  runSpeed: 205,
  noiseWalk: 70,
  noiseRun: 150,
  noiseSneak: 26,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  chaseSpeed: 138,
  searchSpeed: 88,
  viewDistance: 235,
  viewDistanceShadow: 95,
  viewDistanceSneak: 175,
  halfAngle: 0.62, // radians, about 35 degrees each side
  closeRange: 52, // inside this, a guard sees you even in shadow
  catchDistance: 20,
  // Suspicion 0..100. Rates per second.
  riseLit: 95,
  riseShadow: 34,
  riseSneak: 0.55, // multiplier while the player sneaks
  fall: 26,
  alertAt: 100,
  suspiciousAt: 35,
  memorySeconds: 3.2, // how long a guard chases a lost player
  searchSeconds: 4.0,
};

export const GAME = {
  lives: 3,
  inkwells: 3,
  parSeconds: [150, 180, 210],
  levelNames: ['The Reading Room', 'The Gallery of Maps', 'The Vault of Ledgers'],
  levelSubtitles: [
    'Recover the Moonpearl Ledger — slip past the Night Wardens.',
    'The wardens walk longer rounds here. Shadows are your friends.',
    'One last hall. The vault door only opens for the ledger-bearer.',
  ],
};
