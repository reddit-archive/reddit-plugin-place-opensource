!r.placeModule(function canvasse(require) {
  // Model the state of the canvas
  // This is really just a thin wrapper around the native canvas API.
  return {
    WIDTH: 200,
    HEIGHT: 200,

    el: null,
    ctx: null,

    /**
     * Initialize the Canvasse
     * @function
     * @param {HTMLCavasElement} el The canvas element to draw into
     */
    init: function(el) {
      this.el = el;
      this.el.width = this.WIDTH;
      this.el.height = this.HEIGHT;
      this.ctx = this.el.getContext('2d');
    },

    /**
     * Draw a color to the canvas.
     * Only handles updating the local canvas.
     * Coordinates are in canvas pixels, not screen pixels.
     * @function
     * @param {int} x
     * @param {int} y
     * @param {string} color Any valid css color string
     */
    drawTileAt: function(x, y, color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, 1, 1);
    },
  };
});
