from pylons.i18n import N_

from r2.config.routing import not_in_sr
from r2.lib.configparse import ConfigValue
from r2.lib.js import LocalizedModule
from r2.lib.plugin import Plugin


class Place(Plugin):
    needs_static_build = True

    js = {
        "place": LocalizedModule("place.js",
            # core & external dependencies
            "websocket.js",
            "place/modules.js",
            "place/utils.js",

            # 'exit node' modules, no internal dependencies
            "place/api.js",
            "place/audio.js",
            "place/camera.js",
            "place/canvasse.js",
            "place/hand.js",
            "place/palette.js",

            # 'internal node' modules, only dependant on 'exit nodes'
            "place/client.js",
            "place/cursor.js",
            "place/world.js",

            # 'entrance node' modules, only dependant on 'internal nodes'
            "place/cameraevents.js",
            "place/canvasevents.js",
            "place/paletteevents.js",
            "place/websocketevents.js",

            # entry point
            "place/init.js",
        ),
    }

    config = {
        # TODO: your static configuratation options go here, e.g.:
        # ConfigValue.int: [
        #     "place_blargs",
        # ],
    }

    live_config = {
        # TODO: your live configuratation options go here, e.g.:
        # ConfigValue.int: [
        #     "place_realtime_blargs",
        # ],
    }

    errors = {
        # TODO: your API errors go here, e.g.:
        # "PLACE_NOT_COOL": N_("not cool"),
    }

    def add_routes(self, mc):
        mc("/place", controller="place", action="canvasse",
           conditions={"function": not_in_sr}, is_embed=False)
        mc("/place/embed", controller="place", action="canvasse",
           conditions={"function": not_in_sr}, is_embed=True)
        mc("/api/place/time", controller="place", action="time_to_wait",
           conditions={"function": not_in_sr})

        # To save on reads from cassandra, we try to cache in a number of
        # places.  First we rely on fastly.  If the client sees the cached data
        # is too old, it will then hit the endpoint backed by memcached.
        # If for some reason that fails, or we need to debug, we do a 3rd
        # endpoint with no caching whatsoever.
        #
        # Cached by fastly
        mc("/api/place/board-bitmap", controller="place",
           action="board_bitmap", conditions={"function": not_in_sr})
        # Straight from Cassandra.  The same endpoint as above, but not cached
        # by fastly.
        mc("/api/place/board-bitmap/nocache", controller="place",
           action="board_bitmap", conditions={"function": not_in_sr})
        # Cached by memcached
        mc("/api/place/board-bitmap/cached", controller="place",
           action="board_bitmap_cached", conditions={"function": not_in_sr})

        mc("/api/place/:action", controller="place",
           conditions={"function": not_in_sr})

    def load_controllers(self):
        from reddit_place.controllers import (
            PlaceController,
        )

    def declare_queues(self, queues):
        # TODO: add any queues / bindings you need here, e.g.:
        #
        # queues.some_queue_defined_elsewhere << "routing_key"
        #
        # or
        #
        # from r2.config.queues import MessageQueue
        # queues.declare({
        #     "some_q": MessageQueue(),
        # })
        pass
