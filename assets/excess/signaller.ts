/// <reference path="excess.ts" />
module excess {

    export class Signaller {

        socket: Phoenix.Socket;

        private signalChannel: Phoenix.Channel;
        currentRoom: string; //In topic form "room:<room_id>"

        public onSignal: SignalEvent = new events.TypedEvent();


        private discoveryChannel: Phoenix.Channel;
        private discoveryCallbacks: { [id: number]: (peers: string[]) => void };

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
                this.socket.join(("room:" + room), { user_id: this.id }, (channel) => this.addChannel(room, channel));
            }
        }

        private addChannel = (room: string, channel: Phoenix.Channel) => {
            this.signalChannel = channel;
            this.currentRoom = channel.topic;


            channel.on("msg:user", (message: ExcessSignalMessage) => {
                // excess.log("Received signalling message: ", message);
                this.onSignal.trigger(message.from, message.data);
            });
        }

        private addDiscoveryChannel(channel: Phoenix.Channel) {
            this.discoveryChannel = channel;
            channel.on("get:room", this.receiveDiscovery);
        }

        /**
        * Receive answer from server (about who is in some room).
        */
        private receiveDiscovery = (message) => {
            //Tell the original requester
            this.discoveryCallbacks[message.r](message.users);
            delete this.discoveryCallbacks[message.r];
        }


        private discover(room: string, callback: (peers: string[]) => void) {
            var uid = new Date().getTime();
            this.discoveryCallbacks[uid] = callback;
            this.discoveryChannel.send("get:room", { id: room, r: uid });
        }

        /**
        * Send message to peer, via signalling server
        */
        public signal(toId: string, payload: any) {
            var from = this.id;
            excess.debug('Signalling to ', toId, payload);

            this.signalChannel.send("msg:user", { to: toId, data: payload });
        }


    }


    interface ExcessSignalMessage {
        from: string;
        data: any;
    }

    interface SignalEvent extends events.IEvent {
        add(listener: (from: string, data: any) => any): void;
        remove(listener: (from: string, data: any) => any): void;
        trigger(from: string, data: any): void;
    }
}
