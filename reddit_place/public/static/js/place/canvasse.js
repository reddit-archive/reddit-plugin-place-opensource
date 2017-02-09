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

    /**
     * Initialize the Canvasse
     * @function
     * @param {HTMLCavasElement} el The canvas element to draw into
     * @param {number} width
     * @param {number} height
     */
    init: function(el, width, height) {
      this.el = el;
      this.width = width;
      this.height = height;
      this.el.width = width;
      this.el.height = height;
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
      this.ctx.putImageData(imageData, 0, 0);
    },
  };
});
