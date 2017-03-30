!r.placeModule('utils', function(require) {
  var MIN_LERP_VAL = 0.05;

  return {
    /**
     * Utility for linear interpolation between to values
     * Useful as a cheap and easy way to ease between two values
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
      var lerpVal = startVal + interpolationAmount * (endVal - startVal);
      if (Math.abs(endVal - lerpVal) < MIN_LERP_VAL) {
        return endVal;
      }
      return lerpVal;
    },

    /**
     * Utility for binding a bunch of events to a single element.
     * @function
     * @param {HTMLElement} target
     * @param {Object<function>} eventsDict A dictionary of event handling functions.
     *    Each key should be the name of the event to bind the handler to.
     * @param {bool} [useCapture] Whether to use event capturing.  Defaults to true.
     */
    bindEvents: function(target, eventsDict, useCapture) {
      useCapture = useCapture === undefined ? true : useCapture;

      for (var event in eventsDict) {
        // If useCapture changes from true to false,
        // CanvasEvents.mouseup will stop working correctly
        target.addEventListener(event, eventsDict[event], true);
      }
    },

    /**
     * Utility to parse a hex color string into a color object
     * @function
     * @param {string} hexColor A css hex color, including the # prefix
     * @returns {Color}
     */
    parseHexColor: function(hexColor) {
      var colorVal = parseInt(hexColor.slice(1), 16);
      return {
        red: colorVal >> 16 & 0xFF,
        green: colorVal >> 8 & 0xFF,
        blue: colorVal & 0xFF,
      };
    },

    /**
     * Utility for wrapping a method with a sort of decorator function
     * Used specifically from admin tools to inject behavior into some other modules
     * @function
     * @param {Object} target
     * @param {string} methodName
     * @param {function} fn
     */
    hijack: function(target, methodName, fn) {
      var targetMethod = target[methodName];
      // Overwrite the original function.  The fn function can access
      // the original function as this.targetMethod
      target[methodName] = function() {
        // Give the context object a special key that points to the original function
        target.targetMethod = targetMethod;
        var res = fn.apply(target, arguments);
        delete target.targetMethod;
      };
    },

    /**
     * Keeps a value between a min and a max value
     * @function
     * @param {number} min
     * @param {number} max
     * @param {number} num The value you're trying to clamp
     * @returns {number} The clamped value
     */
    clamp: function(min, max, num) {
      return Math.min(Math.max(num, min), max);
    },

    /**
     * Get the distance between two coordinates.
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @returns {number}
     */
    getDistance: function(x1, y1, x2, y2) {
      var dx = x1 - x2;
      var dy = y1 - y2;
      return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Normalizes a given {x, y} vector to be a unit-length vector
     * This modifies the given vector object.
     * @param {Object} vector
     */
    normalizeVector: function(vector) {
      var x = vector.x;
      var y = vector.y;
      if (!(x || y)) { return }
      var length = Math.sqrt(x * x + y * y);
      if (!length) { return }
      vector.x = x / length;
      vector.y = y / length;
    },
  };
});
