r.placeModule('selector', function(require) {
  // we're about to do some terrible things.
  var r = require('r');

  var AdminAPI = require('adminapi');
  var bindEvents = require('utils').bindEvents;
  var Canvasse = require('canvasse');
  var Client = require('client');
  var Hand = require('hand');
  var hijack = require('utils').hijack;
  var Palette = require('palette');
  var World = require('world');
  var Notifications = require('notifications');

  var Selector = {
    isSelecting: false,
    anchorX: null,
    anchorY: null,
    selectionColor: 'hotpink',
  };

  // Inject the selection functionality into the Client.drawTile method.
  // If in "selection" mode, we'll handle it here.  Otherwise, we just
  // pass the call along to the original method.
  // WARNING - this depends on the current behavior of Client.drawTile.
  // If that changes significantly, this could stop working.
  hijack(Client, 'drawTile', function selectorDrawTile(x, y) {
    if (!Selector.isSelecting) {
      // Just normal drawing.
      this.targetMethod.call(this, x, y);
      return;
    }

    if (!this.paletteColor || !this.enabled) {
      return;
    }
    
    // Drawing the rect will take place in two steps.  The first step will
    // be setting an anchor coordinate.  The second step will define another
    // anchor coordinate.  The rectangle will fill the space between the
    // two anchors.

    if (Selector.anchorX === null) {
      // If anchor coordinates aren't set, then this is step one.
      Selector.anchorX = x;
      Selector.anchorY = y;
      Canvasse.drawTileToDisplay(x, y, Selector.selectionColor);
      return;
    }

    var minX = Math.min(x, Selector.anchorX);
    var minY = Math.min(y, Selector.anchorY);
    var maxX = Math.max(x, Selector.anchorX);
    var maxY = Math.max(y, Selector.anchorY);
    var width = maxX - minX + 1;
    var height = maxY - minY + 1;

    this.disable();
    Canvasse.drawRectToDisplay(minX, minY, width, height, Selector.selectionColor);

    AdminAPI.drawRect(minX, minY, width, height).always(
      function onFinally() {
        // Undo the selection rect drawing.  We'll just rely on the websocket
        // events for the actual updates.
        Canvasse.clearRectFromDisplay(minX, minY, width, height);
        Canvasse.drawBufferToDisplay();
        World.enable();
        this.clearColor();
        this.setCooldownTime(this.cooldown);
      }.bind(this)
    );

    Selector.isSelecting = false;
    Selector.anchorX = null;
    Selector.anchorY = null;
  });

  // Needed to make sure that Palette is initialized first.
  r.hooks.get('place.init').register(function() {
    // notifs don't make sense in admin mode since you can always place
    // another tile
    Notifications.disable();

    var selectionSwatch = Palette.buildSwatch(Selector.selectionColor);

    bindEvents(selectionSwatch, {
      'click': function(e) {
        e.stopPropagation();
        Selector.isSelecting = true;
        // Stop drawing incoming websocket updates while selecting.
        World.disable();
        if (!Client.paletteColor) {
          Client.setColor(0);
        }
        Hand.updateColor(Selector.selectionColor);
      },
    });
  });

  return Selector;
});
