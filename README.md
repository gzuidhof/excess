# Excess

A WebRTC signalling server, with room functionality.

Clients join a specific room, by specifying a topic in the form of `room:<room_name>`, for instance `room:lobby`. All connected clients are assigned a unique id.

A client can then send messages to a client by id, for webRTC signalling (or any other purpose really).
Communication between server and client happens over websocket.

--
Basic signalling has been implemented, it is however still a work in progress. 

If you plan on adapting this, it was created using the old Channel API of the Phoenix framework (pre 1.0) and will need some updating.
