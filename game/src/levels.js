// Moonlit Archive — the three halls. Each map is 30 x 15 tiles.
//   # wall   . floor   B bookshelf (blocks sight + movement)
//   C crate (blocks sight + movement, low cover)   S shadow floor (hides you)
//   P potted plant (blocks movement, not sight)   E exit door
//   K the Moonpearl Ledger   * archive seal (collectible)   T player start
// Guards patrol the waypoint lists; lamps are wall lamps that pool warm light.
export const LEVELS = [
  {
    name: 'The Reading Room',
    map: [
      '##############################',
      '#T....S......B......B.......E#',
      '#............B......B........#',
      '#.BB....C..........C....*....#',
      '#............B......B........#',
      '#..C.....B........B.......B..#',
      '#......S...........S.........#',
      '#..B.........C..........B....#',
      '#............B.....C....B....#',
      '#.S....C.............*.......#',
      '#.....B......B.....B......B..#',
      '#............B......B........#',
      '#..*.....S.........C......B..#',
      '#............B......K........#',
      '##############################',
    ],
    guards: [
      { waypoints: [[12, 2], [12, 12]], pause: 1.2 },
      { waypoints: [[4, 9], [20, 9]], pause: 1.6 },
    ],
    lamps: [[7, 1], [22, 1], [4, 7], [26, 13], [15, 13]],
    seals: 3,
  },
  {
    name: 'The Gallery of Maps',
    map: [
      '##############################',
      '#T.....B......S.......B.....E#',
      '#......B..............B......#',
      '#.C..........C....B......*...#',
      '#......B......S.......B......#',
      '#..S.......B.......C......B..#',
      '#......B......B.......S......#',
      '#..B.......C......B.......B..#',
      '#......S......B.......C......#',
      '#.C.......B.......S......*...#',
      '#......B......B.......B......#',
      '#..S.......C......B.......B..#',
      '#......B......S.......C......#',
      '#..*.......B......K.......B..#',
      '##############################',
    ],
    guards: [
      { waypoints: [[8, 2], [8, 12]], pause: 1.0 },
      { waypoints: [[4, 7], [25, 7]], pause: 1.4 },
      { waypoints: [[21, 2], [21, 12]], pause: 1.2 },
    ],
    lamps: [[5, 1], [25, 1], [15, 6], [2, 10], [27, 12]],
    seals: 3,
  },
  {
    name: 'The Vault of Ledgers',
    map: [
      '##############################',
      '#T...S....B.....B......C....E#',
      '#........B......B............#',
      '#.B...C......S.....B....*....#',
      '#........B......B......B.....#',
      '#..C........B.......S.....B..#',
      '#...S...B.......C......B.....#',
      '#.B........C......B......S...#',
      '#........B......S.......B....#',
      '#..S...C.......B......C...*..#',
      '#........B......B......B.....#',
      '#.B....S.....C.......B.......#',
      '#........B......S.......C....#',
      '#..*.......B......K.......B..#',
      '##############################',
    ],
    guards: [
      { waypoints: [[6, 2], [6, 12]], pause: 0.9 },
      { waypoints: [[4, 7], [25, 7]], pause: 1.2 },
      { waypoints: [[20, 2], [20, 12]], pause: 1.0 },
      { waypoints: [[4, 11], [25, 11]], pause: 1.5 },
    ],
    lamps: [[6, 1], [24, 1], [15, 6], [2, 9], [27, 13], [12, 13]],
    seals: 3,
  },
];

/** Tile character at (col, row) of a level map. */
export function tileAt(level, col, row) {
  if (row < 0 || row >= level.map.length) return '#';
  const line = level.map[row];
  if (col < 0 || col >= line.length) return '#';
  return line[col];
}

/** True when a tile blocks movement. */
export function blocksMovement(tile) {
  return tile === '#' || tile === 'B' || tile === 'C' || tile === 'P';
}

/** True when a tile blocks a guard's line of sight. */
export function blocksSight(tile) {
  return tile === '#' || tile === 'B' || tile === 'C';
}

/** Find every tile holding `char` in a level map. */
export function findTiles(level, char) {
  const found = [];
  for (let row = 0; row < level.map.length; row += 1) {
    for (let col = 0; col < level.map[row].length; col += 1) {
      if (level.map[row][col] === char) found.push([col, row]);
    }
  }
  return found;
}
