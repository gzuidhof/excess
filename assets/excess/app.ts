/// <reference path="phoenix.d.ts" />
module excess {

    export class ExcessClient {

        connections: {[id: string]: ExcessPeer};
        id: string;
        currentRoom: string;


        constructor(id: string) {
            this.id = id;
            this.connections = {};
        }

        connectToServer(room: string) {
            this.currentRoom = room;
        }

        switchRoom(newRoom: string) {

        }




    }

    export class ExcessPeer {
        
    }

    export class Signaller {

        socket: Phoenix.Socket;

        signalChannel: Phoenix.Channel;
        currentRoom: string; //In topic form "room:<room_id>"

        discoveryChannel: Phoenix.Channel;
        discoveryCallbacks: { [id: number]: (peers: string[]) => void };

        id: string;

        constructor(endPoint: string, id: string) {
            this.id = id;
            this.discoveryCallbacks = {};
            this.socket = new Phoenix.Socket(endPoint);
            this.socket.join("discovery", {}, (channel) => this.addDiscoveryChannel(channel));
        }

        join(room: string) {
            var roomtopic = "room:" + room;

            // No point in joining the room if it is already the current room.
            if (roomtopic != this.currentRoom) {

                if (this.currentRoom) { // Leave current room if any
                    this.socket.leave(this.currentRoom, {}); 
                }
                //Join new room
                this.socket.join(("room:"+room), { user_id: this.id }, (channel) => this.addChannel(room, channel));
            }
        }

        private addChannel = (room: string, channel: Phoenix.Channel) => {
            this.signalChannel = channel;
            this.currentRoom = channel.topic;
            

            channel.on("msg:user", (message) => {
                console.log("Received message: ", message);
            });
        }

        private addDiscoveryChannel(channel: Phoenix.Channel) {
            this.discoveryChannel = channel;
            channel.on("get:room", (message) => {
                this.discoveryCallbacks[message.r](message.users);
                delete this.discoveryCallbacks[message.r];
            });
        }

        private discover(room: string, callback: (peers: string[]) => void) {
            var uid = new Date().getTime();
            this.discoveryCallbacks[uid] = callback;
            this.discoveryChannel.send("get:room", {id: room, r: uid });
        }

        /**
        * Send message to peer, via signalling server
        */
        public signal(toId: string, payload: any, roomId: string = this.currentRoom) {
            var from = this.id;
            this.signalChannel.send("msg:user", { to: toId, room: roomId, data: payload });
        }
        

    }



}

var s;
window.onload = () => {
    s = new excess.Signaller("//localhost:4000/excess", "b");
};





