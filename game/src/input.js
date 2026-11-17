// Pointer + keyboard input. Converts canvas pixels (the canvas is scaled to
// the window) into the fixed 1280x720 world coordinates the game uses.

export class Input {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.pointer = { x: 0, y: 0, down: false };

    const toWorld = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * 1280,
        y: ((e.clientY - rect.top) / rect.height) * 720,
      };
    };

    canvas.addEventListener('pointerdown', (e) => {
      const p = toWorld(e);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      this.pointer.down = true;
      game.handlePointerDown(p.x, p.y, e.shiftKey);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = toWorld(e);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      game.handlePointerMove(p.x, p.y);
    });
    canvas.addEventListener('pointerup', () => {
      this.pointer.down = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      game.handleKey(e.key.toLowerCase());
    });
  }
}
