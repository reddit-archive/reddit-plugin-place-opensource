!r.placeModule('zoombuttonevents', function(require) {
  var $ = require('jQuery');
  var Client = require('client');

  return {
    'click': function(e) {
      Client.toggleZoom();
    },
  };
});
