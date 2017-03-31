!r.placeModule('cameraevents', function(require) {
  var Client = require('client');
  var Cursor = require('cursor');

  var E_KEY = 69;

  /**
   * @typedef {Object} Coordinate
   * @property {number} x
   * @property {number} y
   */

  /**
   * Utility to get the {x, y} coordinates from an event.
   * @function
   * @param {Event} e
   * @returns {Coordinate}
   */
  function getCoordsFromEvent(e) {
    return {
      x: parseInt(e.clientX, 10) + window.scrollX,
      y: parseInt(e.clientY, 10) + window.scrollY,
    };
  }

  // Client events that primarily handle updating the camera
  // IMPORTANT NOTE – (x, y) coordinates here are in "container space". That is,
  // relative to the top left corner of the application container and in units
  // relative to the screen.  These events are used to update the Cursor object,
  // which also tracks position in "container space".
  return {
    'container': {
      'mousedown': function(e) {
        var coords = getCoordsFromEvent(e);
        Cursor.setCursorDown(coords.x, coords.y);
      },

      'mouseup': function(e) {
        var coords = getCoordsFromEvent(e);
        Cursor.setCursorUp(coords.x, coords.y);
      },

      'mousemove': function(e) {
        var coords = getCoordsFromEvent(e);

        var offsetLeft = e.currentTarget ? e.currentTarget.offsetLeft : 0;
        var offsetTop = e.currentTarget ? e.currentTarget.offsetTop : 0;
        var tileCoords = Client.getLocationFromCursorPosition(
          coords.x - offsetLeft,
          coords.y - offsetTop
        );
        var activeTileCoords = Client.getCursorPositionFromLocation(tileCoords.x, tileCoords.y);
        Cursor.setActiveTilePosition(
          activeTileCoords.x + offsetLeft,
          activeTileCoords.y + offsetTop
        );

        if (!Cursor.isDown) {
          Cursor.setTargetPosition(coords.x, coords.y);
          return;
        }

        Client.interact();

        // We need to undo the previous transform first
        var oldOffsetX = (Cursor.x - Cursor.downX) / Client.zoom;
        var oldOffsetY = (Cursor.y - Cursor.downY) / Client.zoom;

        // Then update the cursor position so we can do the same on
        // the next mousemove event
        Cursor.setPosition(coords.x, coords.y);

        if (!Client.isPanEnabled) { return; }

        // Finally, calculate the new offset
        var newOffsetX = (coords.x - Cursor.downX) / Client.zoom;
        var newOffsetY = (coords.y - Cursor.downY) / Client.zoom;

        // And update the offset.  Important to know that Client
        // expects offset coordinates in canvas-space, which is why
        // we are only calculating an offset relative to the current
        // camera position and scaling that to the zoom level.
        Client.setOffset(
          Client.panX - oldOffsetX + newOffsetX,
          Client.panY - oldOffsetY + newOffsetY
        );
      },
    },

    'document': {
      'keydown': function(e) {
        if (e.which === E_KEY) {
          Client.toggleZoom();
        }
      },
    },
  };
});
