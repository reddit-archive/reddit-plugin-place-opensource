!r.placeModule('coordinates', function(require) {
  return {
    $el: null,
    initialized: false,
    lastX: -1,
    lastY: -1,

    /**
     * Initialize the counter element.
     * @function
     * @param {HTMLElement} el
     * @param {number} x
     * @param {number} y
     */
    init: function(el, x, y) {
      this.$el = $(el);
      this.$el.removeClass('place-uninitialized');
      this.initialized = true;
      this.setCoordinates(x, y);
    },

    /**
     * Update the display
     * @function
     * @param {number} x
     * @param {number} y
     */
    setCoordinates: function(x, y) {
      if (!this.initialized) { return; }

      if (x !== this.lastX || y !== this.lastY) {
        this.lastX = x;
        this.lastY = y;
        this.$el.text('(' + x + ', ' + y + ')');
      }
    },
  };
});
