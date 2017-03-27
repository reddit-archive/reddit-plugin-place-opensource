!r.placeModule('mollyguard', function(require) {
  var $ = require('jQuery');

  return {
    $el: null,
    initialized: false,

    init: function(el) {
      this.$el = $(el);
      this.$el.removeClass('place-uninitialized');
      this.initialized = true;
    },

    showUnlocked: function() {
      if (!this.initialized) { return; }
      this.$el.removeClass('place-locked');
    },

    showLocked: function() {
      if (!this.initialized) { return; }
      this.$el.addClass('place-locked');
    },
  };
});
