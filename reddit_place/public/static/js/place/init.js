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
  var Palette = require('palette');
  var Hand = require('hand');
  var PaletteEvents = require('paletteevents');
  var WebsocketEvents = require('websocketevents');


  /**
   * Utility for kicking off an animation frame loop.
   * @function
   * @param {function} fn The function to call on each frame
   * @returns {number} An id, used to cancel with cancelAnimationFrame
   */
  function startTicking(fn) {
    return requestAnimationFrame(function tick() {
      fn();
      requestAnimationFrame(tick);
    });
  }

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
    var hand = document.getElementById('place-hand');
    var handSwatch = document.getElementById('place-hand-swatch');

    AudioManager.init();
    Camera.init(viewer, canvas);
    Canvasse.init(canvas);
    Hand.init(hand, handSwatch);
    Palette.init(palette, COLORS);

    Client.init();

    var websocket = new r.WebSocket(r.config.place_websocket_url);
    websocket.on(WebsocketEvents);
    websocket.start();

    bindEvents(container, CameraEvents);
    bindEvents(canvas, CanvasEvents);
    bindEvents(palette, PaletteEvents);

    function shouldMouseOutCancel(e) {
      // Events are stupid
      return !(e.target === canvas || e.relatedTarget === canvas) && Cursor.isDown;
    }

    bindEvents(container, {
      'mouseout': function(e) {
        if (shouldMouseOutCancel(e)) {
          return CameraEvents['mouseup'](e);
        }
      },

      // Map touch events to mouse events.  Note that this works since
      // currently the event handlers only use the clientX and clientY
      // properties of the MouseEvent objects (which the Touch objects
      // also have.  If the handlers start using other properties or
      // methods of the MouseEvent that the Touch objects *don't* have,
      // this will probably break.
      'touchstart': function(e) {
        if (!Cursor.isUsingTouch) {
          Cursor.setTouchMode(true);
        }
        return CameraEvents['mousedown'](e.changedTouches[0]);
      },

      'touchmove': function(e) {
        return CameraEvents['mousemove'](e.changedTouches[0]);
      },

      'touchend': function(e) {
        return CameraEvents['mouseup'](e.changedTouches[0]);
      },

      'touchcancel': function(e) {
        if (shouldMouseOutCancel(e)) {
          return CameraEvents['mouseup'](e.changedTouches[0]);
        }
      },
    });

    bindEvents(palette, {
      'touchstart': function(e) {
        if (!Cursor.isUsingTouch) {
          Cursor.setTouchMode(true);
        }
      },
    });

    startTicking(function() {
      Client.tick();
      Cursor.tick();
    });

    r.place = Client;
  });
});
