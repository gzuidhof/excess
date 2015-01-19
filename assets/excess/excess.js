var events;
(function (events) {
    var TypedEvent = (function () {
        function TypedEvent() {
            // Private member vars
            this._listeners = [];
        }
        TypedEvent.prototype.add = function (listener) {
            /// <summary>Registers a new listener for the event.</summary>
            /// <param name="listener">The callback function to register.</param>
            this._listeners.push(listener);
        };
        TypedEvent.prototype.remove = function (listener) {
            /// <summary>Unregisters a listener from the event.</summary>
            /// <param name="listener">The callback function that was registered. If missing then all listeners will be removed.</param>
            if (typeof listener === 'function') {
                for (var i = 0, l = this._listeners.length; i < l; l++) {
                    if (this._listeners[i] === listener) {
                        this._listeners.splice(i, 1);
                        break;
                    }
                }
            }
            else {
                this._listeners = [];
            }
        };
        TypedEvent.prototype.trigger = function () {
            var a = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                a[_i - 0] = arguments[_i];
            }
            /// <summary>Invokes all of the listeners for this event.</summary>
            /// <param name="args">Optional set of arguments to pass to listners.</param>
            var context = {};
            var listeners = this._listeners.slice(0);
            for (var i = 0, l = listeners.length; i < l; i++) {
                listeners[i].apply(context, a || []);
            }
        };
        return TypedEvent;
    })();
    events.TypedEvent = TypedEvent;
})(events || (events = {}));
/// <reference path="event/event.ts" />
/// <reference path="phoenix.d.ts" />
/// <reference path="typings/webrtc/rtcpeerconnection.d.ts" />
var excess;
(function (excess) {
    var ExcessClient = (function () {
        function ExcessClient(signalEndpoint, id, iceServers) {
            var _this = this;
            if (iceServers === void 0) { iceServers = [{ "url": "stun:stun.l.google.com:19302" }]; }
            this.receiveSignalMessage = function (from, data) {
                //Currently connected or signalling
                var known = (_this.connections[from]) ? true : false;
                if (data.type == "offer") {
                    if (known) {
                        console.error("Already have a connection with fromId!");
                    }
                    else {
                        var peer = new ExcessPeer(from, _this.signaller, _this.rtcConfig);
                        _this.connections[from] = peer;
                        peer.answer(data);
                    }
                }
                else if (data.type == "answer") {
                    if (!known) {
                        console.error("Received answer SDP from unknown peer: ", from);
                    }
                    else {
                        _this.connections[from].setRemoteDescription(data);
                    }
                }
                else if (data.ice) {
                    if (!known) {
                        console.error("Received ICE candidate from unknown peer: ", from);
                    }
                    else {
                        _this.connections[from].addIceCandidate(data.ice);
                    }
                }
                else {
                    console.warn("Received unexpected signal message ", data, " from ", from);
                }
            };
            this.id = id;
            this.connections = {};
            this.rtcConfig = { "iceServers": iceServers };
            this.signaller = new Signaller(signalEndpoint, id);
            //Subscribe to signalling messages from others (someone trying to connect to local peer).
            this.signaller.onSignal.add(this.receiveSignalMessage);
        }
        ExcessClient.prototype.connect = function (id) {
            var peer = new ExcessPeer(id, this.signaller, this.rtcConfig);
            this.connections[id] = peer;
            peer.call();
        };
        ExcessClient.prototype.joinRoom = function (room) {
            this.currentRoom = room;
            this.signaller.join(room);
        };
        return ExcessClient;
    })();
    excess.ExcessClient = ExcessClient;
    var ExcessPeer = (function () {
        function ExcessPeer(id, signaller, rtcConfig) {
            var _this = this;
            //If the offer was not created, onOfferError below is called
            this.onOfferCreate = function (sdp) {
                _this.connection.setLocalDescription(sdp);
                _this.signaller.signal(_this.id, sdp);
            };
            this.onOfferError = function (event) {
                console.error(event);
            };
            this.onMessage = function (event) {
                console.log(event.data);
            };
            this.onError = function (event) {
                console.log('channel.onerror', event);
            };
            this.onClose = function (event) {
                console.log('channel.onclose', event);
            };
            //Called when ICE candidate is received from STUN server.
            this.onIceCandidate = function (event) {
                if (event.candidate) {
                    _this.signaller.signal(_this.id, event.candidate);
                }
            };
            this.signaller = signaller;
            this.id = id;
            this.connection = new RTCPeerConnection(rtcConfig);
        }
        //Call someone
        ExcessPeer.prototype.call = function () {
            this.caller = true;
            this.connection.createOffer(this.onOfferCreate, this.onOfferError);
        };
        ExcessPeer.prototype.answer = function (offerSDP) {
            this.caller = false;
            this.connection.setRemoteDescription(offerSDP);
            this.connection.createAnswer(this.onOfferCreate, this.onOfferError);
        };
        ExcessPeer.prototype.createDataChannel = function (label, opts) {
            var channel = this.connection.createDataChannel(label, opts);
        };
        ExcessPeer.prototype.addDataChannel = function (channel) {
            channel.onmessage = this.onMessage;
            channel.onerror = this.onError;
            channel.onclose = this.onClose;
        };
        ExcessPeer.prototype.addIceCandidate = function (candidate) {
            this.connection.addIceCandidate(candidate);
        };
        ExcessPeer.prototype.setRemoteDescription = function (sdp) {
            this.connection.setRemoteDescription(sdp, function () {
                console.log("Set remote description.");
            });
        };
        return ExcessPeer;
    })();
    excess.ExcessPeer = ExcessPeer;
    var Signaller = (function () {
        function Signaller(endPoint, id) {
            var _this = this;
            this.onSignal = new events.TypedEvent();
            this.addChannel = function (room, channel) {
                _this.signalChannel = channel;
                _this.currentRoom = channel.topic;
                channel.on("msg:user", function (message) {
                    console.log("Received message: ", message);
                    _this.onSignal.trigger(message.from, message.data);
                });
            };
            /**
            * Receive answer from server (about who is in some room).
            */
            this.receiveDiscovery = function (message) {
                //Tell the original requester
                _this.discoveryCallbacks[message.r](message.users);
                delete _this.discoveryCallbacks[message.r];
            };
            this.id = id;
            this.discoveryCallbacks = {};
            this.socket = new Phoenix.Socket(endPoint);
            this.socket.join("discovery", {}, function (channel) { return _this.addDiscoveryChannel(channel); });
        }
        Signaller.prototype.join = function (room) {
            var _this = this;
            var roomtopic = "room:" + room;
            // No point in joining the room if it is already the current room.
            if (roomtopic != this.currentRoom) {
                if (this.currentRoom) {
                    this.socket.leave(this.currentRoom, {});
                }
                //Join new room
                this.socket.join(("room:" + room), { user_id: this.id }, function (channel) { return _this.addChannel(room, channel); });
            }
        };
        Signaller.prototype.addDiscoveryChannel = function (channel) {
            this.discoveryChannel = channel;
            channel.on("get:room", this.receiveDiscovery);
        };
        Signaller.prototype.discover = function (room, callback) {
            var uid = new Date().getTime();
            this.discoveryCallbacks[uid] = callback;
            this.discoveryChannel.send("get:room", { id: room, r: uid });
        };
        /**
        * Send message to peer, via signalling server
        */
        Signaller.prototype.signal = function (toId, payload) {
            var from = this.id;
            this.signalChannel.send("msg:user", { to: toId, data: payload });
        };
        return Signaller;
    })();
    excess.Signaller = Signaller;
})(excess || (excess = {}));
var c;
window.onload = function () {
    var id = Math.random().toString(36).substr(2, 2);
    console.log('id: ', id);
    c = new excess.ExcessClient("//localhost:4000/excess", id);
    c.joinRoom('debug');
};
//# sourceMappingURL=excess.js.map