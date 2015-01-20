/// <reference path="excess.ts" />
module excess {

    export class ExcessPeer {

        signaller: Signaller;
        id: string;
        connection: RTCPeerConnection;
        caller: boolean = false;


        remoteDescriptionSet: boolean = false;
        iceBuffer: RTCIceCandidate[];

        public onClose: events.IEvent = new events.TypedEvent();

        constructor(id: string, signaller: Signaller, rtcConfig: RTCConfiguration) {
            this.signaller = signaller;
            this.id = id;
            this.iceBuffer = [];
            this.connection = new RTCPeerConnection(rtcConfig);
            this.connection.ondatachannel = (event: any) => this.addDataChannel(event.channel);
            this.connection.onnegotiationneeded = this.onNegotiationNeeded;
            
            this.connection.onicecandidate = this.onIceCandidate;
            this.connection.onstatechange = this.onStateChange;
            this.connection.oniceconnectionstatechange = this.onIceStateChange;

            
        }

        //Call someone
        call() {
            this.createDataChannel('excess');
            this.caller = true;
            this.connection.createOffer(this.onSDPCreate, this.onSDPError);
        }

        answer(offerSDP: RTCSessionDescriptionInit) {
            if (this.caller) {
                this.caller = false;
            }

            this.setRemoteDescription(offerSDP,
                //Create answer after setting remote description
                () => this.connection.createAnswer(this.onSDPCreate, this.onSDPError)
            );
            
        }

        //Called when offer or answer is done creating
        //If the offer/answer was not created, onOfferError below is called
        onSDPCreate = (sdp: RTCSessionDescription) => {
            this.connection.setLocalDescription(sdp, this.onLocalDescrAdded, () => console.log("Failed to set local description!"));
            this.signaller.signal(this.id, sdp);
        }

        onSDPError = (event) => {
            console.error(event);
        }

        createDataChannel(label: string, opts: RTCDataChannelInit = {}): RTCDataChannel {
            console.log('Creating data channel ', label, ' opts:', opts);
            var channel = this.connection.createDataChannel(label, opts);
            this.addDataChannel(channel);
            return channel;
        }

        private addDataChannel(channel: RTCDataChannel) {
            if (typeof channel != 'object') {
                console.error('Data channel is not even an object!');
            }
            console.log('Added data channel ', channel);
            channel.onopen = (event) => console.log("\nCHANNEL OPEN ", event);
            l = channel;

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



        setRemoteDescription(sdpi: RTCSessionDescriptionInit, callback = () => { }) {
            console.log("Attempting to set remote description.");
            var sdp = new RTCSessionDescription(sdpi);

            this.connection.setRemoteDescription(sdp, 
                () => {
                    //Called after remote description is set
                    console.log("Set remote description", this.caller ? '(ANSWER).' : '(OFFER).');
                    this.remoteDescriptionSet = true;
                    this.addIceBuffer();
                    callback.apply(this);
                },
                (ev) => console.error('Failed to set remote descr', ev)
            );
            
        }

        private onLocalDescrAdded = () => {
            console.log('Set local description ', this.caller ? '(OFFER).' : '(ANSWER).')
        }


        //Add every entry of the ICE buffer.
        private addIceBuffer() {
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
            console.warn('\nCHANNEL CLOSE ', event);
            //this.onClose.trigger();
        }

        private onStateChange = (event) => {
            console.log('Connection state change ', event);           
        }

        private onIceStateChange = (event) => {
            console.log('ICE state changed: connection:', this.connection.iceConnectionState, 'gathering:', this.connection.iceGatheringState);
        }

        private onNegotiationNeeded = (event) => {
            console.warn("Negotation needed!");
            //this.connection.createOffer(this.onSDPCreate, this.onSDPError);
        }

        


        //Called when ICE candidate is received from STUN server.
        private onIceCandidate = (event: any) => {

            if (event.candidate) {
                var candy = {
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    sdpMid: event.candidate.sdpMid,
                    candidate: event.candidate.candidate
                };
                this.signaller.signal(this.id, candy);
            }
        }

    }
} 