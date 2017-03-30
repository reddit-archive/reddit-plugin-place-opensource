!r.placeModule('activity', function(require) {
  function formatCount(count) {
    if (count >= 1000000) {
      // I don't think we need to worry about more than this :P
      return (count / 1000000).toFixed(2) + 'm';
    }
    if (count >= 100000) {
      // Drop the decimal once we're into the 100k range
      return parseInt((count / 1000), 10) + 'k';
    }
    if (count >= 1100) {
      // Show actual numbers up until we'd show at least 1.1k
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  }

  return {
    $el: null,
    initialized: false,
    lastCount: 0,

    /**
     * Initialize the counter element.
     * @function
     * @param {HTMLElement} el
     * @param {number} activeVisitors Count used to set the initial display
     */
    init: function(el, activeVisitors) {
      this.$el = $(el);
      this.$el.removeClass('place-uninitialized');
      this.initialized = true;
      this.setCount(activeVisitors)
    },

    /**
     * Update the display
     * @function
     * @param {count} count
     */
    setCount: function(count) {
      if (!this.initialized) { return; }
      if (count === this.lastCount) { return; }
      this.lastCount = count;
      this.$el.text(formatCount(count));
    },
  };
});
