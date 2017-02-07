!r.placeModule(function cameraevents(require) {
  var Client = require('client');
  var Cursor = require('cursor');

  // Client events that primarily handle updating the camera
  // IMPORTANT NOTE – (x, y) coordinates here are in "container space". That is,
  // relative to the top left corner of the application container and in units
  // relative to the screen.  These events are used to update the Cursor object,
  // which also tracks position in "container space".
  return {
    'mousedown': function(e) {
      var x = parseInt(e.clientX, 10);
      var y = parseInt(e.clientY, 10);
      Cursor.setCursorDown(x, y);
    },

    'mouseup': function(e) {
      var x = parseInt(e.clientX, 10);
      var y = parseInt(e.clientY, 10);
      Cursor.setCursorUp(x, y);
    },

    'mousemove': function(e) {
      var x = parseInt(e.clientX, 10);
      var y = parseInt(e.clientY, 10);

      if (!Cursor.isDown) {
        Cursor.setTargetPosition(x, y);
        return;
      }

      // We need to undo the previous transform first
      var oldOffsetX = (Cursor.x - Cursor.downX) / Client.zoom;
      var oldOffsetY = (Cursor.y - Cursor.downY) / Client.zoom;

      // Then update the cursor position so we can do the same on
      // the next mousemove event
      Cursor.setPosition(x, y);

      // Finally, calculate the new offset
      var newOffsetX = (x - Cursor.downX) / Client.zoom;
      var newOffsetY = (y - Cursor.downY) / Client.zoom;

      // And update the offset.  Important to know that Client
      // expects offset coordinates in canvas-space, which is why
      // we are only calculating an offset relative to the current
      // camera position and scaling that to the zoom level.
      Client.setOffset(
        Client.panX - oldOffsetX + newOffsetX,
        Client.panY - oldOffsetY + newOffsetY
      );
    },
  };
});
