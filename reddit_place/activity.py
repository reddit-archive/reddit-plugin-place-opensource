from r2.lib import amqp, baseplate_integration, websockets

from reddit_place.controllers import get_activity_count, ActivityError


@baseplate_integration.with_root_span("job.place_activity")
def broadcast_activity():
    try:
        activity = get_activity_count()
        websockets.send_broadcast(
            namespace="/place",
            type="activity",
            payload={
                "count": activity,
            },
        )
    except ActivityError:
        print "failed to fetch activity"

    # ensure the message we put on the amqp worker queue is flushed before we
    # exit.
    amqp.worker.join()
