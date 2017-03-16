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
src/redis-server
```
