// Moonlit Archive — a tiny seeded generator, so the decoration (floor speckles,
// book-spine colours, dust motes) is the same on every load and every shot.
export function makeRandom(seed) {
  let state = seed >>> 0 || 1;
  return function random() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

export function range(random, min, max) {
  return min + random() * (max - min);
}
