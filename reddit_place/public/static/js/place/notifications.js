!r.placeModule('notifications', function(require) {
  return {
    DEFAULT_TIMEOUT: 3000,

    enabled: false,

    /**
     * Initialize
     * @function
     */
    init: function() {
      if (!window.Notification) {
        return;
      }

      if (Notification.permission === "granted") {
        this.enabled = true;
        return;
      }

      try {
        Notification.requestPermission().then(function(result) {
          if (result === 'granted') {
            this.enabled = true;
          }
        }.bind(this));
      } catch (err) {
        // Do nothing!
      }
    },

    disable: function() {
      this.enabled = false;
    },

    /**
     * Send a browser notification.
     * @function
     * @param {string} Text to include in the notification
     * @param {number} [timeout] Optional timeout.  If included and > 0, the
     *    notification will auto-dismiss after that duration (in ms).  If set
     *    to 0, the timeout will not auto-dismiss.
     */
    sendNotification: function(notificationText, timeout) {
      if (!this.enabled) { return }

      timeout = timeout === undefined ? this.DEFAULT_TIMEOUT : timeout;
      var notif = new Notification('Place', {
        icon: '/static/place_icon.png',
        body: notificationText,
      });

      notif.onclick = function(e) {
        window.focus();
        notif.close();
      };
      
      if (timeout) {
        setTimeout(function() {
          notif.close();
        }, timeout);
      }
    },
  };
});
