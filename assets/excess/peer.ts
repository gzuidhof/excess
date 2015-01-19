/// <reference path="excess.ts" />
module excess {

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
            console.log('Creating data channel ', label, ' opts:', opts);
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
} 