/// <reference path="excess.ts" />
module excess {

    export class Signaller {

        socket: Phoenix.Socket;  

        private signalChannel: Phoenix.Channel;
        currentRoom: string; //In topic form "room:<room_id>"
        private endPoint: string;

        public onSignal: SignalEvent = new events.TypedEvent();

        private discoveryChannel: Phoenix.Channel;
        private discoveryCallbacks: { [id: number]: (peers: string[]) => void };

        id: string;

        constructor(endPoint: string, id: string) {
            this.id = id;
            this.discoveryCallbacks = {};
            this.endPoint = endPoint;
        }

        connect(): Promise<{}> {
            this.socket = new Phoenix.Socket(this.endPoint);

            var fulfilled: boolean = false;

            return new Promise((fulfill, reject) => {

                this.socket.onOpen(() => {
                    fulfilled = true;

                    this.socket.join("discovery", {},(channel) =>
                    {
                        this.addDiscoveryChannel(channel)
                        fulfill();
                    });
                    
                });

                this.socket.onError(() => {
                    if (!fulfilled) { // No method for removing onError callback yet, hack so that we don't
                                      // disable reconnecting upon later failure of connection.

                        //Stop it from attempting to reconnect at this stage.
                        this.socket.reconnect = () => { };
                        this.socket = null;
                        reject(Error('Failed to connect to signalling server!'));
                    }
                });
            });


        }


        join(room: string) {
            if (this.socket == null) {
                excess.err("Connect the signalling server first!");
            }

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


        public discover(room: string, callback: (peers: string[]) => void) {
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

    export interface SignalEvent extends events.IEvent {
        add(listener: (from: string, data: any) => any): void;
        remove(listener: (from: string, data: any) => any): void;
        trigger(from: string, data: any): void;
    }
}
