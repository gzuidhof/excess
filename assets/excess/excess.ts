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

        connect(id: string) {
            var peer = new ExcessPeer(id, this.signaller, this.rtcConfig);
            this.connections[id] = peer;
            peer.call();
        }

        receiveSignalMessage = (from: string, data: any) => {
            //Currently connected or signalling
            var known = (this.connections[from]) ? true : false;

            if (data.type == "offer") {
                if (known) {
                    console.error("Already have a connection with fromId!");
                }
                else {
                    var peer = new ExcessPeer(from, this.signaller, this.rtcConfig);
                    this.connections[from] = peer;
                    peer.answer(data);
                }
            }
            else if (data.type == "answer") {
                if (!known) {
                    console.error("Received answer SDP from unknown peer: ", from);
                }
                else {
                    this.connections[from].setRemoteDescription(data);
                }
            }
            else if (data.ice) {
                if (!known) {
                    console.error("Received ICE candidate from unknown peer: ", from);
                }
                else {
                    this.connections[from].addIceCandidate(data.ice);
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

        constructor(id: string, signaller: Signaller, rtcConfig: RTCConfiguration) {
            this.signaller = signaller;
            this.id = id;
            this.connection = new RTCPeerConnection(rtcConfig);
        }

        //Call someone
        call() {
            this.caller = true;
            this.connection.createOffer(this.onOfferCreate, this.onOfferError);
        }

        answer(offerSDP: RTCSessionDescription) {
            this.caller = false;
            this.connection.setRemoteDescription(offerSDP);
            this.connection.createAnswer(this.onOfferCreate, this.onOfferError);
        }


        //If the offer was not created, onOfferError below is called
        onOfferCreate = (sdp: RTCSessionDescription) => {
            this.connection.setLocalDescription(sdp);
            this.signaller.signal(this.id, sdp);
        }

        onOfferError = (event) => {
            console.error(event);
        }

        createDataChannel(label: string, opts: RTCDataChannelInit) {
            var channel = this.connection.createDataChannel(label, opts);
            
        }

        addDataChannel(channel: RTCDataChannel) {
            channel.onmessage = this.onMessage;
            channel.onerror = this.onError;
            channel.onclose = this.onClose;
        }

        addIceCandidate(candidate: RTCIceCandidate) {
            this.connection.addIceCandidate(candidate);
        }

        setRemoteDescription(sdp: RTCSessionDescription) {
            this.connection.setRemoteDescription(sdp, () => { console.log("Set remote description.") });
        }
       

        onMessage = (event: RTCMessageEvent) => {
            console.log(event.data);
        }

        onError = (event) => {
            console.log('channel.onerror', event);
        }

        onClose = (event) => {
            console.log('channel.onclose', event);
        }

        //Called when ICE candidate is received from STUN server.
        onIceCandidate = (event: RTCIceCandidateEvent) => {
            if (event.candidate) {
                this.signaller.signal(this.id, event.candidate);
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
                console.log("Received message: ", message);
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

var c;
window.onload = () => {
    var id = Math.random().toString(36).substr(2, 2);
    console.log('id: ', id);
    c = new excess.ExcessClient("//localhost:4000/excess", id);
    c.joinRoom('debug');
};
