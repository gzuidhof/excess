# Excess

A WebRTC signalling server, with room functionality.

Clients join a specific room, by specifying a topic in the form of `room:<room_name>`, for instance `room:lobby`. All connected clients are assigned a unique id.

A client can then send messages to a client by id, for webRTC signalling (or any other purpose really).
Communication between server and client happens over websocket.

--

This is however, still a work in progress and a learning experience.
