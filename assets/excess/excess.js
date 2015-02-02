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
    excess.log = console.log;
    excess.debug = console.debug;
    excess.err = console.error;
})(excess || (excess = {}));
/// <reference path="excess.ts" />
var excess;
(function (excess) {
    /**
    * Wraps a WebRTC DataChannel
    */
    var Channel = (function () {
        function Channel(rtcDataChannel) {
            var _this = this;
            this.onMessage = new events.TypedEvent();
            this.onClose = new events.TypedEvent();
            this.onError = new events.TypedEvent();
            this.onOpen = new events.TypedEvent();
            /* Callbacks */
            this._onMessage = function (event) {
                excess.log("\nCHANNEL MESSAGE: ", event.data);
                _this.onMessage.trigger(event.data);
            };
            this._onError = function (event) {
                excess.log("\nCHANNEL ERROR: ", event);
                _this.onError.trigger(event);
            };
            this._onClose = function (event) {
                excess.log("\nCHANNEL CLOSE: ", event);
                _this.onClose.trigger(event);
            };
            this._onOpen = function (event) {
                excess.log("\nCHANNEL OPEN: ", event);
                _this.onOpen.trigger(event);
            };
            this.dataChannel = rtcDataChannel;
            this.attachCallbacks();
        }
        Channel.prototype.attachCallbacks = function () {
            this.dataChannel.onmessage = this._onMessage;
            this.dataChannel.onerror = this._onError;
            this.dataChannel.onclose = this._onClose;
            this.dataChannel.onopen = this._onOpen;
        };
        Channel.prototype.send = function (message) {
            this.dataChannel.send(message);
        };
        return Channel;
    })();
    excess.Channel = Channel;
})(excess || (excess = {}));
/// <reference path="excess.ts" />
var excess;
(function (excess) {
    var ExcessClient = (function () {
        function ExcessClient(signalEndpoint, id, iceServers) {
            var _this = this;
            if (iceServers === void 0) { iceServers = [{ "url": "stun:stun.l.google.com:19302" }, { "url": "stun:stun2.l.google.com:19302" }]; }
            /**
            * Triggered when a new connection is made, requested by a peer.
            */
            this.onConnection = new events.TypedEvent();
            this.receiveSignalMessage = function (from, data) {
                //Currently connected or signalling
                var known = (_this.connections[from]) ? true : false;
                if (!data) {
                    console.error("Received empty signalling message, error from server?");
                }
                else if (data.type == "offer") {
                    if (known) {
                        console.warn("Already have a connection with fromId!");
                    }
                    excess.log("Received OFFER from", from, data);
                    var peer = _this.createPeer(from);
                    peer.answer(data);
                }
                else if (data.type == "answer") {
                    if (!known) {
                        console.error("Received answer SDP from unknown peer: ", from);
                    }
                    else {
                        excess.log("Received ANSWER from ", from, data);
                        _this.connections[from].setRemoteDescription(data);
                    }
                }
                else if (data.candidate) {
                    if (!known) {
                        console.error("Received ICE candidate from unknown peer: ", from);
                    }
                    else {
                        excess.debug("Received ICE candidate from", from, data);
                        _this.connections[from].addIceCandidate(data);
                    }
                }
                else {
                    console.warn("Received unexpected signal message ", data, " from ", from);
                }
            };
            this.id = id;
            this.connections = {};
            this.rtcConfig = { "iceServers": iceServers };
            this.signaller = new excess.Signaller(signalEndpoint, id);
            //Subscribe to signalling messages from others (someone trying to connect to local peer).
            this.signaller.onSignal.add(this.receiveSignalMessage);
        }
        ExcessClient.prototype.connect = function (id) {
            if (id == this.id) {
                console.error('You can\'t connect to yourself!');
                return null;
            }
            var peer = this.createPeer(id);
            peer.call();
            return peer;
        };
        ExcessClient.prototype.createPeer = function (id) {
            var _this = this;
            excess.log('Creating peer for ', id);
            var peer = new excess.ExcessPeer(id, this.signaller, this.rtcConfig);
            this.connections[id] = peer;
            peer.onClose.add(function () {
                excess.log('Connection to ', id, 'closed, deleting peer');
                delete _this.connections[id];
            });
            return peer;
        };
        ExcessClient.prototype.joinRoom = function (room) {
            this.currentRoom = room;
            this.signaller.join(room);
        };
        return ExcessClient;
    })();
    excess.ExcessClient = ExcessClient;
})(excess || (excess = {}));
/// <reference path="excess.ts" />
var excess;
(function (excess) {
    var ExcessPeer = (function () {
        function ExcessPeer(id, signaller, rtcConfig) {
            var _this = this;
            this.onClose = new events.TypedEvent();
            this.onDataChannelReceive = new events.TypedEvent();
            this.caller = false;
            this.remoteDescriptionSet = false;
            //Called when offer or answer is done creating
            //If the offer/answer was not created, onOfferError below is called
            this.onSDPCreate = function (sdp) {
                _this.connection.setLocalDescription(sdp, _this.onLocalDescrAdded, function () { return excess.err("Failed to set local description!"); });
                _this.signaller.signal(_this.id, sdp);
            };
            this.onSDPError = function (event) {
                console.error(event);
            };
            this.onLocalDescrAdded = function () {
                excess.log('Set local description ', _this.caller ? '(OFFER).' : '(ANSWER).');
            };
            this.onStateChange = function (event) {
                excess.log('Connection state change ', event);
            };
            this.onIceStateChange = function (event) {
                excess.log('ICE state changed: connection:', _this.connection.iceConnectionState, 'gathering:', _this.connection.iceGatheringState);
            };
            //Called when ICE candidate is received from STUN server.
            this.onIceCandidate = function (event) {
                if (event.candidate) {
                    var candy = {
                        sdpMLineIndex: event.candidate.sdpMLineIndex,
                        sdpMid: event.candidate.sdpMid,
                        candidate: event.candidate.candidate
                    };
                    _this.signaller.signal(_this.id, candy);
                }
            };
            this.signaller = signaller;
            this.id = id;
            this.iceBuffer = [];
            this.channels = {};
            this.connection = new RTCPeerConnection(rtcConfig);
            this.connection.ondatachannel = function (event) {
                _this.addDataChannel(event.channel);
                _this.onDataChannelReceive.trigger(_this.channels[event.channel.label]);
            };
            this.connection.onnegotiationneeded = function (e) { return console.warn("Negotation needed!"); };
            this.connection.onicecandidate = this.onIceCandidate;
            this.connection.onstatechange = this.onStateChange;
            this.connection.oniceconnectionstatechange = this.onIceStateChange;
        }
        //Call someone
        ExcessPeer.prototype.call = function () {
            this.createDataChannel('excess');
            this.caller = true;
            this.connection.createOffer(this.onSDPCreate, this.onSDPError);
        };
        ExcessPeer.prototype.answer = function (offerSDP) {
            var _this = this;
            if (this.caller) {
                this.caller = false;
            }
            this.setRemoteDescription(offerSDP, 
            //Create answer after setting remote description
            function () { return _this.connection.createAnswer(_this.onSDPCreate, _this.onSDPError); });
        };
        ExcessPeer.prototype.createDataChannel = function (label, opts) {
            if (opts === void 0) { opts = {}; }
            excess.log('Creating data channel ', label, ' opts:', opts);
            var channel = this.connection.createDataChannel(label, opts);
            return this.addDataChannel(channel);
        };
        ExcessPeer.prototype.addDataChannel = function (dc) {
            var _this = this;
            if (typeof dc != 'object') {
                console.error('Data channel is not even an object!');
            }
            excess.log('Added data channel ', dc);
            var channelWrapper = new excess.Channel(dc);
            this.channels[dc.label] = channelWrapper;
            this.channels[dc.label].onClose.add(function () { return delete _this.channels[dc.label]; });
            return channelWrapper;
        };
        ExcessPeer.prototype.addIceCandidate = function (candidate) {
            //Can only add ICE candidates after remote description has been set
            //So we buffer 'em in case it's not set yet.
            if (this.remoteDescriptionSet) {
                var can = new RTCIceCandidate(candidate);
                this.connection.addIceCandidate(can);
            }
            else {
                excess.log("Buffering ICE candidate");
                this.iceBuffer.push(candidate);
            }
        };
        ExcessPeer.prototype.setRemoteDescription = function (sdpi, callback) {
            var _this = this;
            if (callback === void 0) { callback = function () {
            }; }
            excess.log("Attempting to set remote description.");
            var sdp = new RTCSessionDescription(sdpi);
            this.connection.setRemoteDescription(sdp, function () {
                //Called after remote description is set
                excess.log("Set remote description", _this.caller ? '(ANSWER).' : '(OFFER).');
                _this.remoteDescriptionSet = true;
                _this.addIceBuffer();
                callback.apply(_this);
            }, function (ev) { return console.error('Failed to set remote descr', ev); });
        };
        //Add every entry of the ICE buffer.
        ExcessPeer.prototype.addIceBuffer = function () {
            while (this.iceBuffer.length > 0) {
                var candy = this.iceBuffer.shift();
                this.addIceCandidate(candy);
            }
        };
        return ExcessPeer;
    })();
    excess.ExcessPeer = ExcessPeer;
})(excess || (excess = {}));
/// <reference path="excess.ts" />
var excess;
(function (excess) {
    var Signaller = (function () {
        function Signaller(endPoint, id) {
            var _this = this;
            this.onSignal = new events.TypedEvent();
            this.addChannel = function (room, channel) {
                _this.signalChannel = channel;
                _this.currentRoom = channel.topic;
                channel.on("msg:user", function (message) {
                    // excess.log("Received signalling message: ", message);
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
            excess.debug('Signalling to ', toId, payload);
            this.signalChannel.send("msg:user", { to: toId, data: payload });
        };
        return Signaller;
    })();
    excess.Signaller = Signaller;
})(excess || (excess = {}));
//# sourceMappingURL=excess.js.map