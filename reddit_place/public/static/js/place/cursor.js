!r.placeModule('cursor', function(require) {
  var Hand = require('hand');
  var lerp = require('utils').lerp;

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

  // State tracking for input.
  return {
    MIN_DRAG_DISTANCE: 2,
    MIN_CURSOR_LERP_DELTA: 1,
    ROTATE_Z_FACTOR: 6,
    CURSOR_TRANSLATE_LERP: 1,
    CURSOR_ROTATE_LERP: .5,

    isUsingTouch: false,
    isDown: false,
    downX: 0,
    downY: 0,
    upX: 0,
    upY: 0,
    x: 0,
    y: 0,
    rotateZ: 0,
    dragDistance: 0,
    didDrag: false,
    // For values that can be 'lerp'ed, copies of the attribute
    // prefixed with an underscore (e.g. _zoom) are used to track
    // the current *actual* value, while the unprefixed attribute
    // tracks the *target* value.
    _x: 0,
    _y: 0,
    _rotateZ: 0,

    tick: function() {
      var transformUpdated = false;

      if (this._x !== this.x) {
        transformUpdated = true;
        var deltaX = this.x - this._x;
        var absDeltaX = Math.abs(deltaX);
        this._x = lerp(this._x, this.x, this.CURSOR_TRANSLATE_LERP);
        if (absDeltaX < this.MIN_CURSOR_LERP_DELTA) {
          this._x = this.x;
        }

        // The target value for rotateZ is set by the current horizontal movement speed.
        var rotateZDirection = deltaX > 0 ? -1 : 1;
        this.rotateZ = Math.log2(absDeltaX) * rotateZDirection * this.ROTATE_Z_FACTOR;
        if (!isFinite(this.rotateZ) || absDeltaX < this.MIN_CURSOR_LERP_DELTA) {
          this.rotateZ = 0;
        }
      } else if (this.rotateZ) {
        // If we've stopped moving horizontally, set the rotateZ target to 0.
        this.rotateZ = 0;
      }

      if (this._y !== this.y) {
        transformUpdated = true;
        var deltaY = this.y - this._y;
        this._y = lerp(this._y, this.y, this.CURSOR_TRANSLATE_LERP);
        if (Math.abs(deltaY) < this.MIN_CURSOR_LERP_DELTA) {
          this._y = this.y;
        }
      }

      if (this._rotateZ !== this.rotateZ) {
        transformUpdated = true;
        var deltaRotateZ = this.rotateZ - this._rotateZ;
        this._rotateZ = lerp(this._rotateZ, this.rotateZ, this.CURSOR_ROTATE_LERP);
        if (Math.abs(deltaRotateZ) < this.MIN_CURSOR_LERP_DELTA) {
          this._rotateZ = this.rotateZ;
        }
      }

      if (transformUpdated) {
        Hand.updateTransform(this._x, this._y, this._rotateZ);
      }
    },

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
      this.setPosition(x, y);
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
      this.setPosition(x, y);
      this.dragDistance = vectorLength(this.upX - this.downX, this.upY - this.downY);
      this.didDrag = (this.dragDistance >= this.MIN_DRAG_DISTANCE);
    },

    /**
     * Set the current cursor position.
     * @function
     * @param {number} x
     * @param {number} y
     */
    setPosition: function(x, y) {
      this._x = this.x = x;
      this._y = this.y = y;
      Hand.updateTransform(x, y, 0);
    },

    /**
     * Update the target position for lerping
     * @function
     * @param {number} x
     * @param {number} y
     */
    setTargetPosition: function(x, y) {
      this.x = x;
      this.y = y;
    },

    setActiveTilePosition: function(x, y) {
      Hand.updateCursorTransform(x, y);
    },

    /**
     * Update whether or not we're using touch events
     * @function
     * @param {boolean} isUsingTouch
     */
    setTouchMode: function(isUsingTouch) {
      this.isUsingTouch = isUsingTouch;
      if (isUsingTouch) {
        Hand.disable();
      } else {
        Hand.enable();
      }
    },
  };
});
