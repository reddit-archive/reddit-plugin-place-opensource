from datetime import datetime
import json

from pycassa.system_manager import TIME_UUID_TYPE, INT_TYPE
from pycassa.types import CompositeType, IntegerType
from pycassa.util import convert_uuid_to_time
from pylons import app_globals as g

from r2.lib.db import tdb_cassandra

CANVAS_ID = "test_1"
CANVAS_WIDTH = 1000
CANVAS_HEIGHT = 1000


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
        pixel = cls(
            canvas_id=CANVAS_ID,
            user_name=user.name,
            user_fullname=user._fullname,
            color=color,
            x=x,
            y=y,
        )
        pixel._commit()

        Canvas.insert_pixel(pixel)
        MinimalCanvas.insert_pixel(pixel)
        PixelsByParticipant.add(user, pixel)

        g.stats.simple_event('place.pixel.create')

        return pixel

    @classmethod
    def get_last_placement_datetime(cls, user):
        return PixelsByParticipant.get_last_pixel_datetime(user)

    @classmethod
    def get_canvas(cls):
        return MinimalCanvas.get_all()

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


class MinimalCanvas(tdb_cassandra.View):
    _use_db = True
    _connection_pool = 'main'
    _compare_with = CompositeType(IntegerType(), IntegerType())
    _extra_schema_creation_args = dict(default_validation_class=INT_TYPE)

    @classmethod
    def _rowkey(cls):
        return CANVAS_ID

    @classmethod
    def insert_pixel(cls, pixel):
        column = {(pixel.x, pixel.y): pixel.color}
        cls._cf.insert(cls._rowkey(), column)

    @classmethod
    def get_all(cls):
        """Return dict of (x,y) -> color"""
        try:
            gen = cls._cf.xget(cls._rowkey())
        except tdb_cassandra.NotFoundException:
            return {}

        return {
            (x, y): v for (x, y), v in gen
        }
