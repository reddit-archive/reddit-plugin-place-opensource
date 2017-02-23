!r.placeModule('utils', function(require) {
  return {
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
    lerp: function(startVal, endVal, interpolationAmount) {
      return startVal + interpolationAmount * (endVal - startVal);
    },
  };
});
