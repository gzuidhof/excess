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
var c;
window.onload = function () {
    var id = Math.random().toString(36).substr(2, 2);
    console.log('id: ', id);
    c = new excess.ExcessClient("//localhost:4000/excess", id);
    c.joinRoom('__debug');
};
/// <reference path="excess.ts" />
var excess;
(function (excess) {
    var ExcessClient = (function () {
        function ExcessClient(signalEndpoint, id, iceServers) {
            var _this = this;
            if (iceServers === void 0) { iceServers = [{ "url": "stun:stun.l.google.com:19302" }]; }
            this.receiveSignalMessage = function (from, data) {
                //Currently connected or signalling
                var known = (_this.connections[from]) ? true : false;
                if (!data) {
                    console.error("Received empty signalling message, error from server?");
                }
                else if (data.type == "offer") {
                    if (known) {
                        console.error("Already have a connection with fromId!");
                    }
                    else {
                        console.log("Received OFFER from", from, data);
                        var peer = _this.createPeer(from);
                        peer.answer(data);
                    }
                }
                else if (data.type == "answer") {
                    if (!known) {
                        console.error("Received answer SDP from unknown peer: ", from);
                    }
                    else {
                        console.log("Received ANSWER from ", from, data);
                        _this.connections[from].setRemoteDescription(data);
                    }
                }
                else if (data.candidate) {
                    if (!known) {
                        console.error("Received ICE candidate from unknown peer: ", from);
                    }
                    else {
                        console.log("Received ICE candidate from", from, data.candidate);
                        _this.connections[from].addIceCandidate(data.candidate);
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
            var peer = new excess.ExcessPeer(id, this.signaller, this.rtcConfig);
            this.connections[id] = peer;
            peer.onClose.add(function () {
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
            this.remoteDescriptionSet = false;
            this.onClose = new events.TypedEvent();
            //Called when offer or answer is done creating
            //If the offer/answer was not created, onOfferError below is called
            this.onSDPCreate = function (sdp) {
                _this.connection.setLocalDescription(sdp, _this.onLocalDescrAdded);
                _this.signaller.signal(_this.id, sdp);
            };
            this.onSDPError = function (event) {
                console.error(event);
            };
            this.onLocalDescrAdded = function () {
                console.log('Set local description ', _this.caller ? '(OFFER).' : '(ANSWER).');
            };
            this.onMessage = function (event) {
                console.log(event.data);
            };
            this.onError = function (event) {
                console.log('channel.onerror', event);
            };
            this._onClose = function (event) {
                _this.onClose.trigger();
            };
            //Called when ICE candidate is received from STUN server.
            this.onIceCandidate = function (event) {
                if (event.candidate) {
                    var candy = {
                        sdpMLineIndex: event.sdpMLineIndex,
                        candidate: event.candidate
                    };
                    _this.signaller.signal(_this.id, candy);
                }
            };
            this.signaller = signaller;
            this.id = id;
            this.iceBuffer = [];
            this.connection = new RTCPeerConnection(rtcConfig, { optional: [{ RtpDataChannels: true }] });
            // this.connection = new RTCPeerConnection(rtcConfig, { optional: [{ RtpDataChannels: true }] });
            this.connection.createDataChannel('excess');
            this.connection.ondatachannel = function (event) { return _this.addDataChannel(event.channel); };
            this.connection.onicecandidate = this.onIceCandidate;
        }
        //Call someone
        ExcessPeer.prototype.call = function () {
            this.caller = true;
            this.connection.createOffer(this.onSDPCreate, this.onSDPError);
        };
        ExcessPeer.prototype.answer = function (offerSDP) {
            var _this = this;
            this.caller = false;
            this.setRemoteDescription(offerSDP, 
            //Create answer after setting remote description
            function () { return _this.connection.createAnswer(_this.onSDPCreate, _this.onSDPError); });
        };
        ExcessPeer.prototype.createDataChannel = function (label, opts) {
            if (opts === void 0) { opts = {}; }
            console.log('Creating data channel ', label, ' opts:', opts);
            var channel = this.connection.createDataChannel(label, opts);
            this.addDataChannel(channel);
            return channel;
        };
        ExcessPeer.prototype.addDataChannel = function (channel) {
            console.log('Added data channel ', channel);
            channel.onopen = function (event) { return console.log("CHANNEL OPEN ", event); };
            channel.onmessage = this.onMessage;
            channel.onerror = this.onError;
            channel.onclose = this._onClose;
        };
        ExcessPeer.prototype.addIceCandidate = function (candidate) {
            //Can only add ICE candidates after remote description has been set
            //So we buffer 'em in case it's not set yet.
            if (this.remoteDescriptionSet) {
                var can = new RTCIceCandidate(candidate);
                this.connection.addIceCandidate(can);
            }
            else {
                console.log("Buffering ICE candidate");
                this.iceBuffer.push(candidate);
            }
        };
        ExcessPeer.prototype.setRemoteDescription = function (sdpi, callback) {
            var _this = this;
            if (callback === void 0) { callback = function () {
            }; }
            console.log("Attempting to set remote description.");
            var sdp = new RTCSessionDescription(sdpi);
            this.connection.setRemoteDescription(sdp, function () {
                //Called after remote description is set
                console.log("Set remote description", _this.caller ? '(ANSWER).' : '(OFFER).');
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
                    // console.log("Received signalling message: ", message);
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
            console.log('Signalling to ', toId, payload);
            this.signalChannel.send("msg:user", { to: toId, data: payload });
        };
        return Signaller;
    })();
    excess.Signaller = Signaller;
})(excess || (excess = {}));
//# sourceMappingURL=excess.js.map