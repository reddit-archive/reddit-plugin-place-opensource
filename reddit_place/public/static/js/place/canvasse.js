!r.placeModule('canvasse', function(require) {
  /**
   * A dict with red, green, and blue color values.  Each color
   * is an int between 0 and 255.
   * @typedef {Object} Color
   * @property {number} red
   * @property {number} green
   * @property {number} blue
   */

  var $ = require('jQuery');

  // Model the state of the canvas
  // This is really just a thin wrapper around the native canvas API.
  return {
    width: 0,
    height: 0,
    el: null,
    ctx: null,
    bufferEl: null,
    bufferCtx: null,
    // TODO - not sure if I'll actually need these yet, remove if they aren't
    // getting used.
    // Flags to let us know when the two canvases are out of sync  
    isBufferDirty: false,
    isDisplayDirty: false,

    /**
     * Initialize the Canvasse
     * @function
     * @param {HTMLCavasElement} el The canvas element to draw into
     * @param {number} width
     * @param {number} height
     */
    init: function(el, width, height) {
      this.width = width;
      this.height = height;

      // The canvas state as visible to the user
      this.el = el;
      this.el.width = width;
      this.el.height = height;
      this.ctx = this.el.getContext('2d');

      // The actual canvas state.  This canvas is hidden, to allow us to do
      // stuff like pause rendering of incoming updates without losing them,
      // or to optimistically render changes made by the user and revert them
      // if they fail, etc.
      this.bufferEl = document.createElement('canvas');
      this.bufferCtx = this.bufferEl.getContext('2d');
      this.bufferEl.width = width;
      this.bufferEl.height = height;

      this.img = new Image();
      this.img.width = width;
      this.img.height = height;
      $(this.img).addClass('place-canvas');
      $(this.el).parent().append(this.img);
      $(this.el).detach();

      // This array buffer will hold color data to be drawn to the canvas.
      this.buffer = new ArrayBuffer(width * height * 4);
      // This view into the buffer is used to construct the PixelData object
      // for drawing to the canvas
      this.readBuffer = new Uint8ClampedArray(this.buffer);
      // This view into the buffer is used to write.  Values written should be
      // 32 bit colors stored as AGBR (rgba in reverse).
      this.writeBuffer = new Uint32Array(this.buffer);
    },

    /**
     * Draw a color to the buffer canvas and immediately update.
     * Coordinates are in canvas pixels, not screen pixels.
     * @deprecated Use drawTileToDisplay or drawTileToBuffer
     * @function
     * @param {int} x
     * @param {int} y
     * @param {number} color AGBR color number
     */
    drawTileAt: function(x, y, color) {
      // TODO - clean this up. Eventually we'll want to be able to draw
      // without actually updating the buffer canvas.
      this.drawTileToBuffer(x, y, color);
      this.drawBufferToDisplay();
    },

    /**
     * Draw a color to the display canvas
     * Used for optimistic updates or temporary drawing for UI purposes.
     * Updates will be lost if drawBufferToDisplay is called.
     * @function
     * @param {int} x
     * @param {int} y
     * @param {string} color Any valid css color string
     */
    drawTileToDisplay: function(x, y, color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, 1, 1);
      this.isDisplayDirty = true;
    },

    /**
     * Fill a rectangle on the display canvas with the given color.
     * @function
     * @param {int} x
     * @param {int} y
     * @param {int} width
     * @param {int} height
     * @param {string} color Any valid css color string
     */
    drawRectToDisplay: function(x, y, width, height, color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, width, height);
      this.isDisplayDirty = true;
    },

    /**
     * Fill a rectangle on the display canvas with the given color.
     * @function
     * @param {int} x
     * @param {int} y
     * @param {int} width
     * @param {int} height
     */
    clearRectFromDisplay: function(x, y, width, height) {
      this.ctx.clearRect(x, y, width, height);
      this.isDisplayDirty = true;
    },

    /**
     * Draw a color to the buffer canvas
     * Does not update the display canvas. Call drawBufferToDisplay to copy
     * buffered updates to the display.
     * @function
     * @param {int} x
     * @param {int} y
     * @param {number} color AGBR color
     */
    drawTileToBuffer: function(x, y, color) {
      var i = this.getIndexFromCoords(x, y);
      this.setBufferState(i, color);
    },

    /**
     * Get the flat-array index of the tile at the given coordinates
     * @function
     * @param {int} x
     * @param {int} y
     * @returns {int} 
     */
    getIndexFromCoords: function(x, y) {
      return y * this.width + x;
    },

    /**
     * Draw a color to the buffer canvas
     * Does not update the display canvas. Call drawBufferToDisplay to copy
     * buffered updates to the display.
     * @function
     * @param {int} i
     * @param {number} color AGBR color
     */
    setBufferState: function(i, color) {
      this.writeBuffer[i] = color;
      this.isBufferDirty = true;
    },

    /**
     * Update the display canvas by drawing from the buffered canvas
     * @function
     */
    drawBufferToDisplay: function() {
      var imageData = new ImageData(this.readBuffer, this.width, this.height);
      this.ctx.putImageData(imageData, 0, 0);
      this.isBufferDirty = false;
      // Safari yeeeesh
      this.img.src = this.el.toDataURL();
    },
  };
});
