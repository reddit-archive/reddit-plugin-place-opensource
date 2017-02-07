from datetime import datetime
import json

from pycassa.system_manager import TIME_UUID_TYPE
from pycassa.util import convert_uuid_to_time
from pylons import app_globals as g

from r2.lib.db import tdb_cassandra


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
            user_fullname=user._fullname,
            color=color,
            x=x,
            y=y,
        )
        pixel._commit()

        PixelsByParticipant.add(user, pixel)

        g.stats.simple_event('place.pixel.create')

        return pixel

    @classmethod
    def get_last_placement_datetime(cls, user):
        return PixelsByParticipant.get_last_pixel_datetime(user)


class PixelsByParticipant(tdb_cassandra.View):
    _use_db = True
    _connection_pool = 'main'

    _compare_with = TIME_UUID_TYPE
    _read_consistency_level = tdb_cassandra.CL.QUORUM
    _write_consistency_level = tdb_cassandra.CL.QUORUM

    @classmethod
    def _rowkey(cls, user):
        return user._fullname

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

