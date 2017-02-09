!r.placeModule(function hand(require) {
  var $ = require('jQuery');

  return {
    enabled: true,
    hand: null,
    swatch: null,

    /**
     * Initialize the hand.
     * @function
     * @param {HTMLElement} hand The hand container, used for position
     * @param {HTMLElement} swatch The swatch container, used for color
     */
    init: function(hand, swatch) {
      this.hand = hand;
      this.swatch = swatch;
    },

    /**
     * Disable the hand UI.  Intended for touch input support.
     * @function
     */
    disable: function() {
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
