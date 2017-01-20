!function(r, $, _){
  var Canvasse = {
    ELEMENT_ID: 'canvasse',
    WIDTH: 200,
    HEIGHT: 200,

    el: null,
    ctx: null,
 
    /**
     * Initialize the Canvasse
     * Grab the canvas element reference and create the drawing context
     */
    init: function() {
      this.el = document.getElementById(this.ELEMENT_ID);
      this.el.width = this.WIDTH;
      this.el.height = this.HEIGHT;

      this.ctx = this.el.getContext('2d');
    },

    /**
     * Draw a color to the canvas.
     * Only handles updating the local canvas.
     * Coordinates are in canvas pixels, not screen pixels.
     * @function
     * @param {int} x
     * @param {int} y
     * @param {string} color Any valid css color string
     */
    drawTileAt: function(x, y, color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, 1, 1);
    },
  };

  var websocket = new r.WebSocket(r.config.place_websocket_url);
  websocket.on({
    'connecting': function() {
      console.log('connecting');
    },

    'connected': function() {
      console.log('connected');
    },

    'disconnected': function() {
      console.log('disconnected');
    },

    'reconnecting': function(delay) {
      console.log('reconnecting in ' + delay + ' seconds...');
    },

    'message:place': function(message) {
      console.log(message.x, message.y, message.color);
      Canvasse.drawTileAt(message.x, message.y, message.color);
    },
  });

  r.place = {
    color: '#000000',
    zoom: 1,

    pickTileColor: function(color) {
      this.color = color;
    },

    drawTile: function(x, y) {
      if (!this.color) { throw new Error('no color!') }
      
      Canvasse.drawTileAt(x, y, this.color);

      r.ajax({
        url: '/api/place/draw',
        type: 'POST',
        data: {
          x: x,
          y: y,
          color: this.color,
        },
      });
    },
  };

  $(function() {
    Canvasse.init();

    $(Canvasse.el).on('click', function(e) {
      var x = parseInt(e.offsetX / r.place.zoom, 10);
      var y = parseInt(e.offsetY / r.place.zoom, 10);

      r.place.drawTile(x, y);
    });

    websocket.start();
  });
}(r, jQuery, _);
