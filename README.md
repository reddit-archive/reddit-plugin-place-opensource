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
