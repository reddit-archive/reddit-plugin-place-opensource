!r.placeModule('paletteevents', function(require) {
  var $ = require('jQuery');
  var Client = require('client');

  // Events pushed from the server over websockets, primarily representing
  // actions taken by other users.
  // Events coming from the color palette UI
  return {
    'click': function(e) {
      var color = $(e.target).data('color');
      if (typeof color !== "undefined") {
        Client.setColor(color);
      }
    },
  };
});
