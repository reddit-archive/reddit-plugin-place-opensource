import datetime

from pylons import app_globals as g
from pylons import request
from pylons import tmpl_context as c

from r2.lib.eventcollector import Event


def place_pixel(x, y, color):
    event = Event(
        topic="place_events",
        event_type="ss.place_pixel",
        time=datetime.datetime.utcnow(),
        request=request,
        context=c,
        data={
            'x_coordinate': x,
            'y_coordinate': y,
            'color': color,
        },
    )
    g.events.save_event(event)
