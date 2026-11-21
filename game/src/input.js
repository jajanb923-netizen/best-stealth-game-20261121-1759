// Moonlit Archive — keyboard and mouse, translated to game coordinates.
// WASD / arrows move, Shift sneaks, a click throws an inkwell at that tile.
import { BOARD_X, BOARD_Y, COLS, ROWS, TILE } from './config.js';

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    click: null, // {x, y} in canvas pixels, consumed by main.js each frame
    onFirstGesture: null,
    attach() {
      window.addEventListener('keydown', (event) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
        keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
        if (input.onFirstGesture) input.onFirstGesture();
      });
      window.addEventListener('keyup', (event) => {
        keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
      });
      window.addEventListener('blur', () => keys.clear());
      canvas.addEventListener('mousedown', (event) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        input.click = {
          x: (event.clientX - rect.left) * scaleX,
          y: (event.clientY - rect.top) * scaleY,
        };
        if (input.onFirstGesture) input.onFirstGesture();
      });
      canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    },
  };
  return input;
}

/** Read the movement vector and modifiers from the pressed keys. */
export function readMove(input) {
  const keys = input.keys;
  let x = 0;
  let y = 0;
  if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('d') || keys.has('ArrowRight')) x += 1;
  if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('s') || keys.has('ArrowDown')) y += 1;
  return {
    x,
    y,
    sneak: keys.has('Shift'),
    run: keys.has(' ') || keys.has('Spacebar'),
  };
}

/** True when the named key was pressed since the last check. */
export function pressed(input, ...names) {
  for (const name of names) {
    if (input.keys.has(name)) {
      input.keys.delete(name);
      return true;
    }
  }
  return false;
}

/** A click inside the board, as board pixel coordinates, or null. */
export function takeClick(input) {
  const click = input.click;
  input.click = null;
  if (!click) return null;
  if (click.x < BOARD_X || click.x > BOARD_X + COLS * TILE) return null;
  if (click.y < BOARD_Y || click.y > BOARD_Y + ROWS * TILE) return null;
  return click;
}
