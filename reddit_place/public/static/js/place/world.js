!r.placeModule(function world(require) {
  var Canvasse = require('canvasse');

  // Handles actions remote users take
  return {
    drawTile: function(x, y, color) {
      Canvasse.drawTileAt(message.x, message.y, message.color);
    },
  };
});
