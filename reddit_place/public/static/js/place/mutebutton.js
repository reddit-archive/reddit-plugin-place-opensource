!r.placeModule('mutebutton', function(require) {
  var $ = require('jQuery');

  return {
    $el: null,

    init: function(el) {
      this.$el = $(el);
    },

    showMute: function() {
      this.$el.removeClass('place-muted');
    },

    showUnmute: function() {
      this.$el.addClass('place-muted');
    },
  };
});
