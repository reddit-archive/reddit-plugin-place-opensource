!r.placeModule('client', function(require) {
  var $ = require('jQuery');
  var r = require('r');
  var store = require('store');

  var AudioManager = require('audio');
  var Camera = require('camera');
  var CameraButton = require('camerabutton');
  var Canvasse = require('canvasse');
  var Coordinates = require('coordinates');
  var Hand = require('hand');
  var Inspector = require('inspector');
  var Keyboard = require('keyboard');
  var MollyGuard = require('mollyguard');
  var MuteButton = require('mutebutton');
  var NotificationButton = require('notificationbutton');
  var Notifications = require('notifications');
  var Palette = require('palette');
  var R2Server = require('api');
  var Timer = require('timer');
  var lerp = require('utils').lerp;
  var ZoomButton = require('zoombutton');
  var parseHexColor = require('utils').parseHexColor;
  var clamp = require('utils').clamp;
  var getDistance = require('utils').getDistance;
  var normalizeVector = require('utils').normalizeVector;

  var MAX_COLOR_INDEX = 15;
  var DEFAULT_COLOR = '#FFFFFF';
  var DEFAULT_COLOR_ABGR = 0xFFFFFFFF;

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
  var SFX_ERROR = AudioManager.compileClip([
    ['E4', 1/32], ['C4', 1/32], ['A3', 1/16],
  ])
  var SFX_ZOOM_OUT = AudioManager.compileClip([
    ['D6', 1/32], ['C6', 1/32], ['A5', 1/16],
  ]);;
  var SFX_ZOOM_IN = SFX_ZOOM_OUT.slice().reverse();

  // Used to keep a list of the most recent n pixel updates received.
  var recentTiles = [];
  var recentTilesIndex = 0;
  var maxrecentTilesLength = 100;

  var autoCameraIntervalToken;

  var B = 0;
  var k = 1;
  var f = .5;
  var g = 1;

  /**
   * Rossmo Formula.
   * https://en.wikipedia.org/wiki/Rossmo%27s_formula
   * Using this as a rough way of determining where the most interesting part
   * of the board might be.
   * @param {Object} a { x, y } coordinate object
   * @param {Object[]} ns array of { x, y } coordinate objects
   * @param {number} B "buffer" zone size
   * @param {number} k used to scale the entire results.  Essentially
   *    meaningless in this context since we're just selecting the max anyway.
   *    Anything greater than 0 should be fine.
   * @param {number} f configurable value, I don't understand it.
   * @param {number} g configurable value, I don't understand it.
   */
  function rossmoFormula(a, ns, B, k, f, g) {
    return k * ns.reduce(function(acc, n) {
      const d = Math.abs(a.x - n.x) + Math.abs(a.y - n.y)
      if (!d) {
        return acc; // not sure if I need the 1 there
      } else if (d > B) {
        return acc + 1 / Math.pow(d, f);
      } else {
        return acc + Math.pow(B, g - f) / Math.pow(d, g);
      }
    }, 0); // not sure if this ought to be at least 1
  }

  // Handles actions the local user takes.
  return {
    AUTOCAMERA_INTERVAL: 3000,
    ZOOM_LERP_SPEED: .2,
    PAN_LERP_SPEED: .4,
    ZOOM_MAX_SCALE: 40,
    ZOOM_MIN_SCALE: 4,
    VOLUME_LEVEL: .1,
    MAXIMUM_AUDIBLE_DISTANCE:  10,
    WORLD_AUDIO_MULTIPLIER: .1,
    MAX_WORLD_AUDIO_RATE: 250,
    KEYBOARD_PAN_SPEED: .5,
    KEYBOARD_PAN_LERP_SPEED: .275,

    DEFAULT_COLOR_PALETTE: [
      '#FFFFFF', // white
      '#E4E4E4', // light grey
      '#888888', // grey
      '#222222', // black
      '#FFA7D1', // pink
      '#E50000', // red
      '#E59500', // orange
      '#A06A42', // brown
      '#E5D900', // yellow
      '#94E044', // lime
      '#02BE01', // green
      '#00D3DD', // cyan
      '#0083C7', // blue
      '#0000EA', // dark blue
      '#CF6EE4', // magenta
      '#820080', // purple
    ],

    state: null,
    autoCameraEnabled: false,
    colorIndex: null,
    paletteColor: null,
    cooldown: 0,
    cooldownEndTime: 0,
    cooldownPromise: null,
    palette: null,
    enabled: true,
    isZoomedIn: false,
    isPanEnabled: true,
    lastWorldAudioTime: 0,
    isWorldAudioEnabled: true,
    containerSize: { width: 0, height: 0 },
    panX: 0,
    panY: 0,
    zoom: 1,
    currentDirection: { x: 0, y: 0 },
    // For values that can be 'lerp'ed, copies of the attribute
    // prefixed with an underscore (e.g. _zoom) are used to track
    // the current *actual* value, while the unprefixed attribute
    // tracks the *target* value.
    _panX: 0,
    _panY: 0,
    _zoom: 1,
    _currentDirection: { x: 0, y: 0 },

    /**
     * Initialize
     * @function
     * @param {boolean} isEnabled Is the client enabled.
     * @param {number} cooldown The amount of time in ms users must wait between draws.
     * @param {?number} panX Horizontal camera offset
     * @param {?number} panY Vertical camera offset
     * @param {?string} color Hex-formatted color string
     */
    init: function(isEnabled, cooldown, panX, panY, color) {
      // If logged out, client is disabled.  If logged in, client is
      // initially disabled until we get the API response back to know
      // whether they can place.
      this.enabled = false;
      this.isZoomedIn = true;
      this.cooldown = cooldown;
      if (color) this.setColor(color, false);

      this.setZoom(this.isZoomedIn ? this.ZOOM_MAX_SCALE : this.ZOOM_MIN_SCALE);
      this.setOffset(panX|0, panY|0);
      AudioManager.setGlobalVolume(this.VOLUME_LEVEL);
      this.setColorPalette(this.DEFAULT_COLOR_PALETTE);
      Palette.generateSwatches(this.DEFAULT_COLOR_PALETTE);

      // We store whether the user has turned off audio in localStorage.
      var audioIsDisabled = !!store.safeGet('place-audio-isDisabled');
      if (audioIsDisabled) {
        this._setAudioEnabled(false);
      }

      if (!this.getZoomButtonClicked()) {
        ZoomButton.highlight(true);
      }

      var isNotificationButtonEnabled = parseInt(store.safeGet('iOS-Notifications-Enabled'), 10) === 1;
      if (isNotificationButtonEnabled) {
        NotificationButton.showNotificationOn();
      }

      this.state = new Uint8Array(new ArrayBuffer(Canvasse.width * Canvasse.height));
    },

    /**
     * Set the color palette.
     * @function
     * @param {string[]} palette An array of valid css color strings
     */
    setColorPalette: function(palette) {
      var isNew = this.palette === null;

      this.palette = palette;
      Palette.generateSwatches(palette);
      // The internal color palette structure stores colors as AGBR (reversed
      // RGBA) to make writing to the color buffer easier.
      var dataView = new DataView(new ArrayBuffer(4));
      // The first byte is alpha, which is always going to be 0xFF
      dataView.setUint8(0, 0xFF);
      this.paletteABGR = palette.map(function(colorString) {
        var color = parseHexColor(colorString);
        dataView.setUint8(1, color.blue);
        dataView.setUint8(2, color.green);
        dataView.setUint8(3, color.red);
        return dataView.getUint32(0);
      });

      if (!isNew) {
        // TODO - clean up
        this.setInitialState(this.state);
      }
    },

    /**
     * Sets the cooldown time period.
     * After the cooldown has passed, the client is enabled.
     * The returned promise is also stored and reused in the whenCooldownEnds
     * method.
     * @function
     * @param {number} cooldownTime Duration of cooldown in ms
     * @returns {Promise} A promise that resolves when the cooldown ends.
     */
    setCooldownTime: function(cooldownTime) {
      var currentTime = Date.now();
      this.cooldownEndTime = currentTime + cooldownTime;

      var deferred = $.Deferred();
      setTimeout(function onTimeout() {
        this.enable();
        deferred.resolve();
        this.cooldownPromise = null;
        MollyGuard.showUnlocked();
        Timer.stopTimer();
        Timer.hide();
      }.bind(this), cooldownTime);

      if (cooldownTime) {
        Timer.startTimer(this.cooldownEndTime);
        Timer.show();
      }

      this.cooldownPromise = deferred.promise();
      if (cooldownTime) {
        MollyGuard.showLocked();
      }

      return this.cooldownPromise;
    },

    /**
     * Get a promise that resolves when the cooldown period expires.
     * If there isn't an active cooldown, returns a promise that
     * immediately resolves.
     *
     *    Client.whenCooldownEnds().then(function() {
     *      // do stuff
     *    });
     *
     * @function
     * @returns {Promise}
     */
    whenCooldownEnds: function() {
      if (this.cooldownPromise) {
        return this.cooldownPromise;
      }

      var deferred = $.Deferred();
      deferred.resolve();
      return deferred.promise();
    },

    /**
     * Return the time remaining in the cooldown in ms
     * @function
     * @returns {number}
     */
    getCooldownTimeRemaining: function() {
      var currentTime = Date.now();
      var timeRemaining = this.cooldownEndTime - currentTime;
      return Math.max(0, timeRemaining);
    },

    /**
     * Tick function that updates interpolated zoom and offset values.
     * Not intended for external use.
     * @function
     * @returns {boolean} Returns true if anything updated.
     */
    tick: function() {
      var didUpdate = false;
      if (this._zoom !== this.zoom) {
        this._zoom = lerp(this._zoom, this.zoom, this.ZOOM_LERP_SPEED);
        Camera.updateScale(this._zoom);
        didUpdate = true;
      }

      this.currentDirection.x = 0;
      this.currentDirection.y = 0;

      if (Keyboard.isKeyDown('LEFT') || Keyboard.isKeyDown('A')) {
        this.currentDirection.x -= 1;
      }
      if (Keyboard.isKeyDown('RIGHT') || Keyboard.isKeyDown('D')) {
        this.currentDirection.x += 1;
      }
      if (Keyboard.isKeyDown('UP') || Keyboard.isKeyDown('W')) {
        this.currentDirection.y -= 1;
      }
      if (Keyboard.isKeyDown('DOWN') || Keyboard.isKeyDown('S')) {
        this.currentDirection.y += 1;
      }

      normalizeVector(this.currentDirection);

      if (this._currentDirection.x !== this.currentDirection.x) {
        this._currentDirection.x = lerp(this._currentDirection.x, this.currentDirection.x,
                                        this.KEYBOARD_PAN_LERP_SPEED);
      }
      if (this._currentDirection.y !== this.currentDirection.y) {
        this._currentDirection.y = lerp(this._currentDirection.y, this.currentDirection.y,
                                        this.KEYBOARD_PAN_LERP_SPEED);
      }

      var moveSpeed = this.ZOOM_MAX_SCALE / this._zoom * this.KEYBOARD_PAN_SPEED;
      this.panX -= this._currentDirection.x * moveSpeed;
      this.panY -= this._currentDirection.y * moveSpeed;

      var didOffsetUpdate = false;
      if (this._panX !== this.panX) {
        this._panX = lerp(this._panX, this.panX, this.PAN_LERP_SPEED);
        didOffsetUpdate = true;
      }

      if (this._panY !== this.panY) {
        this._panY = lerp(this._panY, this.panY, this.PAN_LERP_SPEED);
        didOffsetUpdate = true;
      }

      didUpdate = didUpdate || didOffsetUpdate;

      if (didOffsetUpdate) {
        Camera.updateTranslate(this._panX, this._panY);
        var coords = this.getCameraLocationFromOffset(this._panX, this._panY);
        Coordinates.setCoordinates(Math.round(coords.x), Math.round(coords.y));
      }

      return didUpdate;
    },

    /**
     * Get the css color string for the given colorIndex.
     * @function
     * @param {number} colorIndex The index of the color in the palette.
     *    This is clamped into the 0 to MAX_COLOR_INDEX range.  If the current
     *    color palette has less colors than that defined, it repeats.
     * @returns {string}
     */
    getPaletteColor: function(colorIndex) {
      colorIndex = Math.min(MAX_COLOR_INDEX, Math.max(0, colorIndex|0));
      return this.palette[colorIndex % this.palette.length] || DEFAULT_COLOR;
    },

    getPaletteColorABGR: function(colorIndex) {
      colorIndex = Math.min(MAX_COLOR_INDEX, Math.max(0, colorIndex|0));
      return this.paletteABGR[colorIndex % this.paletteABGR.length] || DEFAULT_COLOR_ABGR;
    },

    /**
     * Sets the initial state of the canvas.
     * This accepts a Uint8Array of color indices
     * Note that if the API payload shape changes, this will need to update.
     * @function
     * @param {Uint8Array} state A Uint8Array of color indices
     */
    setInitialState: function(state) {
      // Iterate over API response state.
      var canvas = [];

      // Safari TypedArray implementation doesn't support forEach :weary:
      var colorIndex, color;
      for (var i = 0; i < state.length; i++) {
        colorIndex = state[i];
        color = this.getPaletteColorABGR(colorIndex);
        Canvasse.setBufferState(i, color);
        // Assumes that all non-0 values in local state are *newer* than the
        // state we're loading. This might not be strictly true but eh
        if (colorIndex > 0) {
          this.state[i] = colorIndex;
        }
      }

      Canvasse.drawBufferToDisplay();
    },

    /**
     * Update the current color
     * @function
     * @param {number} color Index of color in palette.  Should be less than MAX_COLOR_INDEX
     * @param {boolean} [playSFX] Whether to play sound effects, defaults to true.
     *    Useful for initializing with a color.
     */
    setColor: function(colorIndex, playSFX) {
      playSFX = playSFX === undefined ? true : playSFX;
      this.interact();

      if (!this.enabled) {
        if (playSFX) {
          AudioManager.playClip(SFX_ERROR);
        }
        return;
      }

      this.colorIndex = colorIndex;
      this.paletteColor = this.getPaletteColor(colorIndex);
      this.paletteColorABGR = this.getPaletteColorABGR(colorIndex);
      Hand.updateColor(this.paletteColor);
      if (this.isZoomedIn) {
        Hand.showCursor();
      }
      Palette.clearSwatchHighlights();
      Palette.highlightSwatch(colorIndex);

      if (playSFX) {
        AudioManager.playClip(SFX_SELECT);
      }
    },

    /**
     * Clear the current color
     * @function
     */
    clearColor: function(playSFX) {
      playSFX = playSFX === undefined ? true : playSFX;

      Hand.clearColor();
      Hand.hideCursor();
      Palette.clearSwatchHighlights();
      this.paletteColor = null;
      this.paletteColorABGR = null;

      if (playSFX) {
        AudioManager.playClip(SFX_DROP);
      }
    },

    /**
     * Returns whether or not the user is "holding" a color.
     * @returns {boolean}
     */
    hasColor: function() {
      return this.paletteColor !== null;
    },

    /**
     * Update the current zoom level.
     * Should be non-zero to avoid weirdness.
     * @function
     * @param {number} zoomLevel
     */
    setZoom: function(zoomLevel) {
      this._zoom = this.zoom = zoomLevel;
      this.isZoomedIn = zoomLevel === this.ZOOM_MAX_SCALE;
      if (this.isZoomedIn) {
        if (this.hasColor()) {
          Hand.showCursor();
        }
      } else {
        Hand.hideCursor();
      }
      Camera.updateScale(this._zoom);
    },

    /**
     * Update the current camera offsets.
     * Used to pan the camera around.
     * The x and y values are offsets for the canvas rather than camera
     * positions, which may be unintuitive to use.  For example, to
     * position the camera in the top left corner of a 1000x1000 canvas,
     * you would call:
     *
     *    r.place.setOffset(500, 500);
     *
     * which pushes the canvas down and to the right 500px, putting its
     * top left corner in the center of the screen.  If this is confusing,
     * use the setCameraPosition method instead.
     * @function
     * @param {number} x
     * @param {number} y
     */
    setOffset: function(x, y) {
      this._panX = this.panX = x;
      this._panY = this.panY = y;
      Camera.updateTranslate(this._panX, this._panY);
      var coords = this.getCameraLocationFromOffset(this._panX, this._panY);
      Coordinates.setCoordinates(Math.round(coords.x), Math.round(coords.y));
    },

    /**
     * Given coordinates relative to the camera position, get canvas offsets.
     * See the setCameraPosition method description for more details.
     * @function
     * @param {number} x
     * @param {number} y
     */
    getOffsetFromCameraPosition: function(x, y) {
      return { x: -x, y: -y };
    },

    /**
     * Given an absolute canvas coordinat, get canvas offsets.
     * See the setCameraLocation method description for more details.
     * @function
     * @param {number} x
     * @param {number} y
     */
    getOffsetFromCameraLocation: function(x, y) {
      var size = this.getCanvasSize();
      return { x: -(x - size.width / 2),  y: -(y - size.height / 2) };
    },

    /**
     * Given canvas offsets, get the camera coordinates.
     * The inverse of getOffsetFromCameraLocation.
     * @function
     * @param {number} x
     * @param {number} y
     */
    getCameraLocationFromOffset: function(x, y) {
      var size = this.getCanvasSize();
      return { x: size.width / 2 - x, y: size.height / 2 - y };
    },

    /**
     * Given the position in the container element, get the tile coordinate.
     * @function
     * @param {number} x
     * @param {number} y
     */
    getLocationFromCursorPosition: function(x, y) {
      var canvasSize = this.getCanvasSize();
      var containerSize = this.getContainerSize();
      return {
        x: Math.round(x / this.zoom + canvasSize.width / 2 - containerSize.width / (2 * this.zoom) - this.panX),
        y: Math.round(y / this.zoom + canvasSize.height / 2 - containerSize.height / (2 * this.zoom) - this.panY),
      };
    },

    /**
     * Given the location of the tile, give its position on screen
     * @function
     * @param {number} x
     * @param {number} y
     */
    getCursorPositionFromLocation: function(x, y) {
      var canvasSize = this.getCanvasSize();
      var containerSize = this.getContainerSize();
      return {
        x: this.zoom * (x - canvasSize.width / 2 + containerSize.width / (2 * this.zoom) + this.panX),
        y: this.zoom * (y - canvasSize.height / 2 + containerSize.height / (2 * this.zoom) + this.panY),
      };
    },

    /**
     * An alias for setOffset with values relative to the camera.
     * It literally just reverses the direction of the coordinates.  To use
     * the above example, if you want to position the camera in the top left
     * corner using this method, you would call:
     *
     *    r.place.setCameraPosition(-500, -500);
     *
     * which moves the camera up and to the left 500px, centering it on the
     * top left corner of the canvas.
     * @function
     * @param {number} x
     * @param {number} y
     */
    setCameraPosition: function(x, y) {
      var offsets = this.getOffsetFromCameraPosition(x, y);
      this.setOffset(offsets.x, offsets.y);
    },

    /**
     * The third and final option for setting the camera position.
     * This centers the camera on the given canvas coordinate.  That is to
     * say, if you wanted to center the camera on the top left corner:
     *
     *    r.place.setCameraLocation(0, 0);
     *
     * which moves the camera to the (0, 0) coordinate of the canvas.
     * @function
     * @param {number} x
     * @param {number} y
     */
    setCameraLocation: function(x, y) {
      var offsets = this.getOffsetFromCameraLocation(x, y);
      this.setOffset(offsets.x, offsets.y);
    },

    /**
     * Update the target zoom level for lerping
     * Should be non-zero to avoid weirdness.
     * @function
     * @param {number} zoomLevel
     */
    setTargetZoom: function(zoomLevel) {
      this.zoom = zoomLevel;
      this.isZoomedIn = zoomLevel === this.ZOOM_MAX_SCALE;
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
     * Update the target camera offsets relative to the camera.
     * @function
     * @param {number} x
     * @param {number} y
     */
    setTargetCameraPosition: function(x, y) {
      var offsets = this.getOffsetFromCameraPosition(x, y);
      this.setTargetOffset(offsets.x, offsets.y);
    },

    /**
     * Update the target camera offsets relative to the camera.
     * @function
     * @param {number} x
     * @param {number} y
     */
    setTargetCameraLocation: function(x, y) {
      var offsets = this.getOffsetFromCameraLocation(x, y);
      this.setTargetOffset(offsets.x, offsets.y);
    },

    /**
     * iOS Tile Notification management. Asks if the user desires notifications
     * if they select yes then attempt to register a local notification
     * using the webkit handler
     * @function
     */
    attemptToFireiOSLocalNotification: function() {
      if (parseInt(store.safeGet('iOS-Notifications-Enabled'), 10) === 1) {
        var isIOSFullscreen = (window.navigator.userAgent.indexOf('iPhone') > -1 && window.innerHeight > 200);
        if (isIOSFullscreen && typeof webkit !== 'undefined') {
          try {
            // tell iOS to setup a local notification
            webkit.messageHandlers.tilePlacedHandler.postMessage(this.cooldown / 1000);
          } catch(err) {
            // message handler doesn't exist for some reason
          }
        }
      }
    },

    /**
     * Draw the current color to the given coordinates
     * Makes the API call and optimistically updates the canvas.
     * @function
     * @param {number} x
     * @param {number} y
     */
    drawTile: function(x, y) {
      this.interact();

      if (!this.paletteColor || !this.enabled) {
        AudioManager.playClip(SFX_ERROR);
        return;
      }

      // Disable to prevent further draw actions until the API request resolves.
      this.disable();

      MollyGuard.showLocked();
      Timer.show();
      Timer.setText('Painting...');
      AudioManager.playClip(SFX_PLACE);

      var i = Canvasse.getIndexFromCoords(x, y);
      this.state[i] = this.colorIndex;
      Canvasse.drawTileAt(x, y, this.paletteColorABGR);
      this.clearColor(false);

      this.attemptToFireiOSLocalNotification();

      /*
      R2Server.draw(x, y, this.colorIndex)
        .then(function onSuccess(responseJSON, status, jqXHR) {
          return this.setCooldownTime(1000 * responseJSON.wait_seconds);
        }.bind(this))
        .fail(function onError(jqXHR, status, statusText) {
          this.enable();
          MollyGuard.showUnlocked();
          Timer.hide();
        }.bind(this))
        .then(function onSuccess() {
          Notifications.sendNotification('Your next tile is now available');
        })
      */
    },

    /**
     * Get info about the tile at the given coordinates.
     * @function
     * @param {number} x
     * @param {number} y
     */
    inspectTile: function(x, y) {
      this.interact();

      R2Server.getPixelInfo(x, y).then(
        // TODO - actually do something with this info in the UI.
        function onSuccess(responseJSON, status, jqXHR) {
          if ('color' in responseJSON) {
            this.setTargetCameraLocation(x, y);
            Inspector.show(
              responseJSON.x,
              responseJSON.y,
              responseJSON.user_name,
              responseJSON.timestamp
            );
          } else if (Inspector.isVisible) {
            Inspector.hide();
          }
        }.bind(this),

        function onError(jqXHR, status, statusText) {
          console.error(jqXHR);
        }.bind(this)
      )
    },

    /**
     * Toggles between the two predefined zoom levels.
     * @function
     * @param {number} [offsetX]
     * @param {number} [offsetY]
     */
    toggleZoom: function(offsetX, offsetY) {
      this.interact();
      if (this.isZoomedIn) {
        this.setTargetZoom(this.ZOOM_MIN_SCALE);
        AudioManager.playClip(SFX_ZOOM_OUT);
        ZoomButton.showZoomIn();
        Hand.hideCursor();
      } else {
        if (this.hasColor()) {
          Hand.showCursor();
        }
        this.setTargetZoom(this.ZOOM_MAX_SCALE);
        // Any time we are zooming in, also center camera where the user clicked
        if (offsetX !== undefined && offsetY !== undefined) {
          this.setTargetOffset(offsetX, offsetY);
        }
        AudioManager.playClip(SFX_ZOOM_IN);
        ZoomButton.showZoomOut();
      }

      this.isZoomedIn = this.zoom === this.ZOOM_MAX_SCALE;
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
        width: Canvasse.width,
        height: Canvasse.height,
      };
    },

    /**
     * Set the current container size.
     * @function
     * @param {number} width
     * @param {number} height
     */
    setContainerSize: function(width, height) {
      this.containerSize.width = width;
      this.containerSize.height = height;
    },

    /**
     * Get the current canvas size.
     * @function
     * @returns {BoxSize}
     */
    getContainerSize: function() {
      return this.containerSize;
    },

    /**
     * Disable the client.  Intended for temporarily disabling for
     * handling ratelimiting, cooldowns, etc.
     * @function
     */
    disable: function() {
      this.enabled = false;
    },

    /**
     * Re-enable the client.
     * @function
     */
    enable: function() {
      this.enabled = true;
    },

        /**
     * Disable the client.  Intended for temporarily disabling for
     * handling ratelimiting, cooldowns, etc.
     * @function
     */
    disablePan: function() {
      this.isPanEnabled = false;
    },

    /**
     * Re-enable the client.
     * @function
     */
    enablePan: function() {
      this.isPanEnabled = true;
    },

    injectHeaders: function(headers) {
      R2Server.injectHeaders(headers);
      var isIOSFullscreen = (window.navigator.userAgent.indexOf('iPhone') > -1 && window.innerHeight > 200);
      if (isIOSFullscreen) {
        NotificationButton.show();
      }
    },

    /**
     * Set the state of the AudioManager and MuteButton modules
     * For internal use
     * @function
     * @param {boolean} enabled Whether you are enabling or disabling audio.
     */
    _setAudioEnabled: function(enabled) {
      if (!AudioManager.isSupported) { return; }
      this.interact();

      if (enabled) {
        AudioManager.enable();
        MuteButton.showMute();
        store.remove('place-audio-isDisabled');
      } else {
        AudioManager.disable();
        MuteButton.showUnmute();
        store.safeSet('place-audio-isDisabled', '1');
      }
    },

    /**
     * Has the zoom button been acknowledged?
     * For internal use
     * @function
     */
    getZoomButtonClicked: function() {
      return parseInt(store.safeGet('place-zoom-wasClicked'), 10) || 0;
    },

    /**
     * Remember that zoom button has been acknowledged
     * @function
     */
    setZoomButtonClicked: function() {
      store.safeSet('place-zoom-wasClicked', '1');
    },

    /**
     * Toggle the volume on/off
     * @function
     */
    toggleVolume: function() {
      this._setAudioEnabled(!AudioManager.enabled);
      AudioManager.playClip(SFX_SELECT);
    },

    toggleNotificationButton: function() {
      var enabled = parseInt(store.safeGet('iOS-Notifications-Enabled'), 10) === 1;
      if (!enabled) {
        store.safeSet('iOS-Notifications-Enabled', '1');
        NotificationButton.showNotificationOn();
      } else {
        store.safeSet('iOS-Notifications-Enabled', '0');
        NotificationButton.showNotificationOff();
      }
    },

    /**
     * Sets the AudioManager volume globally.
     */
    setVolume: function(volume) {
      if (!AudioManager.isSupported) { return; }

      if (!volume) {
        this._setAudioEnabled(false);
      } else if (!AudioManager.globalVolume) {
        this._setAudioEnabled(true);
      }

      AudioManager.setGlobalVolume(volume);
      AudioManager.playClip(SFX_SELECT);
    },

    /**
     * Used to disable some features when the user interacts
     */
    interact: function() {
      this.disableAutoCamera();
      if (Inspector.isVisible) {
        Inspector.hide();
      }
    },

    /**
     * Method called by World when a tile update comes in.
     * @function
     * @param {number} x
     * @param {number} y
     */
    receiveTile: function(x, y) {
      this.trackRecentTile(x, y);
      if (!this.isWorldAudioEnabled) { return; }
      var camCoords = this.getCameraLocationFromOffset(this._panX, this._panY);
      var dist = Math.abs(getDistance(camCoords.x, camCoords.y, x, y));
      this.playTileSoundAtDistance(dist);
    },

    enableWorldAudio: function() {
      this.isWorldAudioEnabled = true;
    },

    disableWorldAudio: function() {
      this.isWorldAudioEnabled = false;
    },

    /**
     * Play the sound effect for placing a tile at the given distance
     * @function
     * @param {number} dist
     */
    playTileSoundAtDistance: function(dist) {
      if (dist > this.MAXIMUM_AUDIBLE_DISTANCE) { return; }

      var now = Date.now();
      if (now - this.lastWorldAudioTime < this.MAX_WORLD_AUDIO_RATE) { return; }
      this.lastWorldAudioTime = now;

      var globalVolume = AudioManager.globalVolume;
      var distanceMultiplier = clamp(0, 1, Math.pow(2, -dist/2));
      var volume = globalVolume * distanceMultiplier * this.WORLD_AUDIO_MULTIPLIER;
      AudioManager.playClip(SFX_PLACE, volume);
    },

    /**
     * Track the position of a recently added tile.
     * This is called by the world module and used to power the auto-camera
     * feature
     * @function
     * @param {number} x
     * @param {number} y
     */
    trackRecentTile: function(x, y) {
      // TODO - may be worth measuring the impact of doing this constantly,
      // and skip it when auto-camera is disabled (which is the default).
      if (recentTiles[recentTilesIndex]) {
        // recycle existing objects once the list is full
        recentTiles[recentTilesIndex].x = x;
        recentTiles[recentTilesIndex].y = y;
      } else {
        recentTiles[recentTilesIndex] = { x: x, y: y }
      }
      recentTilesIndex = (recentTilesIndex + 1) % maxrecentTilesLength;
    },

    /**
     * Toggle the auto-camera feature
     * @function
     */
    toggleAutoCamera: function() {
      if (this.autoCameraEnabled) {
        this.disableAutoCamera();
      } else {
        this.enableAutoCamera();
      }
    },

    /**
     * Turn on the auto-camera feature.
     * This will attempt to move the camera to a "hot spot" at a regular
     * interval.  It uses Rossmo's formula to identify 1 pixel out of the most
     * recent n (currently 100) that is most likely to be the most interesting.
     * The same formula can be used to find serial killers, or sharks.  Neat!
     * @function.
     */
    enableAutoCamera: function() {
      if (this.autoCameraEnabled) { return }
      this.autoCameraEnabled = true;
      CameraButton.showDisable();

      autoCameraIntervalToken = setInterval(function() {
        var maxScore = 0;
        var winningIndex = 0;

        var tile, score;
        for (var i = 0; i < recentTiles.length; i++) {
          tile = recentTiles[i];
          score = rossmoFormula(tile, recentTiles, B, k, f, g);
          // TODO - we probably actually want to weight this by distance
          // from current camera location, so that a smaller, but still
          // significant activity nearby takes priority over a slightly bigger
          // one farther away.
          if (score > maxScore) {
            maxScore = score;
            winningIndex = i;
          }
        }

        if (tile) {
          this.setTargetCameraLocation(tile.x, tile.y);
        }
      }.bind(this), this.AUTOCAMERA_INTERVAL);
    },

    /**
     * Turn of the auto-camera feature.
     */
    disableAutoCamera: function() {
      if (!this.autoCameraEnabled) { return }
      this.autoCameraEnabled = false;
      CameraButton.showEnable();

      clearInterval(autoCameraIntervalToken);
    },

    /**
     * Truncate the list of recent pixels used by the autoCamera feature.
     */
    clearrecentTiles: function() {
      recentTiles.length = 0;
      recentTilesIndex = 0;
    },
  };
});
