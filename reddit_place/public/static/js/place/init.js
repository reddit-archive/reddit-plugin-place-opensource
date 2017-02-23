!r.placeModule('init', function(require) {
  var $ = require('jQuery');
  var r = require('r');
  var AudioManager = require('audio');
  var Camera = require('camera');
  var CameraEvents = require('cameraevents');
  var CanvasEvents = require('canvasevents');
  var Canvasse = require('canvasse');
  var Client = require('client');
  var Cursor = require('cursor');
  var Hand = require('hand');
  var Palette = require('palette');
  var PaletteEvents = require('paletteevents');
  var R2Server = require('api');
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
    var isFullscreen = r.config.place_fullscreen;
    var isUserLoggedIn = r.config.logged;
    var canvasWidth = r.config.place_canvas_width;
    var canvasHeight = r.config.place_canvas_height;
    var cooldownDuration = 1000 * r.config.place_cooldown;
    var websocketUrl = r.config.place_websocket_url;

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
    var camera = document.getElementById('place-camera');
    var canvas = document.getElementById('place-canvasse');
    var palette = document.getElementById('place-palette');
    var hand = document.getElementById('place-hand');
    var handSwatch = document.getElementById('place-hand-swatch');

    if (isFullscreen) {
      $(container).css({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    }

    AudioManager.init();
    Camera.init(viewer, camera);

    // Allow passing in starting camera position in the url hash
    var locationHash = window.location.hash.replace(/^#/, '');
    var hashParams = r.utils.parseQueryString(locationHash);


    Canvasse.init(canvas, canvasWidth, canvasHeight);
    Hand.init(hand, handSwatch);

    if (isUserLoggedIn) {
      Palette.init(palette, COLORS);
    }

    var halfWidth = canvasWidth / 2;
    var halfHeight = canvasHeight / 2;
    // Clamp starting coordinates to the canvas boundries
    var startX = Math.max(-halfWidth, Math.min(halfWidth, hashParams.x|0));
    var startY = Math.max(-halfHeight, Math.min(halfHeight, hashParams.y|0));
    // Convert those values to canvas transform offsets
    // TODO - this shouldn't be done here, it requires Canvasse.init to be called first
    var startOffsets = Client.getOffsetFromCameraPosition(startX, startY);

    Client.init(isUserLoggedIn, cooldownDuration, startOffsets.x, startOffsets.y);

    // TODO - this should just get passed into init.  Honestly just
    // avoiding merge conflicts with another branch here
    Client.setColorPalette(COLORS);

    R2Server.getCanvasBitmapState().then(function(timestamp, canvas) {
      // TODO - request non-cached version if the timestamp is too old
      if (!canvas) { return; }
      Client.setInitialState(canvas);
    });

    var websocket = new r.WebSocket(websocketUrl);
    websocket.on(WebsocketEvents);
    websocket.start();

    // TODO - fix this weird naming?
    bindEvents(container, CameraEvents);
    bindEvents(camera, CanvasEvents);

    if (isUserLoggedIn) {
      bindEvents(palette, PaletteEvents);
    }

    function shouldMouseOutCancel(e) {
      // Events are stupid
      return !(e.target === camera || e.relatedTarget === camera) && Cursor.isDown;
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

    // TODO - make less shitty
    var shittyMuteButton = document.getElementById('place-mute-button');
    var muteButton = "🔇";
    var unmuteButton = "🔊";
    $(shittyMuteButton).text(muteButton);
    bindEvents(shittyMuteButton, {
      'click': function() {
        if (AudioManager.enabled) {
          AudioManager.disable();
          $(shittyMuteButton).text(unmuteButton);
        } else {
          AudioManager.enable();
          $(shittyMuteButton).text(muteButton);
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
