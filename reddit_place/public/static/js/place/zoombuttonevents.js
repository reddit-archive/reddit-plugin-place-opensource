!r.placeModule('zoombuttonevents', function(require) {
  var $ = require('jQuery');
  var Client = require('client');
  var ZoomButton = require('zoombutton');

  return {
    'click': function(e) {
      Client.toggleZoom();
      Client.setZoomButtonClicked(1);
      ZoomButton.highlight(false);
    },
  };
});
