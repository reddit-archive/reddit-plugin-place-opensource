Client-side component reference
===============================

Some notes on how the various front-end modules interact with each other.

If you think about the modules as all part of a directed graph, each
module generally fits into one of three categories: **entrance nodes**, 
**internal nodes**, and **exit nodes**.


### Entrance nodes

These modules listen to events from browser APIs, extract information from
the event payloads, and call functions of the appropriate internal componets.

Module           | Listens to API      | Requires...
-----------------|---------------------|--------------------------------------
canvasevents     | Events ($canvas)    | client, cursor
cameraevents     | Events ($container) | client, cursor
paletteevents    | Events ($palette)   | client
websocketevents  | Websockets          | world


### Internal nodes

Internal modules handle the business logic, manage application state, and call
out to functions on the external nodes when appropriate.

Module           | Requires...
-----------------|---------------------------------------------------------
client           | canvasse, camera, api, audio
world            | canvasse
cursor           |


### Exit nodes

These modules call out to browser APIs for various reasons, e.g. to
update the DOM or make requests to the backend API.

Module           | Calls to API
-----------------|---------------------------------------------------------
audio            | Web Audio
camera           | DOM ($container and $canvas)
canvasse         | DOM ($canvas)
palette          | DOM ($palette)
api              | XHR (r2)
