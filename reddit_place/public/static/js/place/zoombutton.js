!r.placeModule('zoombutton', function(require) {
  var $ = require('jQuery');

  return {
    $el: null,

    init: function(el) {
      this.$el = $(el);
    },

    showZoomOut: function() {
      this.$el.removeClass('place-zoomed-out');
    },

    showZoomIn: function() {
      this.$el.addClass('place-zoomed-out');
    },
  };
});
