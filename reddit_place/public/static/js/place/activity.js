!r.placeModule('activity', function(require) {
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
      this.$el.text(count);
    },
  };
});
