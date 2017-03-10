!r.placeModule('world', function(require) {
  var Canvasse = require('canvasse');
  var Client = require('client');

  // Handles actions remote users take
  return {
    enabled: true,

    drawTile: function(x, y, color) {
      var color = Client.getPaletteColorABGR(color);
      var i = Canvasse.getIndexFromCoords(x, y);
      Client.state[i] = this.colorIndex;

      if (this.enabled) {
        Canvasse.drawTileAt(x, y, color);
      } else {
        Canvasse.drawTileToBuffer(x, y, color);
      }

      Client.trackRecentTile(x, y);
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
