/// <reference path="excess.ts" />
module excess {

    export class ExcessPeer {

        public onClose: events.IEvent = new events.TypedEvent();
        public onDataChannelReceive: ChannelReceiveEvent = new events.TypedEvent();

        signaller: Signaller;
        id: string;
        connection: RTCPeerConnection;
        caller: boolean = false;
        channels: { [id: string]: Channel };

        remoteDescriptionSet: boolean = false;
        iceBuffer: RTCIceCandidate[];

        constructor(id: string, signaller: Signaller, rtcConfig: RTCConfiguration) {
            this.signaller = signaller;
            this.id = id;
            this.iceBuffer = [];
            this.channels = {};

            this.connection = new RTCPeerConnection(rtcConfig);
            this.connection.ondatachannel = (event: any) => {
                this.addDataChannel(event.channel);
                this.onDataChannelReceive.trigger(this.channels[event.channel.label]);

            }
            this.connection.onicecandidate = this.onIceCandidate;
            this.connection.onstatechange = this.onStateChange;
            this.connection.oniceconnectionstatechange = this.onIceStateChange;
        }

        //Call someone
        public call() {
            this.createDataChannel('excess');
            this.caller = true;
            this.connection.createOffer(this.onSDPCreate, this.onSDPError);
        }

        public answer(offerSDP: RTCSessionDescriptionInit) {
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
        private onSDPCreate = (sdp: RTCSessionDescription) => {
            this.connection.setLocalDescription(sdp, this.onLocalDescrAdded, () => excess.err("Failed to set local description!"));
            this.signaller.signal(this.id, sdp);
        }

        private onSDPError = (event) => {
            console.error(event);
        }

        createDataChannel(label: string, opts: RTCDataChannelInit = {}): excess.Channel {
            excess.log('Creating data channel ', label, ' opts:', opts);
            var channel = this.connection.createDataChannel(label, opts);
            return this.addDataChannel(channel);
        }

        private addDataChannel(dc: RTCDataChannel): excess.Channel {
            if (typeof dc != 'object') {
                console.error('Data channel is not even an object!');
            }
            excess.log('Added data channel ', dc);
            var channelWrapper = new Channel(dc);
            this.channels[dc.label] = channelWrapper;

            this.channels[dc.label].onClose.add(() => delete this.channels[dc.label]);


            return channelWrapper;
        }

        public addIceCandidate(candidate: RTCIceCandidate) {
            //Can only add ICE candidates after remote description has been set
            //So we buffer 'em in case it's not set yet.
            if (this.remoteDescriptionSet) {
                var can = new RTCIceCandidate(candidate);
                this.connection.addIceCandidate(can)
            }
            else {
                excess.log("Buffering ICE candidate");
                this.iceBuffer.push(candidate);
            }
        }



        public setRemoteDescription(sdpi: RTCSessionDescriptionInit, callback = () => { }) {
            excess.log("Attempting to set remote description.");
            var sdp = new RTCSessionDescription(sdpi);

            this.connection.setRemoteDescription(sdp, 
                () => {
                    //Called after remote description is set
                    excess.log("Set remote description", this.caller ? '(ANSWER).' : '(OFFER).');
                    this.remoteDescriptionSet = true;
                    this.addIceBuffer();
                    callback.apply(this);
                },
                (ev) => console.error('Failed to set remote descr', ev)
            );
            
        }

        private onLocalDescrAdded = () => {
            excess.log('Set local description ', this.caller ? '(OFFER).' : '(ANSWER).')
        }


        //Add every entry of the ICE buffer.
        private addIceBuffer() {
            while (this.iceBuffer.length > 0) {
                var candy = this.iceBuffer.shift();
                this.addIceCandidate(candy);
            }
        }

        private onStateChange = (event) => {
            excess.log('Connection state change ', event);           
        }

        private onIceStateChange = (event) => {
           // excess.log('ICE state changed: connection:', this.connection.iceConnectionState, 'gathering:', this.connection.iceGatheringState);
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


    export interface ChannelReceiveEvent extends events.IEvent {
        add(listener: (channel: Channel) => any): void;
        remove(listener: (channel: Channel) => any): void;
        trigger(channel: Channel): void;
    }

} 