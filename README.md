# place

April Fools 2017

## Installation

Install the plugin itself.

```bash
cd ~/src/place
python setup.py build
sudo python setup.py develop
```

Then add the plugin to your ini file:

```diff
############################################ PLUGINS
# which plugins are enabled (they must be installed via setup.py first)
-plugins = about, liveupdate
+plugins = about, liveupdate, place
```

Update your ``development.update`` file:

```diff
+place_redis_url = redis://localhost:6380/
```

Finally, you'll need redis running.  You can run it in the background or in a
screen session, or set up some fancy upstart stuff if you're crazy.

```bash
wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make
```

Then run:

```bash
src/redis-server --port 6380
```

## Restoring the Board

In case redis needs to be restarted or gets cleared for whatever reason, you
can re-load the board from Cassandra:

```python
from reddit_place.lib import restore_redis_board_from_cass
restore_redis_board_from_cass()
```
