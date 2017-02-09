from datetime import datetime, timedelta

from pylons import app_globals as g
from pylons import tmpl_context as c
from pylons import response, request
from pylons.i18n import _

from r2.controllers import add_controller
from r2.controllers.reddit_base import RedditController
from r2.lib import websockets
from r2.lib.errors import errors
from r2.lib.validator import (
    json_validate,
    validate,
    VBoolean,
    VColor,
    VInt,
    VModhash,
    VUser,
)

from .models import (
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    Pixel,
)
from .pages import (
    PlaceEmbedPage,
    PlacePage,
    PlaceCanvasse,
)


ACCOUNT_CREATION_CUTOFF = datetime(2017, 4, 1, 0, 0, tzinfo=g.tz)
PIXEL_COOLDOWN = timedelta(seconds=10)


@add_controller
class PlaceController(RedditController):
    @validate(
        is_embed=VBoolean("is_embed"),
    )
    def GET_canvasse(self, is_embed):
        websocket_url = websockets.make_url("/place", max_age=3600)

        content = PlaceCanvasse()

        if is_embed:
            # ensure we're off the cookie domain before allowing embedding
            if request.host != g.media_domain:
                abort(404)
            c.allow_framing = True

            return PlaceEmbedPage(
                title="place",
                content=content,
                extra_js_config={
                    "place_websocket_url": websocket_url,
                },
            ).render()
        else:
            return PlacePage(
                title="place",
                content=content,
                extra_js_config={
                    "place_websocket_url": websocket_url,
                },
            ).render()

    @json_validate(
        VUser(),    # NOTE: this will respond with a 200 with an error body
        VModhash(),
        x=VInt("x", min=0, max=CANVAS_WIDTH, coerce=False),
        y=VInt("y", min=0, max=CANVAS_HEIGHT, coerce=False),
        color=VColor("color"),
    )
    def POST_draw(self, responder, x, y, color):
        if c.user._date >= ACCOUNT_CREATION_CUTOFF:
            self.abort403()

        if x is None:
            # copy the error set by VNumber/VInt
            c.errors.add(
                error_name=errors.BAD_NUMBER,
                field="x",
                msg_params={
                    "range": _("%(min)d to %(max)d") % {
                        "min": 0,
                        "max": CANVAS_WIDTH,
                    },
                },
            )

        if y is None:
            # copy the error set by VNumber/VInt
            c.errors.add(
                error_name=errors.BAD_NUMBER,
                field="y",
                msg_params={
                    "range": _("%(min)d to %(max)d") % {
                        "min": 0,
                        "max": CANVAS_HEIGHT,
                    },
                },
            )

        if not color:
            c.errors.add(errors.BAD_COLOR, field="color")

        if (responder.has_errors("x", errors.BAD_NUMBER) or
                responder.has_errors("y", errors.BAD_NUMBER) or
                responder.has_errors("color", errors.BAD_COLOR)):
            # TODO: return 400 with parsable error message?
            return

        wait_seconds = get_wait_seconds(c.user)
        if wait_seconds > 2:
            response.status = 429
            request.environ['extra_error_data'] = {
                "error": 429,
                "wait_seconds": wait_seconds,
            }
            return

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

    @json_validate()
    def GET_state(self, responder):
        return [(x, y, d) for (x, y), d in Pixel.get_canvas().iteritems()]


def get_wait_seconds(user):
    last_pixel_dt = Pixel.get_last_placement_datetime(user)
    now = datetime.now(g.tz)

    if last_pixel_dt and last_pixel_dt + PIXEL_COOLDOWN > now:
        next_pixel_dt = last_pixel_dt + PIXEL_COOLDOWN
        wait_seconds = (next_pixel_dt - now).total_seconds()
    else:
        wait_seconds = 0

    return wait_seconds
