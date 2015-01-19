/// <reference path="event/event.ts" />
/// <reference path="phoenix.d.ts" />
/// <reference path="typings/webrtc/rtcpeerconnection.d.ts" />
module excess {

    export class ExcessClient {

        connections: {[id: string]: ExcessPeer};
        id: string;
        currentRoom: string;

        signaller: Signaller;

        rtcConfig: RTCConfiguration;

        constructor(signalEndpoint: string, id: string, iceServers: any[] = [{ "url": "stun:stun.l.google.com:19302" }]) {
            this.id = id;
            this.connections = {};
            this.rtcConfig = { "iceServers": iceServers };


            this.signaller = new Signaller(signalEndpoint, id);
            //Subscribe to signalling messages from others (someone trying to connect to local peer).
            this.signaller.onSignal.add(this.receiveSignalMessage)
        }

        connect(id: string): ExcessPeer {
            var peer = this.createPeer(id);
            peer.call();

            return peer;
        }

        createPeer(id: string): ExcessPeer {
            var peer = new ExcessPeer(id, this.signaller, this.rtcConfig);
            this.connections[id] = peer;

            peer.onClose.add(() => {
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
                    console.error("Already have a connection with fromId!");
                }
                else {
                    console.log("Received OFFER from", from, data);
                    var peer = this.createPeer(from);
                    peer.answer(data);
                }
            }
            else if (data.type == "answer") {
                if (!known) {
                    console.error("Received answer SDP from unknown peer: ", from);
                }
                else {
                    console.log("Received ANSWER from ", from, data);
                    this.connections[from].setRemoteDescription(data);
                }
            }
            else if (data.candidate) {
                if (!known) {
                    console.error("Received ICE candidate from unknown peer: ", from);
                }
                else {
                    console.log("Received ICE candidate from", from, data.candidate);
                    this.connections[from].addIceCandidate(data.candidate);
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

    export class ExcessPeer {

        signaller: Signaller;
        id: string;
        connection: RTCPeerConnection;
        caller: boolean;


        remoteDescriptionSet: boolean = false;
        iceBuffer: RTCIceCandidate[];

        public onClose: events.IEvent = new events.TypedEvent();

        constructor(id: string, signaller: Signaller, rtcConfig: RTCConfiguration) {
            this.signaller = signaller;
            this.id = id;
            this.iceBuffer = [];
            this.connection = new RTCPeerConnection(rtcConfig);
            this.connection.ondatachannel = (event: any) => this.addDataChannel(event.channel);
            this.connection.onicecandidate = this.onIceCandidate;
        }

        //Call someone
        call() {
            this.caller = true;
            chan = this.createDataChannel('awroo');
            this.connection.createOffer(this.onOfferCreate, this.onOfferError);
        }

        answer(offerSDP: RTCSessionDescriptionInit) {
            this.caller = false;

            var sdp = new RTCSessionDescription(offerSDP);
            this.connection.setRemoteDescription(sdp, this.onRemoteDescrAdded);
            this.connection.createAnswer(this.onOfferCreate, this.onOfferError);
        }


        //If the offer was not created, onOfferError below is called
        onOfferCreate = (sdp: RTCSessionDescription) => {
            this.connection.setLocalDescription(sdp, this.onLocalDescrAdded);
            this.signaller.signal(this.id, sdp);
        }

        onOfferError = (event) => {
            console.error(event);
        }

        createDataChannel(label: string, opts: RTCDataChannelInit = {}): RTCDataChannel {
            console.log('Creating data channel ',label, ' opts:',  opts);
            var channel = this.connection.createDataChannel(label, opts);
            this.addDataChannel(channel);
            return channel;
        }

        addDataChannel(channel: RTCDataChannel) {
            console.log('Added data channel ', channel);
            channel.onmessage = this.onMessage;
            channel.onerror = this.onError;
            channel.onclose = this._onClose;
        }

        addIceCandidate(candidate: RTCIceCandidate) {
            //Can only add ICE candidates after remote description has been set
            //So we buffer 'em in case it's not set yet.
            if (this.remoteDescriptionSet) {
                var can = new RTCIceCandidate(candidate);
                this.connection.addIceCandidate(can)
            }
            else {
                console.log("Buffering ICE candidate");
                this.iceBuffer.push(candidate);
            }
        }

        setRemoteDescription(sdpi: RTCSessionDescriptionInit) {
            var sdp = new RTCSessionDescription(sdpi);
            this.connection.setRemoteDescription(sdp, this.onRemoteDescrAdded);
        }

        private onRemoteDescrAdded = () => {
            console.log("Set remote description.");
            this.remoteDescriptionSet = true;
            this.addIceBuffer();
        }

        private onLocalDescrAdded = () => {
            console.log('Set local description ', this.caller ? '(OFFER).' : '(ANSWER).')
        }



        addIceBuffer() {
            while (this.iceBuffer.length > 0) {
                var candy = this.iceBuffer.shift();
                this.addIceCandidate(candy);
            }
        }


        private onMessage = (event: RTCMessageEvent) => {
            console.log(event.data);
        }

        private onError = (event) => {
            console.log('channel.onerror', event);
        }

        private _onClose = (event) => {
            this.onClose.trigger();
        }

        //Called when ICE candidate is received from STUN server.
        onIceCandidate = (event: any) => {
           
            if (event.candidate) {
                var candy = {
                    sdpMLineIndex: event.sdpMLineIndex,
                    candidate: event.candidate
                };
                this.signaller.signal(this.id, candy);
            }
        }

    }

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
                this.socket.join(("room:"+room), { user_id: this.id }, (channel) => this.addChannel(room, channel));
            }
        }

        private addChannel = (room: string, channel: Phoenix.Channel) => {
            this.signalChannel = channel;
            this.currentRoom = channel.topic;
            

            channel.on("msg:user", (message: ExcessSignalMessage) => {
               // console.log("Received signalling message: ", message);
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
            this.discoveryChannel.send("get:room", {id: room, r: uid });
        }

        /**
        * Send message to peer, via signalling server
        */
        public signal(toId: string, payload: any) {
            var from = this.id;
            console.log('Signalling to ', toId, payload);

            this.signalChannel.send("msg:user", { to: toId, data: payload });
        }
        

    }


    interface ExcessSignalMessage {
        from: string;
        data: any;
    }

    interface SignalEvent extends events.IEvent{
        add(listener: (from: string, data: any) => any): void;
        remove(listener: (from: string, data: any) => any): void;
        trigger(from: string, data: any): void;
    }
}
var chan;
var c;
window.onload = () => {
    var id = Math.random().toString(36).substr(2, 2);
    console.log('id: ', id);
    c = new excess.ExcessClient("//localhost:4000/excess", id);
    c.joinRoom('debug');
};
