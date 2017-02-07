!r.placeModule(function canvasevents(require) {
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

      if (!Cursor.didDrag) {
        Client.drawTile(x, y);
      }
    },

    // I.E. right-click.
    'contextmenu': function(e) {
      // We don't actually want the OS contextual menu.
      e.preventDefault();

      var x = Math.round(e.offsetX);
      var y = Math.round(e.offsetY);

      // The (x, y) coordinates we have are in "canvas space" relative.  We need
      // coordinates in "camera space", i.e. relative to the middle of the canvas.
      // Yes, we effectively have three coordinate systems in play. 
      var canvasSize = Client.getCanvasSize();
      var offsetX = canvasSize.width / 2 - x;
      var offsetY = canvasSize.height / 2 - y;

      if (!Client.isZoomedIn) {
        Client.setTargetOffset(offsetX, offsetY);
      }
      Client.toggleZoom();
    },
  };
});
