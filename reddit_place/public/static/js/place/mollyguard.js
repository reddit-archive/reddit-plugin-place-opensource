!r.placeModule('mollyguard', function(require) {
  var $ = require('jQuery');

  return {
    $el: null,

    init: function(el) {
      this.$el = $(el);
    },

    showUnlocked: function() {
      this.$el.removeClass('place-locked');
    },

    showLocked: function() {
      this.$el.addClass('place-locked');
    },
  };
});
