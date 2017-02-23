!r.placeModule('camera', function(require) {
  var $ = require('jQuery');

  // Manages camera position and zoom level.
  return {
    zoomElement: null,
    panElement: null,

    /**
     * Initialize the camera.
     * @function
     * @param {HTMLElement} zoomElement The element to apply scale transforms on.
     * @param {HTMLElement} panElement The element to apply translate transforms
     *    on.  Should be a child of zoomElement!
     */
    init: function(zoomElement, panElement) {
      this.zoomElement = zoomElement;
      this.panElement = panElement;
    },

    /**
     * Update the scale transform on the zoomElement element.
     * @function
     * @param {number} s The scale
     */
    updateScale: function(s) {
      $(this.zoomElement).css({
        transform: 'scale(' + s + ',' + s + ')',
      });
    },

    /**
     * Update the translate transform on the panElement element.
     * @function
     * @param {number} x The horizontal offset
     * @param {number} y The vertical offset
     */
    updateTranslate: function(x, y) {
      $(this.panElement).css({
        transform: 'translate(' + x + 'px,' + y + 'px)',
      });
    },
  };
});
