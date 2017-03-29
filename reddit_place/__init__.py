from pylons.i18n import N_

from r2.config.routing import not_in_sr
from r2.lib.configparse import ConfigValue
from r2.lib.js import Module
from r2.lib.plugin import Plugin


class Place(Plugin):
    needs_static_build = True

    js = {
        "place-base": Module("place-base.js",
            # core & external dependencies
            "websocket.js",
            "place/modules.js",
            "place/utils.js",

            # 'exit node' modules, no internal dependencies
            "place/activity.js",
            "place/api.js",
            "place/audio.js",
            "place/camera.js",
            "place/camerabutton.js",
            "place/canvasse.js",
            "place/coordinates.js",
            "place/hand.js",
            "place/inspector.js",
            "place/keyboard.js",
            "place/mollyguard.js",
            "place/mutebutton.js",
            "place/notificationbutton.js",
            "place/notifications.js",
            "place/palette.js",
            "place/zoombutton.js",
            "place/timer.js",

            # 'internal node' modules, only dependant on 'exit nodes'
            "place/client.js",
            "place/cursor.js",
            "place/world.js",

            # 'entrance node' modules, only dependant on 'internal' or 'exit' nodes
            "place/camerabuttonevents.js",
            "place/cameraevents.js",
            "place/canvasevents.js",
            "place/mutebuttonevents.js",
            "place/notificationbuttonevents.js",
            "place/paletteevents.js",
            "place/websocketevents.js",
            "place/zoombuttonevents.js",
        ),
        # Optionally included admin-only modules
        "place-admin": Module("place-admin.js",
            "place/admin/api.js",

            "place/admin/slider.js",
            "place/admin/selector.js",
        ),
        "place-init": Module("place-init.js",
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
        mc("/api/place/board-bitmap", controller="loggedoutplace",
           action="board_bitmap", conditions={"function": not_in_sr})

        mc("/api/place/:action", controller="place",
           conditions={"function": not_in_sr})

    def load_controllers(self):
        from r2.lib.pages import Reddit
        from reddit_place.controllers import (
            controller_hooks,
            PlaceController,
        )

        controller_hooks.register_all()

        Reddit.extra_stylesheets.append('place_global.less')

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
