!r.placeModule(function init(require) {
  var $ = require('jQuery');
  var r = require('r');
  var AudioManager = require('audio');
  var Camera = require('camera');
  var CameraEvents = require('cameraevents');
  var CanvasEvents = require('canvasevents');
  var Canvasse = require('canvasse');
  var Client = require('client');
  var Cursor = require('cursor');
  var ColorPalette = require('palette');
  var PaletteEvents = require('paletteevents');
  var WebsocketEvents = require('websocketevents');

  /**
   * Utility for binding a bunch of events to a single element.
   * @function
   * @param {HTMLElement} target
   * @param {Object<function>} eventsDict A dictionary of event handling functions.
   *    Each key should be the name of the event to bind the handler to.
   * @param {bool} [useCapture] Whether to use event capturing.  Defaults to true.
   */
  function bindEvents(target, eventsDict, useCapture) {
    useCapture = useCapture === undefined ? true : useCapture;

    for (var event in eventsDict) {
      // If useCapture changes from true to false,
      // CanvasEvents.mouseup will stop working correctly
      target.addEventListener(event, eventsDict[event], true);
    }
  }

  // Init code:
  $(function() {
    var COLORS = [
      '#FFFFFF',
      '#949494',
      '#353535',
      '#FF4500',
      '#0DD3BB',
      '#24A0ED',
      '#FF8717',
      '#FFB000',
      '#94E044',
      '#46D160',
      '#7193FF',
      '#DDBD37',
      '#FFD635',
      '#FF585B',
      '#EA0027',
    ];

    var container = document.getElementById('place-container');
    var viewer = document.getElementById('place-viewer');
    var canvas = document.getElementById('place-canvasse');
    var palette = document.getElementById('place-palette');

    AudioManager.init();
    Camera.init(viewer, canvas);
    Client.init(COLORS[2]);
    Canvasse.init(canvas);
    ColorPalette.init(palette, COLORS);

    var websocket = new r.WebSocket(r.config.place_websocket_url);
    websocket.on(WebsocketEvents);
    websocket.start();

    bindEvents(container, CameraEvents);
    bindEvents(canvas, CanvasEvents);
    bindEvents(palette, PaletteEvents);

    bindEvents(container, {
      'mouseout': function(e) {
        // Events are stupid
        if (e.target === canvas || e.relatedTarget === canvas) { return; }

        if (Cursor.isDown) {
          return CameraEvents['mouseup'](e);
        }
      },
    });

    r.place = Client;
  });
});
