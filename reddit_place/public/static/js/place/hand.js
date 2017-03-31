!r.placeModule('hand', function(require) {
  var $ = require('jQuery');

  return {
    enabled: true,
    hand: null,
    swatch: null,
    visible: false,

    /**
     * Initialize the hand.
     * @function
     * @param {HTMLElement} hand The hand container, used for position
     * @param {HTMLElement} swatch The swatch container, used for color
     * @param {HTMLElement} cursor The cursor element, used to show where
     *    the tile will be placed
     */
    init: function(hand, swatch, cursor) {
      this.hand = hand;
      this.swatch = swatch;
      this.cursor = cursor;
    },

    /**
     * Disable the hand UI.  Intended for touch input support.
     * @function
     */
    disable: function() {
      if (this.visible) {
        this.hideCursor();
      }
      this.enabled = false;
      $(this.hand).css({ display: 'none' });
    },

    /**
     * Re-enable the hand UI
     * Note that this might be a little janky, since the disabled flag
     * currently prevents all other updates from applying.  Its likely that
     * the color & position will be wrong until updated after re-enabling, so
     * if this is actually needed then it might need reworking.
     * @function
     */
    enable: function() {
      this.enabled = true;
      $(this.hand).css({ display: 'block' });
      if (this.visible) {
        this.showCursor();
      }
    },

    /**
     * Update the css transforms.
     * @function
     * @param {number} x The horizontal offset
     * @param {number} y The vertical offset
     * @param {number} rotateZ The amount to rotate around the z axis
     */
    updateTransform: function(x, y, rotateZ) {
      if (!this.enabled) { return; }
      $(this.hand).css({
        transform: 'translateX(' + x + 'px) '+ 
                   'translateY(' + y + 'px) '+
                   'rotateZ(' + rotateZ + 'deg)',
      });
    },

    /**
     * Update the css transforms.
     * @function
     * @param {number} x The horizontal offset
     * @param {number} y The vertical offset
     * @param {number} rotateZ The amount to rotate around the z axis
     */
    updateCursorTransform: function(x, y) {
      if (!this.enabled) { return; }
      // The -20 is hacky, but it forces this to align to the grid properly.
      // If the size of the pixels at max zoom level ever change, this'll need
      // to update.
      $(this.cursor).css({
        transform: 'translateX(' + (x - 20) + 'px) '+ 
                   'translateY(' + (y - 20) + 'px)'
      });
    },

    showCursor: function() {
      this.visible = true;
      if (!this.enabled) { return; }
      $(this.cursor).show();
    },

    hideCursor: function() {
      this.visible = false;
      if (!this.enabled) { return; }
      $(this.cursor).hide();
    },

    /**
     * Update the color displayed.
     * @function
     * @param {string} color A valid css color string
     */
    updateColor: function(color) {
      if (!this.enabled) { return; }
      $(this.swatch).css({
        backgroundColor: color,
        display: 'block',
      });
    },

    /**
     * Hide the color swatch element.
     * @function
     */
    clearColor: function() {
      if (!this.enabled) { return; }
      $(this.swatch).css({
        display: 'none',
      });
    },
  };
});
