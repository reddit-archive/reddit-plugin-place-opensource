from r2.lib import amqp, baseplate_integration, websockets

from reddit_place.controllers import PLACE_SUBREDDIT


@baseplate_integration.with_root_span("job.place_activity")
def broadcast_activity():
    activity = PLACE_SUBREDDIT.count_activity()
    if activity and activity.logged_in:
        websockets.send_broadcast(
            namespace="/place",
            type="activity",
            payload={
                "count": activity.logged_in.count,
            },
        )

    # ensure the message we put on the amqp worker queue is flushed before we
    # exit.
    amqp.worker.join()
