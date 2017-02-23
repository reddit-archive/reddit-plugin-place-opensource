!r.placeModule(function world(require) {
  var Canvasse = require('canvasse');
  var Client = require('client');

  // Handles actions remote users take
  return {
    drawTile: function(x, y, color) {
      var hexColorString = Client.getPaletteColor(color);
      Canvasse.drawTileAt(x, y, hexColorString);
    },
  };
});
