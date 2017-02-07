from datetime import datetime, timedelta

from pylons import app_globals as g
from pylons import tmpl_context as c
from pylons import response, request

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

from .models import (
    Pixel,
)
from .pages import PlacePage, PlaceCanvasse


ACCOUNT_CREATION_CUTOFF = datetime(2017, 4, 1, 0, 0, tzinfo=g.tz)
PIXEL_COOLDOWN = timedelta(seconds=120)
CANVAS_WIDTH = 1000
CANVAS_HEIGHT = 1000


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

        if x is None or x > CANVAS_WIDTH or x < 0:
            c.errors.add(errors.BAD_NUMBER, "x")

        if y is None or y > CANVAS_HEIGHT or y < 0:
            c.errors.add(errors.BAD_NUMBER, "y")

        if (responder.has_errors("x", errors.BAD_NUMBER) or
                responder.has_errors("y", errors.BAD_NUMBER)):
            return

        if not color:
            c.errors.add(errors.BAD_COLOR, "color")

        if responder.has_errors("color", errors.BAD_COLOR):
            return

        wait_seconds = get_wait_seconds(c.user)
        if wait_seconds > 2:
            response.status = 429
            request.environ['extra_error_data'] = {
                "error": 429,
                "wait_seconds": wait_seconds,
            }

        pixel = Pixel.create(c.user, color, x, y)

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

    @json_validate(
        VUser(),
    )
    def GET_time_to_wait(self, responder):
        if c.user._date >= ACCOUNT_CREATION_CUTOFF:
            self.abort403()

        return {
            "wait_seconds": get_wait_seconds(c.user),
        }


def get_wait_seconds(user):
    last_pixel_dt = Pixel.get_last_placement_datetime(user)
    now = datetime.now(g.tz)

    if last_pixel_dt and last_pixel_dt + PIXEL_COOLDOWN > now:
        next_pixel_dt = last_pixel_dt + PIXEL_COOLDOWN
        wait_seconds = (next_pixel_dt - now).total_seconds()
    else:
        wait_seconds = 0

    return wait_seconds
