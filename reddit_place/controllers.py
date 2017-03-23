from datetime import datetime, timedelta
import time

from pylons import app_globals as g
from pylons import tmpl_context as c
from pylons import response, request
from pylons.i18n import _

from r2.controllers import add_controller
from r2.controllers.reddit_base import (
        RedditController,
        set_content_type,
)
from r2.lib import hooks
from r2.lib import (
    baseplate_integration,
    websockets,
)
from r2.lib.base import BaseController
from r2.lib.errors import errors
from r2.lib.validator import (
    json_validate,
    validate,
    VAdmin,
    VBoolean,
    VColor,
    VInt,
    VModhash,
    VUser,
)
from r2.models import Subreddit
from r2.controllers.oauth2 import (
    allow_oauth2_access,
)

from . import events
from .models import (
    CANVAS_ID,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    Pixel,
    RedisCanvas,
)
from .pages import (
    PlaceEmbedPage,
    PlacePage,
    PlaceCanvasse,
)


controller_hooks = hooks.HookRegistrar()


ACCOUNT_CREATION_CUTOFF = datetime(2017, 4, 1, 0, 0, tzinfo=g.tz)
PIXEL_COOLDOWN_SECONDS = 10
PIXEL_COOLDOWN = timedelta(seconds=PIXEL_COOLDOWN_SECONDS)
ADMIN_RECT_DRAW_MAX_SIZE = 20
PLACE_SUBREDDIT = Subreddit._by_name("place", stale=True)


@add_controller
class LoggedOutPlaceController(BaseController):
    def pre(self):
        BaseController.pre(self)

        if "Origin" in request.headers:
            oauth_origin = "https://%s" % g.oauth_domain
            response.headers["Access-Control-Allow-Origin"] = oauth_origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Methods"] = "GET"
            response.headers["Access-Control-Allow-Credentials"] = "true"

    # We want to be able to cache some endpoints regardless of whether or not
    # the user is logged in.  For this, we need to inherit from
    # BaseController.  This lets us avoid the cache poisoning and logged in
    # checks embedded in MinimalController that would prevent caching.

    def _get_board_bitmap(self):

        # Since we're not using MinimalController, we need to setup the
        # baseplate span manually to have access to the baseplate context.
        baseplate_integration.make_server_span(
            span_name="place.GET_board_bitmap").start()
        response = RedisCanvas.get_board()
        baseplate_integration.finish_server_span()
        return response

    def GET_board_bitmap(self):
        """
        Get board bitmap with cache control determined by GET parames.
        """

        # nocache
        if 'nocache' in request.GET:
            response.headers['Cache-Control'] = 'private'
        else:
            response.headers['Cache-Control'] = 'max-age=1'

        # nostalecache
        dont_stalecache = 'nostalecache' in request.GET or not g.stalecache
        if dont_stalecache:
            board_bitmap = None
        else:
            board_bitmap = g.stalecache.get('place:board_bitmap')

        # redis
        if not board_bitmap:
            board_bitmap = self._get_board_bitmap()
            if not dont_stalecache:
                g.stalecache.set('place:board_bitmap', board_bitmap, time=1,
                                 noreply=True)

        return self._get_board_bitmap()

    def post(self):

        # This should never happen.  Our routes should never be changing the
        # login status of a user.  Still, since we plan on heavily caching
        # these routes, it's better safe than sorry.  We don't want to
        # accidentally cache sensitive information.
        for k, v in response.headers.iteritems():
            assert k != 'Set-Cookie'


