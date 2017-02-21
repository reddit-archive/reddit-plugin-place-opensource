!r.placeModule('slider', function(require) {
  var $ = require('jQuery');
  var r = require('r');

  var bindEvents = require('utils').bindEvents;
  var Client = require('client');

  var ZOOM_LEVELS = [
    .25,
    .5,
    1,
    Client.ZOOM_MIN_SCALE,
    Client.ZOOM_MAX_SCALE,
  ];

  r.hooks.get('place.init').register(function() {
    var palette = document.getElementById('place-palette');
    var slider = $.parseHTML('<input type="range" min="0" step="1">')[0];

    $(slider)
      .attr('max', ZOOM_LEVELS.length - 1)
      .attr('value', ZOOM_LEVELS.length - 1)
      .css('width', '100px');
    palette.appendChild(slider);

    bindEvents(slider, {
      'input': function(e) {
        var zoomLevel = ZOOM_LEVELS[slider.value];
        Client.setTargetZoom(zoomLevel);
      },

      'mousedown': function(e) {
        Client.disablePan();
      },

      'mouseup': function(e) {
        Client.enablePan();
      },
    });
  });
});
