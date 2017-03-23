!r.placeModule('client', function(require) {
  var $ = require('jQuery');
  var r = require('r');
  var AudioManager = require('audio');
  var Camera = require('camera');
  var Canvasse = require('canvasse');
  var Hand = require('hand');
  var Inspector = require('inspector');
  var MollyGuard = require('mollyguard');
  var MuteButton = require('mutebutton');
  var Notifications = require('notifications');
  var R2Server = require('api');
  var Timer = require('timer');
  var lerp = require('utils').lerp;
  var ZoomButton = require('zoombutton');

  var MAX_COLOR_INDEX = 15;
  var DEFAULT_COLOR = '#FFFFFF';

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
  var SFX_ZOOM_OUT = SFX_DROP;
  var SFX_ZOOM_IN = SFX_ZOOM_OUT.slice().reverse();


  // Handles actions the local user takes.
  return {
    ZOOM_LERP_SPEED: .2,
    PAN_LERP_SPEED: .4,
    ZOOM_MAX_SCALE: 40,
    ZOOM_MIN_SCALE: 4,
    VOLUME_LEVEL: .1,

    colorIndex: null,
    paletteColor: null,
    cooldown: 0,
    cooldownEndTime: 0,
    cooldownPromise: null,
    palette: [],
    enabled: true,
    isZoomedIn: false,
    isPanEnabled: true,
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
     * @param {boolean} isEnabled Is the client enabled.
     * @param {number} cooldown The amount of time in ms users must wait between draws.
     * @param {?number} panX Horizontal camera offset
     * @param {?number} panY Vertical camera offset
     * @param {?string} color Hex-formatted color string
     * @param {?boolean} isZoomedIn Is the camera zoomed in or out
     */
    init: function(isEnabled, cooldown, panX, panY, color, isZoomedIn) {
      // If logged out, client is disabled.  If logged in, client is
      // initially disabled until we get the API response back to know
      // whether they can place.
      this.enabled = false;
      this.cooldown = cooldown;
      if (color) this.setColor(color, false);
      this.isZoomedIn = isZoomedIn !== undefined ? isZoomedIn : true;
      this.setZoom(this.isZoomedIn ? this.ZOOM_MAX_SCALE : this.ZOOM_MIN_SCALE);
      this.setOffset(panX|0, panY|0);
      AudioManager.setGlobalVolume(this.VOLUME_LEVEL);

      if (!isEnabled) { return; }

      // Get the remaining wait time from the API, then set the cooldown.
      R2Server.getTimeToWait().then(
        function onSuccess(waitTime, status, jqXHR) {
          this.setCooldownTime(waitTime);
        }.bind(this),

        // Handle API errors.
        function onError(jqXHR, status, statusText) {
          // Something has gone wrong.  Assume the user can draw.
          this.setCooldownTime(0);
        }.bind(this)
      );
    },

    /**
     * Set the color palette.
     * @function
     * @param {string[]} palette An array of valid css color strings
     */
    setColorPalette: function(palette) {
      this.palette = palette;
      // TODO - redraw canvas with old colors mapped to new ones
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
     */
    tick: function() {
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

    /**
     * Sets the initial state of the canvas.
     * This accepts a Uint8Array of color indices, and mutates it into
     * the format expected by Canvasse.setState.
     * Note that if the API payload shape changes, this will need to update.
     * @function
     * @param {Object} state A Uint8Array of color indices
     */
    setInitialState: function(state) {
      // Iterate over API response state.
      var canvas = [];
      state.forEach(function(colorIndex, i) {
        // The current shape of the API payload is a bitmap of pixels, where
        // each pixel is a color index to be used as reference in a palette.
        //
        // Canvasse expects an array of [x, y, hexColor]
        var x = i % r.config.place_canvas_width;
        var y = Math.floor(i / r.config.place_canvas_width);
        var hexColorString = this.getPaletteColor(colorIndex);
        canvas.push([x, y, hexColorString]);
      }.bind(this));

      Canvasse.writeStateToBuffer(canvas);
      Canvasse.drawDisplayToBuffer();
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
      Hand.updateColor(this.paletteColor);
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
      this.paletteColor = null;
      
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

      R2Server.draw(x, y, this.colorIndex).then(
        // On success, draw the tile.  Will need to play with this to see
        // if the delay is too noticeable, otherwise we may want to
        // optimistically update the canvas and then undo on error.
        function onSuccess(responseJSON, status, jqXHR) {
          Canvasse.drawTileAt(x, y, this.paletteColor);
          AudioManager.playClip(SFX_PLACE);
          this.clearColor(false);
          this.setCooldownTime(this.cooldown).then(function() {
            Notifications.sendNotification('Your next tile is now available');
          });
        }.bind(this),

        // Handle API errors.
        function onError(jqXHR, status, statusText) {
          AudioManager.playClip(SFX_ERROR);
          // Handle ratelimit, enable after wait_seconds.
          // TODO - may want to do some UI treatment to show the user that they
          // can't interact.
          var cooldownTime = 1000 * jqXHR.responseJSON.wait_seconds;
          this.setCooldownTime(cooldownTime);
        }.bind(this)
      );
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
      } else {
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
    },

    /**
     * Toggle the volume on/off
     * @function
     */
    toggleVolume: function() {
      this.interact();

      if (AudioManager.enabled) {
        AudioManager.disable();
        MuteButton.showUnmute();
      } else {
        AudioManager.enable();
        MuteButton.showMute();
      }

      AudioManager.playClip(SFX_SELECT);
    },

    /**
     * Sets the AudioManager volume globally.
     */
    setVolume: function(volume) {
      if (!volume) {
        AudioManager.disable();
        MuteButton.showUnmute();
      } else if (!AudioManager.globalVolume) {
        AudioManager.enable();
        MuteButton.showMute();
      }

      AudioManager.setGlobalVolume(volume);
      AudioManager.playClip(SFX_SELECT);
    },

    /**
     * Used to disable some features when the user interacts
     */
    interact: function() {
      if (Inspector.isVisible) {
        Inspector.hide();
      }
    },
  };
});
