from datetime import datetime
import json
import struct
import time

from pycassa.system_manager import TIME_UUID_TYPE, INT_TYPE
from pycassa.types import CompositeType, IntegerType
from pycassa.util import convert_uuid_to_time
from pylons import app_globals as g
from pylons import tmpl_context as c

from r2.lib.db import tdb_cassandra

CANVAS_ID = "real_1"
CANVAS_WIDTH = 1000
CANVAS_HEIGHT = 1000


class RedisCanvas(object):

    @classmethod
    def get_board(cls):
        # We plan on heavily caching this board bitmap.  We include the
        # timestamp as a 32 bit uint at the beginning so the client can make a
        # determination as to whether the cached state is too old.  If it's too
        # old, the client will hit the non-fastly-cached endpoint directly.
        timestamp = time.time()
        # If no pixels have been placed yet, we'll get back None.  This will
        # cause concatenation to fail below, so we turn it into a string
        # instead.
        bitmap = c.place_redis.get(CANVAS_ID) or ''
        return struct.pack('I', int(timestamp)) + bitmap

    @classmethod
    def set_pixel(cls, color, x, y):
        # The canvas is stored in one long redis bitfield, offset by the
        # coordinates of the pixel.  For instance, for a canvas of width 1000,
        # the offset for position (1, 1) would be 1001.  redis conveniently
        # lets us ignore our integer size when specifying our offset, doing the
        # calculation for us.  For instance, rather than (3, 0) being sent as
        # offset 72 for a 24-bit integer, we can just use the offset 3.
        #
        #     https://redis.io/commands/bitfield
        #
        UINT_SIZE = 'u4'  # Max value: 15
        offset = y * CANVAS_WIDTH + x
        c.place_redis.execute_command(
            'bitfield', CANVAS_ID, 'SET',
            UINT_SIZE, '#%d' % offset, color)


class Pixel(tdb_cassandra.UuidThing):
    _use_db = True
    _connection_pool = 'main'

    _read_consistency_level = tdb_cassandra.CL.QUORUM
    _write_consistency_level = tdb_cassandra.CL.QUORUM

    _int_props = (
        'x',
        'y',
    )

    @classmethod
    def create(cls, user, color, x, y):

        # We dual-write to cassandra to allow the frontend to get information
        # on a particular pixel, as well as to have a backup, persistent state
        # of the board in case something goes wrong with redis.
        pixel = cls(
            canvas_id=CANVAS_ID,
            user_name=user.name if user else '',
            user_fullname=user._fullname if user else '',
            color=color,
            x=x,
            y=y,
        )
        pixel._commit()

        Canvas.insert_pixel(pixel)

        if user:
            PixelsByParticipant.add(user, pixel)

        RedisCanvas.set_pixel(color, x, y)

        g.stats.simple_event('place.pixel.create')

        return pixel

    @classmethod
    def get_last_placement_datetime(cls, user):
        return PixelsByParticipant.get_last_pixel_datetime(user)

    @classmethod
    def get_pixel_at(cls, x, y):
        pixel_dict = Canvas.get(x, y)
        if not pixel_dict:
            return None

        return dict(
            user_name=pixel_dict["user_name"],
            color=pixel_dict["color"],
            x=x,
            y=y,
            timestamp=pixel_dict["timestamp"],
        )


class PixelsByParticipant(tdb_cassandra.View):
    _use_db = True
    _connection_pool = 'main'

    _compare_with = TIME_UUID_TYPE
    _read_consistency_level = tdb_cassandra.CL.QUORUM
    _write_consistency_level = tdb_cassandra.CL.QUORUM

    @classmethod
    def _rowkey(cls, user):
        return CANVAS_ID + "_ " + user._fullname

    @classmethod
    def add(cls, user, pixel):
        rowkey = cls._rowkey(user)
        pixel_dict = {
            "user_fullname": pixel.user_fullname,
            "color": pixel.color,
            "x": pixel.x,
            "y": pixel.y,
        }
        columns = {pixel._id: json.dumps(pixel_dict)}
        cls._cf.insert(rowkey, columns)

    @classmethod
    def get_last_pixel_datetime(cls, user):
        rowkey = cls._rowkey(user)
        try:
            columns = cls._cf.get(rowkey, column_count=1, column_reversed=True)
        except tdb_cassandra.NotFoundException:
            return None

        u = columns.keys()[0]
        ts = convert_uuid_to_time(u)
        return datetime.utcfromtimestamp(ts).replace(tzinfo=g.tz)


class Canvas(tdb_cassandra.View):
    _use_db = True
    _connection_pool = 'main'
    _compare_with = CompositeType(IntegerType(), IntegerType())


    """
    Super naive storage for the canvas, everything's in a single row.

    In the future we may want to break it up so that each C* row contains only
    a subset of all rows. That would spread the data out in the ring and
    would make it easy to grab regions of the canvas.

    """

    @classmethod
    def _rowkey(cls):
        return CANVAS_ID

    @classmethod
    def insert_pixel(cls, pixel):
        columns = {
            (pixel.x, pixel.y): json.dumps({
                "color": pixel.color,
                "timestamp": convert_uuid_to_time(pixel._id),
                "user_name": pixel.user_name,
                "user_fullname": pixel.user_fullname,
            })
        }
        cls._cf.insert(cls._rowkey(), columns)

    @classmethod
    def get(cls, x, y):
        column = (x, y)
        try:
            row = cls._cf.get(cls._rowkey(), columns=[column])
        except tdb_cassandra.NotFoundException:
            return {}

        d = row.get(column, '{}')
        pixel_dict = json.loads(d)
        return pixel_dict

    @classmethod
    def get_all(cls):
        """Return dict of (x,y) -> color"""
        try:
            gen = cls._cf.xget(cls._rowkey())
        except tdb_cassandra.NotFoundException:
            return {}

        return {
            (x, y): json.loads(d) for (x, y), d in gen
        }
