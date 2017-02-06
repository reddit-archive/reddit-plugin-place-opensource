from pylons.i18n import N_

from r2.config.routing import not_in_sr
from r2.lib.configparse import ConfigValue
from r2.lib.js import LocalizedModule
from r2.lib.plugin import Plugin


class Place(Plugin):
    needs_static_build = True

    js = {
        "place": LocalizedModule("place.js",
            "websocket.js",
            "place/audio.js",
            "place/color-palette.js",
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
           conditions={"function": not_in_sr})
        mc("/api/place/time", controller="place", action="time_to_wait",
           conditions={"function": not_in_sr})
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
