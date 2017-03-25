!r.placeModule('timer', function(require) {
  var $ = require('jQuery');
  var intervalToken;

  return {
    REFRESH_INTERVAL_MS: 100,

    $el: null,

    /**
     * Initialize the timer component with a DOM element
     * @function
     * @param {HTMLElement} el
     */
    init: function(el) {
      this.$el = $(el);
      this.lastDisplayText = null;
    },

    /**
     * Get the current time remaining from the given timestamp
     * @function
     * @param {number} stopTime A timestamp in ms, should be in the future
     * @returns {number} Time in ms
     */
    getTimeRemaining: function(stopTime) {
      var now = Date.now();
      return Math.max(0, stopTime - now);
    },

    show: function() {
      this.$el.show();
    },

    hide: function() {
      this.$el.hide();
    },

    setText: function(text) {
      this.$el.text(text);
    },

    /**
     * Start the timer loop
     * This kicks off an interval to update the UI.  Note that this does
     * not automatically _show_ the UI.
     * @function
     * @param {number} stopTime A timestamp in ms, should be in the future
     */
    startTimer: function(stopTime) {
      this.stopTimer();

      var updateTime = function() {
        var ms = this.getTimeRemaining(stopTime);
        // Force an upper limit of 59:59 so we don't have to deal with hours :P
        var s = Math.min(3599, Math.ceil(ms / 1000));
        var m = Math.floor(s / 60);
        s = s % 60;

        var seconds = (s < 10 ? '0' : '') + s;
        var minutes = (m < 10 ? '0' : '') + m;
        var displayText = minutes + ':' + seconds;

        if (displayText !== this.lastDisplayText) {
          this.lastDisplayText = displayText;
          this.setText(displayText);
        }

        if (!ms) {
          this.stopTimer();
        }
      }.bind(this);

      // update immediately so the first display is correct
      updateTime();
      intervalToken = setInterval(updateTime, this.REFRESH_INTERVAL_MS);
    },

    /**
     * Stop the current update interval function, if there is one.
     * @function
     */
    stopTimer: function() {
      if (intervalToken) {
        intervalToken = clearInterval(intervalToken);
      }
    },
  };
});
