!r.placeModule(function client(require) {
  var AudioManager = require('audio');
  var Camera = require('camera');
  var Canvasse = require('canvasse');
  var Hand = require('hand');
  var R2Server = require('api');
  var lerp = require('utils').lerp;


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

    color: null,
    enabled: true,
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
     * Update the current color
     * @function
     * @param {string} color Hex-formatted color string
     * @param {boolean} [playSFX] Whether to play sound effects, defaults to true.
     *    Useful for initializing with a color.
     */
    setColor: function(color, playSFX) {
      playSFX = playSFX === undefined ? true : playSFX;
      this.color = color;
      Hand.updateColor(color);
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
      if (!this.color || !this.enabled) { return; }

      // Disable to prevent further draw actions until the API request resolves.
      this.disable();

      R2Server.draw(x, y, this.color).then(
        // On success, draw the tile.  Will need to play with this to see
        // if the delay is too noticeable, otherwise we may want to
        // optimistically update the canvas and then undo on error.
        function onSuccess(responseJSON, status, jqXHR) {
          Canvasse.drawTileAt(x, y, this.color);
          AudioManager.playClip(SFX_PLACE);
          Hand.clearColor();
          this.color = null;
          this.enable();
        }.bind(this),

        // Handle API errors.
        function onError(jqXHR, status, statusText) {
          AudioManager.playClip(SFX_ERROR);
          var res = jqXHR.responseJSON;

          if (res && res.wait_seconds) {
            // Handle ratelimit, enable after wait_seconds.
            // TODO - may want to do some UI treatment to show the user that they
            // can't interact.
            setTimeout(function() {
              this.enable();
            }.bind(this), res.wait_seconds * 1000);
          } else {
            // Fallback to just re-enabling. Maybe it'll work this time.
            this.enable();
          }
        }.bind(this)
      );
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
  };
});
