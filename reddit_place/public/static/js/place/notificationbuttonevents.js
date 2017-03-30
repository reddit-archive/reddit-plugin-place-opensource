!r.placeModule('notificationbuttonevents', function(require) {
  var $ = require('jQuery');
  var Client = require('client');

  return {
    'click': function(e) {
      Client.toggleNotificationButton();
    },
  };
});
