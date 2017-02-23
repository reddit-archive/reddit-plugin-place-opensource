!r.placeModule(function api(require) {
  var r = require('r');

  // Collection of functions that call out to the backend API.
  // All requests made to the banckend from the client are defined here.
  return {
    /**
     * POST to the draw API
     * @function
     * @param {int} x,
     * @param {int} y,
     * @param {int} color index
     * @returns {Promise}
     */
    draw: function(x, y, color) {
      return r.ajax({
        url: '/api/place/draw.json',
        type: 'POST',
        data: {
          x: x,
          y: y,
          color: color,
        },
      });
    },

    /**
     * GET a bitmap representation of the board state
     * @function
     * @returns {Promise}
     */
    getCanvasBitmapState: function() {
      var dfd = $.Deferred();

      // Make request for board bitmap
      var oReq = new XMLHttpRequest();
      oReq.responseType = "arraybuffer";
      resp = oReq.open("GET", "/api/place/board-bitmap", true);
      oReq.onload = function (oEvent) {

        var arrayBuffer = oReq.response;
        if (!arrayBuffer) { dfd.resolve(); }

        // Parse the bitmap as a series of bytes, each byte containing 2
        // uint4s representing the color index of the pixel.
        var timestamp = new Uint32Array(arrayBuffer, 0, 1);
        var canvasBitmap = new Uint8Array(arrayBuffer, timestamp.BYTES_PER_ELEMENT * timestamp.length);
        var canvas = [];
        for (var i = 0; i < canvasBitmap.byteLength; i++) {

          // Get the left pixel (first 4 bits) from the byte
          canvas.push(canvasBitmap[i] >> 4);

          // Get the right pixel (last 4 bits) from the byte
          canvas.push(canvasBitmap[i] & 15);

        }
        dfd.resolve(timestamp, new Uint8Array(canvas));
      };
      oReq.send(null);
      return dfd.promise();
    },

    /**
     * GET the canvas state from the API.
     * The payload is passed directly along to canvasse.js#setState.
     * @function
     * @returns {Promise}
     */
    getCanvasState: function() {
      return r.ajax({
        url: '/api/place/state.json',
        type: 'GET',
      });
    },

    /**
     * GET the amount of time remaining on the current user's cooldown.
     * @function
     * @returns {Promise<number>}
     */
    getTimeToWait: function() {
      return r.ajax({
        url: '/api/place/time.json',
        type: 'GET',
      }).then(function onSuccess(responseJSON, status, jqXHR) {
        return 1000 * responseJSON.wait_seconds
      });
    },
  };
});
