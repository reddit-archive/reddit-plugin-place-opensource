from datetime import datetime, timedelta
import struct
import time

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
    VEmployee,
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
PIXEL_COOLDOWN_SECONDS = 10
PIXEL_COOLDOWN = timedelta(seconds=PIXEL_COOLDOWN_SECONDS)


@add_controller
class PlaceController(RedditController):
    @validate(
        VEmployee(),
        is_embed=VBoolean("is_embed"),
        is_webview=VBoolean("webview", default=False),
    )
    def GET_canvasse(self, is_embed, is_webview):
        websocket_url = websockets.make_url("/place", max_age=3600)

        content = PlaceCanvasse()

        js_config = {
            "place_websocket_url": websocket_url,
            "place_canvas_width": CANVAS_WIDTH,
            "place_canvas_height": CANVAS_HEIGHT,
            "place_cooldown": PIXEL_COOLDOWN_SECONDS,
            "place_fullscreen": is_embed or is_webview, 
        }

        if is_embed:
            # ensure we're off the cookie domain before allowing embedding
            if request.host != g.media_domain:
                abort(404)
            c.allow_framing = True

        if is_embed or is_webview:
            return PlaceEmbedPage(
                title="place",
                content=content,
                extra_js_config=js_config,
            ).render()
        else:
            return PlacePage(
                title="place",
                content=content,
                extra_js_config=js_config,
            ).render()

    @json_validate(
        VUser(),    # NOTE: this will respond with a 200 with an error body
        VEmployee(),
        VModhash(),
        x=VInt("x", min=0, max=CANVAS_WIDTH, coerce=False),
        y=VInt("y", min=0, max=CANVAS_HEIGHT, coerce=False),
        color=VInt("color", min=0, max=15),
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
        VEmployee(),
    )
    def GET_time_to_wait(self, responder):
        if c.user._date >= ACCOUNT_CREATION_CUTOFF:
            self.abort403()

        return {
            "wait_seconds": get_wait_seconds(c.user),
        }

    @json_validate(
        VEmployee(),
    )
    def GET_state(self, responder):
        return [(x, y, d) for (x, y), d in Pixel.get_canvas().iteritems()]

    def GET_board_bitmap(self):

        # Make a blank board
        #
        # We add 1 to the total number of canvas blocks in case the end
        # result is an odd number, which python will round down when we
        # divide by 2.
        #
        # Thus, a 3x3 board (with 9 total pixels) would correctly map to 5
        # bytes, and a 4x3 board (with 12 total pixels) would still correctly
        # map to 6 bytes.
        bitmap = ['\x00'] * ((CANVAS_HEIGHT * CANVAS_HEIGHT + 1) / 2)
        timestamp = time.time()

        # Fill in the pixels that have been set
        for (x, y), d in Pixel.get_canvas().iteritems():
            color = d.get('color')

            # If the color wasn't found, we'll just blank it.
            color = 0 if not color else color

            # We're putting 2 integers into a single byte.  If the integer is
            # an odd number, we can just OR it onto the byte, since we want it
            # at the end.  If it's an even number, it needs to go at the
            # beginning of the byte, so we shift it first.
            offset = y * CANVAS_WIDTH + x
            if offset % 2 == 0:
                color = color << 4

            # Update the color in the bitmap.  Because division rounds down, we
            # can simply divide by 2 to find the correct byte in the bitmap.
            bitmap_idx = offset / 2
            updated_bitmap_int = ord(bitmap[bitmap_idx]) | color
            packed_color = struct.pack('B', updated_bitmap_int)
            bitmap[bitmap_idx] = packed_color

        # We plan on heavily caching this board bitmap.  We include the
        # timestamp as a 32 bit uint at the beginning so the client can make a
        # determination as to whether the cached state is too old.  If it's too
        # old, the client will hit the non-fastly-cached endpoint directly.
        return [struct.pack('I', int(timestamp))] + bitmap

    def GET_board_bitmap_cached(self):
        board_bitmap = g.gencache.get('place:board_bitmap')
        if not board_bitmap:
            board_bitmap = self.GET_board_bitmap()
            g.gencache.set('place:board_bitmap', board_bitmap, time=1)
        return board_bitmap


def get_wait_seconds(user):
    last_pixel_dt = Pixel.get_last_placement_datetime(user)
    now = datetime.now(g.tz)

    if last_pixel_dt and last_pixel_dt + PIXEL_COOLDOWN > now:
        next_pixel_dt = last_pixel_dt + PIXEL_COOLDOWN
        wait_seconds = (next_pixel_dt - now).total_seconds()
    else:
        wait_seconds = 0

    return wait_seconds
