!r.placeModule('notificationbutton', function(require) {
  var $ = require('jQuery');

  return {
    $el: null,
    initialized: false,

    init: function(el) {
      this.$el = $(el);
      this.$el.removeClass('place-uninitialized');
      this.$el.show();
      this.initialized = true;
    },

    showNotificationOff: function() {
      if (!this.initialized) { return; }
      this.$el.removeClass('place-notification-on');
    },

    showNotificationOn: function() {
      if (!this.initialized) { return; }
      this.$el.addClass('place-notification-on');
    },
  };
});
