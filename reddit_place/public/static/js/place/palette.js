!r.placeModule('palette', function(require) {
  var $ = require('jQuery');

  // Generates the color palette UI
  return {
    el: null,
    initialized: false,

    /**
     * Initialize the color palette UI
     * @function
     * @param {HTMLElement} el The parent element to hold the UI
     * @param {string[]} colors A list of valid css color strings
     */
    init: function(el, colors) {
      this.el = el;
      $(el).removeClass('place-uninitialized');
      this.initialized = true;

      colors.forEach(function(color, index) {
        this.buildSwatch(color, index);
      }, this);
    },

    /**
     * Build a color swatch element.
     * @function
     * @param {string} color A valid css color string
     * @returns {HTMLElement}
     */
    buildSwatch: function(color, index) {
      if (!this.initialized) { return; }
      var div = document.createElement('div');
      $(div)
      .css('backgroundColor', color)
      .data('color', index)
      .addClass(this.SWATCH_CLASS);
      this.el.appendChild(div);
      return div;
    },
  };
});
