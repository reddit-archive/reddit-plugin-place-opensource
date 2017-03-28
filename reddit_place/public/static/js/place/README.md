Client-side component reference
===============================

Some notes on how the various front-end modules interact with each other.

If you think about the modules as all part of a directed graph, each
module generally fits into one of three categories: **entrance nodes**, 
**internal nodes**, and **exit nodes**.


### Entrance nodes

These modules listen to events from browser APIs, extract information from
the event payloads, and call functions of the appropriate internal or exit
components.

Module           | Listens to API       | Requires...
-----------------|----------------------|----------------------------------
canvasevents     | Events ($camera)     | client, cursor
cameraevents     | Events ($container)  | client, cursor
mutebuttonevents | Events ($muteButton) | client
paletteevents    | Events ($palette)    | client
websocketevents  | Websockets           | world
zoombuttonevents | Events ($zoomButton) | client


### Internal nodes

Internal modules handle the business logic, manage application state, and call
out to functions on the external nodes when appropriate.

Module           | Requires...
-----------------|---------------------------------------------------------
client           | api, audio, camera, canvasse, hand, inspector, mutebutton, notification
world            | canvasse
cursor           | hand


### Exit nodes

These modules call out to browser APIs for various reasons, e.g. to
update the DOM or make requests to the backend API.

Module           | Calls to API
-----------------|---------------------------------------------------------
audio            | Web Audio
activity         | DOM ($activityCount)
camera           | DOM ($container and $camera)
canvasse         | DOM ($canvas)
hand             | DOM ($hand)
inspector        | DOM ($inspector)
mollyguard       | DOM ($mollyGuard)
mutebutton       | DOM ($muteButton)
palette          | DOM ($palette)
timer            | DOM ($timer)
zoombutton       | DOM ($zoomButton)
api              | XHR (r2)
notifications    | Notification
