/// <reference path="phoenix.d.ts" />
var excess;
(function (excess) {
    var ExcessClient = (function () {
        function ExcessClient(id) {
            this.id = id;
            this.connections = {};
        }
        ExcessClient.prototype.connectToServer = function (room) {
            this.currentRoom = room;
        };
        ExcessClient.prototype.switchRoom = function (newRoom) {
        };
        return ExcessClient;
    })();
    excess.ExcessClient = ExcessClient;
    var ExcessPeer = (function () {
        function ExcessPeer() {
        }
        return ExcessPeer;
    })();
    excess.ExcessPeer = ExcessPeer;
    var Signaller = (function () {
        function Signaller(endPoint, id) {
            var _this = this;
            this.addChannel = function (room, channel) {
                _this.signalChannel = channel;
                _this.currentRoom = channel.topic;
                channel.on("msg:user", function (message) {
                    console.log("Received message: ", message);
                });
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
            var _this = this;
            this.discoveryChannel = channel;
            channel.on("get:room", function (message) {
                _this.discoveryCallbacks[message.r](message.users);
                delete _this.discoveryCallbacks[message.r];
            });
        };
        Signaller.prototype.discover = function (room, callback) {
            var uid = new Date().getTime();
            this.discoveryCallbacks[uid] = callback;
            this.discoveryChannel.send("get:room", { id: room, r: uid });
        };
        /**
        * Send message to peer, via signalling server
        */
        Signaller.prototype.signal = function (toId, payload, roomId) {
            if (roomId === void 0) { roomId = this.currentRoom; }
            var from = this.id;
            this.signalChannel.send("msg:user", { to: toId, room: roomId, data: payload });
        };
        return Signaller;
    })();
    excess.Signaller = Signaller;
})(excess || (excess = {}));
var s;
window.onload = function () {
    s = new excess.Signaller("//localhost:4000/excess", "b");
};
//# sourceMappingURL=app.js.map