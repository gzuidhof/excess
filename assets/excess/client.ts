/// <reference path="excess.ts" />
module excess {

    export class ExcessClient {
        
        /**
        * Triggered when a new connection is made, requested by a peer.
        */
        public onConnection: events.IEvent = new events.TypedEvent();


        connections: { [id: string]: ExcessPeer };
        id: string;
        currentRoom: string;

        signaller: Signaller;
        rtcConfig: RTCConfiguration;

        constructor(signalEndpoint: string, id: string, iceServers: any[] = [{ "url": "stun:stun.l.google.com:19302" }, { "url": "stun:stun2.l.google.com:19302"}]) {
            this.id = id;
            this.connections = {};
            this.rtcConfig = { "iceServers": iceServers };


            this.signaller = new Signaller(signalEndpoint, id);
            //Subscribe to signalling messages from others (someone trying to connect to local peer).
           // this.signaller.onSignal.add(this.receiveSignalMessage)
        }

        connectToServer(): Thenable<{}> {
            return this.signaller.connect();
        }


        connect(id: string): ExcessPeer {
            if (id == this.id) {
                console.error('You can\'t connect to yourself!');
                return null;
            }

            var peer = this.createPeer(id);
            peer.call();

            return peer;
        }

        private createPeer(id: string): ExcessPeer {
            excess.log('Creating peer for ', id);
            var peer = new ExcessPeer(id, this.signaller, this.rtcConfig);
            this.connections[id] = peer;

            peer.onClose.add(() => {
                excess.log('Connection to ', id, 'closed, deleting peer');
                delete this.connections[id];
            });

            return peer;
        }
        
        receiveSignalMessage = (from: string, data: any) => {
            //Currently connected or signalling
            var known = (this.connections[from]) ? true : false;


            if (!data) {
                console.error("Received empty signalling message, error from server?");
            }
            else if (data.type == "offer") {
                if (known) {
                    console.warn("Already have a connection with fromId!");
                }
                excess.log("Received OFFER from", from, data);
                var peer = this.createPeer(from);
                peer.answer(data);
            }
            else if (data.type == "answer") {
                if (!known) {
                    console.error("Received answer SDP from unknown peer: ", from);
                }
                else {
                    excess.log("Received ANSWER from ", from, data);
                    this.connections[from].setRemoteDescription(data);
                }
            }
            else if (data.candidate) {
                if (!known) {
                    console.error("Received ICE candidate from unknown peer: ", from);
                }
                else {
                    excess.debug("Received ICE candidate from", from, data);
                    this.connections[from].addIceCandidate(data);
                }
            }
            else {
                console.warn("Received unexpected signal message ", data, " from ", from);
            }
        }


        joinRoom(room: string) {
            this.currentRoom = room;
            this.signaller.join(room);
        }
    }
}