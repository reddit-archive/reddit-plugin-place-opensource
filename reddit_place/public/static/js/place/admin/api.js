r.placeModule('adminapi', function(require) {
  var r = require('r');

  return {
    /**
     * POST to the drawrect API
     * Admins only! Super secret
     * @function
     * @param {int} x
     * @param {int} y
     * @param {int} width
     * @param {int} height
     * @param {string} color
     * @returns {Promise}
     */
    drawRect: function(x, y, width, height, color) {
      return r.ajax({
        url: '/api/place/drawrect.json',
        type: 'POST',
        data: {
          x: x,
          y: y,
          width: width,
          height: height,
          color: color,
        },
      });
    },
  };
});
