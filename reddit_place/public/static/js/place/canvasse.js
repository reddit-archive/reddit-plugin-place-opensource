!r.placeModule(function canvasse(require) {
  /**
   * A dict with red, green, and blue color values.  Each color
   * is an int between 0 and 255.
   * @typedef {Object} Color
   * @property {number} red
   * @property {number} green
   * @property {number} blue
   */

  /**
   * Utility to parse a hex color string into a color object
   * @function
   * @param {string} hexColor A css hex color, including the # prefix
   * @returns {Color}
   */
  function parseHexColor(hexColor) {
    var colorVal = parseInt(hexColor.slice(1), 16);
    return {
      red: colorVal >> 16 & 0xFF,
      green: colorVal >> 8 & 0xFF,
      blue: colorVal & 0xFF,
    };
  }

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
    hasBufferedUpdates: false,
    hasUnbufferedUpdates: false,

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
    },

    /**
     * Draw a color to the buffer canvas and immediately update.
     * Coordinates are in canvas pixels, not screen pixels.
     * @deprecated Use drawTileToDisplay or drawTileToBuffer
     * @function
     * @param {int} x
     * @param {int} y
     * @param {string} color Any valid css color string
     */
    drawTileAt: function(x, y, color) {
      // TODO - clean this up. Eventually we'll want to be able to draw
      // without actually updating the buffer canvas.
      this.drawTileToBuffer(x, y, color);
      this.updateFromBuffer();
    },

    /**
     * Draw a color to the display canvas
     * Used for optimistic updates or temporary drawing for UI purposes.
     * Updates will be lost if updateFromBuffer is called.
     * @function
     * @param {int} x
     * @param {int} y
     * @param {string} color Any valid css color string
     */
    drawTileToDisplay: function(x, y, color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, 1, 1);
      this.hasUnbufferedUpdates = true;
    },

    /**
     * Draw a color to the buffer canvas
     * Does not update the display canvas. Call updateFromBuffer to copy
     * buffered updates to the display.
     * @function
     * @param {int} x
     * @param {int} y
     * @param {string} color Any valid css color string
     */
    drawTileToBuffer: function(x, y, color) {
      this.bufferCtx.fillStyle = color;
      this.bufferCtx.fillRect(x, y, 1, 1);
      this.hasBufferedUpdates = true;
    },

    /**
     * Update the display canvas by drawing from the buffered canvas
     * @function
     */
    updateFromBuffer: function() {
      this.ctx.drawImage(this.bufferEl, 0, 0, this.width, this.height);
      this.hasBufferedUpdates = false;
      this.hasUnbufferedUpdates = false;
    },

    /**
     * Updates the canvas given a state returned from the API.
     * Note that if the API payload shape changes, this will need to update.
     * @function
     * @param {Object} state The state returned from the API call that returns the
     *    canvas state.
     */
    setState: function(state) {
      var width = this.width;
      var height = this.height;
      // The current shape of the API payload is an array of pixels, where
      // each pixel is an array containing x, y, and metadata; and metadata
      // is a dict containing the color, timestamp, and fullname of the user
      // that placed it.

      // We need to convert this into a Uint8ClampedArray to write it to the
      // canvas, where each pixel is represented by 4 items in the array – the
      // red, green, blue, and alpha channels of the color.
      var pixelDataLength = 4 * width * height;
      var pixelData = new Uint8ClampedArray(pixelDataLength);

      // Iterate over the state and update the pixelData array.
      state.forEach(function(pixelState) {
        var x = pixelState[0];
        var y = pixelState[1];
        var color = parseHexColor(pixelState[2].color);

        // The normal formula for finding the index in a flat-array representation
        // of a 2D grid for given (x, y) coordinates is: i = y * width + x
        // Since this array holds 4 sequential items per pixel, we'll need to
        // multiply by 4 as well to get the *first* index;
        var i = 4 * (y * width + x);

        pixelData[i] = color.red;
        pixelData[i+1] = color.green;
        pixelData[i+2] = color.blue;
        // Just set alpha to full transparency.
        pixelData[i+3] = 255;
      }, this);

      var imageData = new ImageData(pixelData, width, height);
      this.bufferCtx.putImageData(imageData, 0, 0);
      this.updateFromBuffer();
    },
  };
});
