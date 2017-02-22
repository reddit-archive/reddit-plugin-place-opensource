!r.placeModule('world', function(require) {
  var Canvasse = require('canvasse');
  var Client = require('client');

  // Handles actions remote users take
  return {
    enabled: true,

    drawTile: function(x, y, color) {
      var hexColorString = Client.getPaletteColor(color);

      if (this.enabled) {
        Canvasse.drawTileAt(x, y, hexColorString);
      } else {
        Canvasse.drawTileToBuffer(x, y, hexColorString);
      }
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
