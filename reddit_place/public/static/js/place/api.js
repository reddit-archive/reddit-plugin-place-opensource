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
     * @param {string} color
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
  };
});