@add_controller
class PlaceController(RedditController):
    def pre(self):
        RedditController.pre(self)

        if not c.user.employee:
            self.abort403()

        if c.user.in_timeout:
            self.abort403()

        if c.user._spam:
            self.abort403()

    @validate(
        is_embed=VBoolean("is_embed"),
        is_webview=VBoolean("webview", default=False),
    )
    @allow_oauth2_access
    def GET_canvasse(self, is_embed, is_webview):
        # oauth will try to force the response into json
        # undo that here by hacking extension, content_type, and render_style
        try:
            del(request.environ['extension'])
        except:
            pass
        request.environ['content_type'] = "text/html; charset=UTF-8"
        request.environ['render_style'] = "html"
        set_content_type()

        websocket_url = websockets.make_url("/place", max_age=3600)

        content = PlaceCanvasse()

        js_config = {
            "place_websocket_url": websocket_url,
            "place_canvas_width": CANVAS_WIDTH,
            "place_canvas_height": CANVAS_HEIGHT,
            "place_cooldown": 0 if c.user_is_admin else PIXEL_COOLDOWN_SECONDS,
            "place_fullscreen": is_embed or is_webview,
        }

        activity = PLACE_SUBREDDIT.count_activity()
        if activity and activity.logged_in:
            js_config["place_active_visitors"] = activity.logged_in.count

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
        VModhash(),
        x=VInt("x", min=0, max=CANVAS_WIDTH, coerce=False),
        y=VInt("y", min=0, max=CANVAS_HEIGHT, coerce=False),
        color=VInt("color", min=0, max=15),
    )
    @allow_oauth2_access
    def POST_draw(self, responder, x, y, color):
        if c.user._date >= ACCOUNT_CREATION_CUTOFF:
            self.abort403()

        if PLACE_SUBREDDIT.is_banned(c.user):
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

        if color is None:
            c.errors.add(errors.BAD_COLOR, field="color")

        if (responder.has_errors("x", errors.BAD_NUMBER) or
                responder.has_errors("y", errors.BAD_NUMBER) or
                responder.has_errors("color", errors.BAD_COLOR)):
            # TODO: return 400 with parsable error message?
            return

        if c.user_is_admin:
            wait_seconds = 0
        else:
            wait_seconds = get_wait_seconds(c.user)

        if wait_seconds > 2:
            response.status = 429
            request.environ['extra_error_data'] = {
                "error": 429,
                "wait_seconds": wait_seconds,
            }
            return

        Pixel.create(c.user, color, x, y)

        c.user.set_flair(
            subreddit=PLACE_SUBREDDIT,
            text="({x},{y}) {time}".format(x=x, y=y, time=time.time()),
            css_class="place-%s" % color,
        )

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

        events.place_pixel(x, y, color)

    @json_validate(
        VUser(),    # NOTE: this will respond with a 200 with an error body
        VAdmin(),
        VModhash(),
        x=VInt("x", min=0, max=CANVAS_WIDTH, coerce=False),
        y=VInt("y", min=0, max=CANVAS_HEIGHT, coerce=False),
        width=VInt("width", min=1, max=ADMIN_RECT_DRAW_MAX_SIZE,
                   coerce=True, num_default=1),
        height=VInt("height", min=1, max=ADMIN_RECT_DRAW_MAX_SIZE,
                    coerce=True, num_default=1),
        color=VInt("color", min=0, max=15),
    )
    @allow_oauth2_access
    def POST_drawrect(self, responder, x, y, width, height, color):
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

        if color is None:
            c.errors.add(errors.BAD_COLOR, field="color")

        if (responder.has_errors("x", errors.BAD_NUMBER) or
                responder.has_errors("y", errors.BAD_NUMBER) or
                responder.has_errors("color", errors.BAD_COLOR)):
            # TODO: return 400 with parsable error message?
            return

        # prevent drawing outside of the canvas
        width = min(CANVAS_WIDTH - x, width)
        height = min(CANVAS_HEIGHT - y, height)

        batch_payload = []

        for _x in xrange(x, x + width):
            for _y in xrange(y, y + height):
                pixel = Pixel.create(None, color, _x, _y)
                payload = {
                    "author": '',
                    "x": _x,
                    "y": _y,
                    "color": color,
                }
                batch_payload.append(payload)

        websockets.send_broadcast(
            namespace="/place",
            type="batch-place",
            payload=batch_payload,
        )

    @json_validate(
        VUser(),
    )
    @allow_oauth2_access
    def GET_time_to_wait(self, responder):
        if c.user._date >= ACCOUNT_CREATION_CUTOFF:
            self.abort403()

        if c.user_is_admin:
            wait_seconds = 0
        else:
            wait_seconds = get_wait_seconds(c.user)

        return {
            "wait_seconds": wait_seconds,
        }

    @json_validate(
        x=VInt("x", min=0, max=CANVAS_WIDTH, coerce=False),
        y=VInt("y", min=0, max=CANVAS_HEIGHT, coerce=False),
    )
    @allow_oauth2_access
    def GET_pixel(self, responder, x, y):
        pixel = Pixel.get_pixel_at(x, y)
        if pixel and pixel["user_name"]:
            # pixels blanked out by admins will not have a user_name set
            return pixel


def get_wait_seconds(user):
    last_pixel_dt = Pixel.get_last_placement_datetime(user)
    now = datetime.now(g.tz)

    if last_pixel_dt and last_pixel_dt + PIXEL_COOLDOWN > now:
        next_pixel_dt = last_pixel_dt + PIXEL_COOLDOWN
        wait_seconds = (next_pixel_dt - now).total_seconds()
    else:
        wait_seconds = 0

    return wait_seconds


@controller_hooks.on("hot.get_content")
def add_canvasse(controller):
    if c.site.name == PLACE_SUBREDDIT.name:
        return PlaceCanvasse()


@controller_hooks.on("js_config")
def add_place_config(config):
    if c.site.name == PLACE_SUBREDDIT.name:
        cooldown = 0 if c.user_is_admin else PIXEL_COOLDOWN_SECONDS
        websocket_url = websockets.make_url("/place", max_age=3600)
        config["place_websocket_url"] = websocket_url
        config["place_canvas_width"] = CANVAS_WIDTH
        config["place_canvas_height"] = CANVAS_HEIGHT
        config["place_cooldown"] = cooldown

        activity = c.site.count_activity()
        if activity and activity.logged_in:
            config["place_active_visitors"] = activity.logged_in.count


@controller_hooks.on("extra_stylesheets")
def add_place_stylesheet(extra_stylesheets):
    if c.site.name == PLACE_SUBREDDIT.name:
        extra_stylesheets.append("place.less")


@controller_hooks.on("extra_js_modules")
def add_place_js_module(extra_js_modules):
    if c.site.name == PLACE_SUBREDDIT.name:
        extra_js_modules.append("place-base")
        if c.user_is_admin:
            extra_js_modules.append("place-admin")
        extra_js_modules.append("place-init")
