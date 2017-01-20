from pylons import tmpl_context as c

from r2.controllers import add_controller
from r2.controllers.reddit_base import RedditController
from r2.lib import websockets
from r2.lib.validator import (
    validatedForm,
    VColor,
    VInt,
    VModhash,
    VUser,
)

from .pages import PlacePage, PlaceCanvasse

@add_controller
class PlaceController(RedditController):
    def GET_canvasse(self):
        websocket_url = websockets.make_url("/place", max_age=3600)

        return PlacePage(
            title="place",
            content=PlaceCanvasse(),
            extra_js_config={
                "place_websocket_url": websocket_url,
            },
        ).render()

    @validatedForm(
        VUser(),
        VModhash(),
        x=VInt("x"),
        y=VInt("y"),
        color=VColor("color"),
    )
    def POST_draw(self, form, jquery, x, y, color):
        websockets.send_broadcast(
            namespace="/place",
            type="place",
            payload={
                "author": c.user.name,
                "x": x,
                "y": y,
                "color": color,
            }
        )
