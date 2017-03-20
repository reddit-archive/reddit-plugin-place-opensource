import time
import struct

from pylons import tmpl_context as c

from r2.lib import baseplate_integration

from reddit_place.models import Canvas
from reddit_place.models import (
    CANVAS_HEIGHT,
    CANVAS_ID,
    CANVAS_WIDTH,
)


def restore_redis_board_from_cass():
    """
    Get all pixels from cassandra and put them back into redis.
    """
    baseplate_integration.make_server_span('shell').start()

    # Get from cass
    st = time.time()
    canvas = Canvas.get_all()
    print "time to get canvas from cass: ", time.time() - st

    # Calculate bitmap
    st = time.time()
    bitmap = ['\x00'] * ((CANVAS_HEIGHT * CANVAS_WIDTH + 1) / 2)
    for (x, y), json_data in canvas.iteritems():

        # These shouldn't be in cassandra but are for some reason.  The
        # frontend only displays up to 999, 999 anyway.
        if x > 999 or y > 999:
            continue

        color = json_data['color']

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
    print "time to get generate canvas for redis: ", time.time() - st

    # Set to redis
    st = time.time()
    c.place_redis.set(CANVAS_ID, ''.join(bitmap))
    print "time to set canvas to redis: ", time.time() - st
