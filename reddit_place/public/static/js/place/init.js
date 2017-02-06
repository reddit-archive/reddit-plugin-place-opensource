!function(r, $, _){
  var AudioManager = r.placeAudio;
  var ColorPalette = r.placeColorPalette;

  // Define some sound effects, to be played with AudioManager.playClip
  var SFX_DROP = AudioManager.compileClip([
    ['E7', 1/32], ['C7', 1/32], ['A6', 1/16],
  ]);
  var SFX_PLACE = AudioManager.compileClip([
    ['G7', 1/32], ['E7', 1/32], ['C6', 1/16],
  ]);
  var SFX_SELECT = AudioManager.compileClip([
    ['C7', 1/32], ['E7', 1/32], ['G8', 1/16],
  ]);
  var SFX_ZOOM_OUT = SFX_DROP;
  var SFX_ZOOM_IN = SFX_ZOOM_OUT.slice().reverse();


  /**
   * Utility for linear interpolation between to values
   * Useful as a cheap and easy way to ease between to values
   * 
   *    lerp(0, 10, .5);
   *    // 5
   * 
   * @function
   * @param {number} startVal The current value
   * @param {number} endVal The target value
   * @param {number} interpolationAmount A float between 0 and 1, usually
   *    amount of passed time * some interpolation speed
   * @returns {number} The interpolated value
   */
  function lerp(startVal, endVal, interpolationAmount) {
    return startVal + interpolationAmount * (endVal - startVal);
  }

  /**
   * Utility for getting the length of a vector
   * 
   *    vectorLength(2, 3);
   *    // 3.605551275463989
   * 
   * @function
   * @param {number} x Vector x component
   * @param {number} y Vector y component
   * @returns {number} The length of the vector
   */
  function vectorLength(x, y) {
    return Math.sqrt(x * x + y * y);
  }

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



  // Collection of functions that call out to the backend API.
  // All requests made to the banckend from the client are defined here.
  var R2Server = {
    /**
     * POST to the draw API
     * @function
     * @param {int} x,
     * @param {int} y,
     * @param {string} color
     * @returns {Promise}
     */
    draw: function(x, y, color) {
      return r.ajax({
        url: '/api/place/draw.json',
        type: 'POST',
        data: {
          x: x,
          y: y,
          color: color,
        },
      });
    },
  };


  // Manages camera position and zoom level.
  var Camera = {
    zoomElement: null,
    panElement: null,

    /**
     * Initialize the camera.
     * @function
     * @param {HTMLElement} zoomElement The element to apply scale transforms on.
     * @param {HTMLElement} panElement The element to apply translate transforms
     *    on.  Should be a child of zoomElement!
     */
    init: function(zoomElement, panElement) {
      this.zoomElement = zoomElement;
      this.panElement = panElement;
    },

    /**
     * Update the scale transform on the zoomElement element.
     * @function
     * @param {number} s The scale
     */
    updateScale: function(s) {
      $(this.zoomElement).css({
        transform: 'scale(' + s + ',' + s + ')',
      });
    },

    /**
     * Update the translate transform on the panElement element.
     * @function
     * @param {number} x The horizontal offset
     * @param {number} y The vertical offset
     */
    updateTranslate: function(x, y) {
      $(this.panElement).css({
        transform: 'translate(' + x + 'px,' + y + 'px)',
      });
    },
  };


  // Model the state of the canvas
  // This is really just a thin wrapper around the native canvas API.
  var Canvasse = {
    WIDTH: 200,
    HEIGHT: 200,

    el: null,
    ctx: null,

    /**
     * Initialize the Canvasse
     * @function
     * @param {HTMLCavasElement} el The canvas element to draw into
     */
    init: function(el) {
      this.el = el;
      this.el.width = this.WIDTH;
      this.el.height = this.HEIGHT;
      this.ctx = this.el.getContext('2d');
    },

    /**
     * Draw a color to the canvas.
     * Only handles updating the local canvas.
     * Coordinates are in canvas pixels, not screen pixels.
     * @function
     * @param {int} x
     * @param {int} y
     * @param {string} color Any valid css color string
     */
    drawTileAt: function(x, y, color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, 1, 1);
    },
  };


  // State tracking for input.
  var Cursor = {
    MIN_DRAG_DISTANCE: 2,

    isDown: false,
    downX: 0,
    downY: 0,
    upX: 0,
    upY: 0,
    dragDistance: 0,
    didDrag: false,

    /**
     * Set the cursor state to down.
     * @function
     * @param {number} x
     * @param {number} y
     */
    setCursorDown: function(x, y) {
      if (this.isDown) { return; }

      this.isDown = true;
      this.downX = x;
      this.downY = y;
      this.x = x;
      this.y = y;
      this.didDrag = false;
    },

    /**
     * Set the cursor state to up.
     * @function
     * @param {number} x
     * @param {number} y
     */
    setCursorUp: function(x, y) {
      if (!this.isDown) { return; }

      this.isDown = false;
      this.upX = x;
      this.upY = y;
      this.x = x;
      this.y = y;
      this.dragDistance = vectorLength(this.upX - this.downX, this.upY - this.downY);
      this.didDrag = (this.dragDistance >= this.MIN_DRAG_DISTANCE);
    },

    /**
     * Set the current cursor position.
     */
    setCursorPosition: function(x, y) {
      this.x = x;
      this.y = y;
    },
  };


  // Handles actions the local user takes.
  var Client = {
    ZOOM_LERP_SPEED: .2,
    PAN_LERP_SPEED: .4,
    ZOOM_MAX_SCALE: 40,
    ZOOM_MIN_SCALE: 4,

    color: '#000000',
    isZoomedIn: false,
    panX: 0,
    panY: 0,
    zoom: 1,
    // For values that can be 'lerp'ed, copies of the attribute
    // prefixed with an underscore (e.g. _zoom) are used to track
    // the current *actual* value, while the unprefixed attribute
    // tracks the *target* value.
    _panX: 0,
    _panY: 0,
    _zoom: 1,

    /**
     * Initialize
     * @function
     * @param {?string} color Hex-formatted color string
     * @param {?boolean} isZoomedIn Is the camera zoomed in or out
     * @param {?number} panX Horizontal camera offset
     * @param {?number} panY Vertical camera offset
     */
    init: function(color, isZoomedIn, panX, panY) {
      if (color) this.setColor(color, false);
      this.isZoomedIn = isZoomedIn !== undefined ? isZoomedIn : true;
      this.setZoom(this.isZoomedIn ? this.ZOOM_MAX_SCALE : this.ZOOM_MIN_SCALE);
      this.setOffset(panX|0, panY|0);
      startTicking(this._tick.bind(this));
    },

    /**
     * Tick function that updates interpolated zoom and offset values.
     * Not intended for external use.
     * @function
     */
    _tick: function() {
      if (this._zoom !== this.zoom) {
        this._zoom = lerp(this._zoom, this.zoom, this.ZOOM_LERP_SPEED);
        Camera.updateScale(this._zoom);
      }

      var didOffsetUpdate = false;
      if (this._panX !== this.panX) {
        this._panX = lerp(this._panX, this.panX, this.PAN_LERP_SPEED);
        didOffsetUpdate = true;
      }

      if (this._panY !== this.panY) {
        this._panY = lerp(this._panY, this.panY, this.PAN_LERP_SPEED);
        didOffsetUpdate = true;
      }

      if (didOffsetUpdate) {
        Camera.updateTranslate(this._panX, this._panY);
      }
    },

    /**
     * Update the current color
     * @function
     * @param {string} color Hex-formatted color string
     * @param {boolean} [playSFX] Whether to play sound effects, defaults to true.
     *    Useful for initializing with a color.
     */
    setColor: function(color, playSFX) {
      playSFX = playSFX === undefined ? true : playSFX;
      this.color = color;
      if (playSFX) {
        AudioManager.playClip(SFX_SELECT);
      }
    },

    /**
     * Update the current zoom level.
     * Should be non-zero to avoid weirdness.
     * @function
     * @param {number} zoomLevel
     */
    setZoom: function(zoomLevel) {
      this._zoom = this.zoom = zoomLevel;
      Camera.updateScale(this._zoom);
    },

    /**
     * Update the current camera offsets.
     * Used to pan the camera around.
     * @function
     * @param {number} x
     * @param {number} y
     */
    setOffset: function(x, y) {
      this._panX = this.panX = x;
      this._panY = this.panY = y;
      Camera.updateTranslate(this._panX, this._panY);
    },

    /**
     * Update the target zoom level for lerping
     * Should be non-zero to avoid weirdness.
     * @function
     * @param {number} zoomLevel
     */
    setTargetZoom: function(zoomLevel) {
      this.zoom = zoomLevel;
    },
    
    /**
     * Update the target camera offsets for lerping
     * Used to pan the camera around.
     * @function
     * @param {number} x
     * @param {number} y
     */
    setTargetOffset: function(x, y) {
      this.panX = x;
      this.panY = y;
    },

    /**
     * Draw the current color to the given coordinates
     * Makes the API call and optimistically updates the canvas.
     * @function
     * @param {number} x
     * @param {number} y
     */
    drawTile: function(x, y) {
      Canvasse.drawTileAt(x, y, this.color);
      R2Server.draw(x, y, this.color);
      AudioManager.playClip(SFX_PLACE);
    },

    /**
     * Toggles between the two predefined zoom levels.
     * @function
     */
    toggleZoom: function() {
      if (this.isZoomedIn) {
        this.setTargetZoom(this.ZOOM_MIN_SCALE);
        AudioManager.playClip(SFX_ZOOM_OUT);
      } else {
        this.setTargetZoom(this.ZOOM_MAX_SCALE);
        AudioManager.playClip(SFX_ZOOM_IN);
      }

      this.isZoomedIn = !this.isZoomedIn;
    },

    /**
     * @typedef {Object} BoxSize
     * @property {number} width
     * @property {number} height
     */

    /**
     * Get the current canvas size.
     * @function
     * @returns {BoxSize}
     */
    getCanvasSize: function() {
      return {
        width: Canvasse.WIDTH,
        height: Canvasse.HEIGHT,
      };
    },
  };


  // Handles actions remote users take
  var World = {
    drawTile: function(x, y, color) {
      Canvasse.drawTileAt(message.x, message.y, message.color);
    },
  };


  // Client events that apply changes to the canvas.
  // IMPORTANT NOTE – (x,y) coordinates here are in "canvas space".  That is,
  // they are relative to the top left corner of the canvas and at a 1:1 ratio
  // with the real canvas size.  It's important to note that the Cursor object
  // tracks position in "container space".
  var CanvasEvents = {
    'mouseup': function(e) {
      // Ignore right clicks
      if (e.which === 3) { return; }

      var x = Math.round(e.offsetX);
      var y = Math.round(e.offsetY);

      if (!Cursor.didDrag) {
        Client.drawTile(x, y);
      }
    },

    // I.E. right-click.
    'contextmenu': function(e) {
      // We don't actually want the OS contextual menu.
      e.preventDefault();

      var x = Math.round(e.offsetX);
      var y = Math.round(e.offsetY);

      // The (x, y) coordinates we have are in "canvas space" relative.  We need
      // coordinates in "camera space", i.e. relative to the middle of the canvas.
      // Yes, we effectively have three coordinate systems in play. 
      var canvasSize = Client.getCanvasSize();
      var offsetX = canvasSize.width / 2 - x;
      var offsetY = canvasSize.height / 2 - y;

      if (!Client.isZoomedIn) {
        Client.setTargetOffset(offsetX, offsetY);
      }
      Client.toggleZoom();
    },
  };

  // Client events that primarily handle updating the camera
  // IMPORTANT NOTE – (x, y) coordinates here are in "container space". That is,
  // relative to the top left corner of the application container and in units
  // relative to the screen.  These events are used to update the Cursor object,
  // which also tracks position in "container space".
  var CameraEvents = {
    'mousedown': function(e) {
      var x = parseInt(e.clientX, 10);
      var y = parseInt(e.clientY, 10);
      Cursor.setCursorDown(x, y);
    },

    'mouseup': function(e) {
      var x = parseInt(e.clientX, 10);
      var y = parseInt(e.clientY, 10);
      Cursor.setCursorUp(x, y);
    },

    'mousemove': function(e) {
      if (!Cursor.isDown) { return; }

      var x = parseInt(e.clientX, 10);
      var y = parseInt(e.clientY, 10);

      // We need to undo the previous transform first
      var oldOffsetX = (Cursor.x - Cursor.downX) / Client.zoom;
      var oldOffsetY = (Cursor.y - Cursor.downY) / Client.zoom;

      // Then update the cursor position so we can do the same on
      // the next mousemove event
      Cursor.setCursorPosition(x, y);

      // Finally, calculate the new offset
      var newOffsetX = (x - Cursor.downX) / Client.zoom;
      var newOffsetY = (y - Cursor.downY) / Client.zoom;

      // And update the offset.  Important to know that Client
      // expects offset coordinates in canvas-space, which is why
      // we are only calculating an offset relative to the current
      // camera position and scaling that to the zoom level.
      Client.setOffset(
        Client.panX - oldOffsetX + newOffsetX,
        Client.panY - oldOffsetY + newOffsetY
      );
    },
  };

  // Events pushed from the server over websockets, primarily representing
  // actions taken by other users.
  var WebsocketEvents = {
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
      console.log(message.x, message.y, message.color);
      World.drawTile(message.x, message.y, message.color);
    },
  };

  // Events coming from the color palette UI
  var PaletteEvents = {
    'click': function(e) {
      var color = $(e.target).data('color');
      Client.setColor(color);
    },
  };



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
}(r, jQuery, _);
