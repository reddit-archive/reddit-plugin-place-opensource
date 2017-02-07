!r.placeModule(function cursor(require) {
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
});
