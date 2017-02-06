Client-side component reference
===============================

Some notes on how the various front-end components interact with each other.

If you think about the componets as all part of a directed graph, each
component generally fits into one of three categories: **entrance nodes**, 
**internal nodes**, and **exit nodes**.


### Entrance nodes

These components listen to events from browser APIs, extract information from
the event payloads, and call functions of the appropriate internal componets.

API                 | Component        | Points at...
--------------------|------------------|--------------------------------------
Events ($canvas)    | CanvasEvents     | Client, Cursor
Events ($container) | CameraEvents     | Client, Cursor
Websockets          | WebsocketEvents  | World


### Internal nodes

Internal components handle the business logic, manage application state, and call
out to functions on the external nodes when appropriate.

Component           | Points at...
--------------------|---------------------------------------------------------
Client              | Canvasse, Camera, R2Server, AudioManager
World               | Canvasse
Cursor              |


### Exit nodes

These components call out to browser APIs for various reasons, e.g. to
update the DOM or make requests to the backend API.

Component           | API
--------------------|---------------------------------------------------------
AudioManager        | Web Audio
Camera              | DOM ($container and $canvas)
Canvasse            | DOM ($canvas)
R2Server            | XHR (r2)
