!r.placeModule('mutebutton', function(require) {
  var $ = require('jQuery');

  return {
    $el: null,
    initialized: false,

    init: function(el) {
      this.$el = $(el);
      this.$el.removeClass('place-uninitialized');
      this.initialized = true;
    },

    showMute: function() {
      if (!this.initialized) { return; }
      this.$el.removeClass('place-muted');
    },

    showUnmute: function() {
      if (!this.initialized) { return; }
      this.$el.addClass('place-muted');
    },
  };
});
