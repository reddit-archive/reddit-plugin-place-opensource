!r.placeModule('canvasevents', function(require) {
  var Client = require('client');
  var Cursor = require('cursor');

  // Client events that apply changes to the canvas.
  // IMPORTANT NOTE – (x,y) coordinates here are in "canvas space".  That is,
  // they are relative to the top left corner of the canvas and at a 1:1 ratio
  // with the real canvas size.  It's important to note that the Cursor object
  // tracks position in "container space".
  return {
    'mouseup': function(e) {
      // Ignore right clicks
      if (e.which === 3) { return; }

      var x = Math.round(e.offsetX);
      var y = Math.round(e.offsetY);

      if (Cursor.didDrag) { return; }
      
      // If zoomed out, clicking will zoom in.
      if (!Client.isZoomedIn) {
        var offset = Client.getOffsetFromCameraLocation(x, y);
        Client.toggleZoom(offset.x, offset.y);
      } else if (Client.hasColor()) {
        Client.drawTile(x, y);
      } else {
        Client.inspectTile(x, y);
      }
    },

    // I.E. right-click.
    'contextmenu': function(e) {
      // We don't actually want the OS contextual menu.
      e.preventDefault();

      // If holding a color, the right click will drop it instead of toggling
      // zoom levels.
      if (Client.hasColor()) {
        Client.clearColor();
        return;
      }

      var x = Math.round(e.offsetX);
      var y = Math.round(e.offsetY);

      // The (x, y) coordinates we have are in "canvas space" relative.  We need
      // coordinates in "camera space", i.e. relative to the middle of the canvas.
      // Yes, we effectively have three coordinate systems in play. 
      var offset = Client.getOffsetFromCameraLocation(x, y);
      Client.toggleZoom(offset.x, offset.y);
    },
  };
});
