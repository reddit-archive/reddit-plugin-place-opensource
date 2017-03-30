!r.placeModule('zoombutton', function(require) {
  var $ = require('jQuery');

  return {
    $el: null,
    initialized: false,

    init: function(el) {
      this.$el = $(el);
      this.$el.removeClass('place-uninitialized');
      this.initialized = true;
    },

    showZoomOut: function() {
      if (!this.initialized) { return; }
      this.$el.removeClass('place-zoomed-out');
    },

    showZoomIn: function() {
      if (!this.initialized) { return; }
      this.$el.addClass('place-zoomed-out');
    },

    highlight: function(enabled) {
      if (!this.initialized) { return; }
      this.$el.toggleClass('place-zoom-pulsing', enabled);
    }
  };
});
