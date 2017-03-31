!r.placeModule('websocketevents', function(require) {
  var World = require('world');

  // Events pushed from the server over websockets, primarily representing
  // actions taken by other users.
  return {
    'connecting': function() {
      console.log('connecting');
    },

    'connected': function() {
      console.log('connected');
    },

    'disconnected': function() {
      console.log('disconnected');
    },

    'reconnecting': function(delay) {
      console.log('reconnecting in ' + delay + ' seconds...');
    },

    'message:place': function(message) {
      World.drawTile(message.x, message.y, message.color);
    },

    'message:batch-place': function(messages) {
      if (Array.isArray(messages)) {
        messages.forEach(function(message) {
          World.drawTile(message.x, message.y, message.color);
        });
      }
    },

    'message:activity': function(message) {
      if (message.count) {
        World.updateActivity(message.count);
      }
    },
  };
});
