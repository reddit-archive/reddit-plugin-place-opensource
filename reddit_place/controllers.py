import datetime

from pylons import app_globals as g
from pylons import tmpl_context as c

from r2.controllers import add_controller
from r2.controllers.reddit_base import RedditController
from r2.lib import websockets
from r2.lib.errors import errors
from r2.lib.validator import (
    json_validate,
    VColor,
    VInt,
    VModhash,
    VUser,
)

from .pages import PlacePage, PlaceCanvasse


ACCOUNT_CREATION_CUTOFF = datetime.datetime(2017, 4, 1, 0, 0, tzinfo=g.tz)


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

    @json_validate(
        VUser(),    # NOTE: this will respond with a 200 with an error body
        VModhash(),
        x=VInt("x"),
        y=VInt("y"),
        color=VColor("color"),
    )
    def POST_draw(self, responder, x, y, color):
        if c.user._date >= ACCOUNT_CREATION_CUTOFF:
            self.abort403()

        if x is None:
            c.errors.add(errors.BAD_NUMBER, "x")

        if y is None:
            c.errors.add(errors.BAD_NUMBER, "y")

        if (responder.has_errors("x", errors.BAD_NUMBER) or
                responder.has_errors("y", errors.BAD_NUMBER)):
            return

        if not color:
            c.errors.add(errors.BAD_COLOR, "color")

        if responder.has_errors("color", errors.BAD_COLOR):
            return

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
