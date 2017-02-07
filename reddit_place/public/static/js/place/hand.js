!r.placeModule(function hand(require) {
  var $ = require('jQuery');

  return {
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
     * Update the css transforms.
     * @function
     * @param {number} x The horizontal offset
     * @param {number} y The vertical offset
     * @param {number} rotateZ The amount to rotate around the z axis
     */
    updateTransform: function(x, y, rotateZ) {
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
      $(this.swatch).css({
        display: 'none',
      });
    },
  };
});
