!function(r, $, _){
  // Generates the color palette UI
  var ColorPalette = {
    el: null,

    /**
     * Initialize the color palette UI
     * @function
     * @param {HTMLElement} el The parent element to hold the UI
     * @param {string[]} colors A list of valid css color strings
     */
    init: function(el, colors) {
      this.el = el;

      colors.forEach(function(color) {
        var swatch = this._buildSwatch(color);
        el.appendChild(swatch);
      }, this);
    },

    /**
     * Build a color swatch element.
     * @function
     * @param {string} color A valid css color string
     * @returns {HTMLElement}
     */
    _buildSwatch: function(color, index) {
      var div = document.createElement('div');
      $(div)
      .css('backgroundColor', color)
      .data('color', color)
      .addClass(this.SWATCH_CLASS);
      return div;
    },
  };

  r.placeColorPalette = ColorPalette;
}(r, jQuery, _);
