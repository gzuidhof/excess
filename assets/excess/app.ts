module excess {

    export class ExcessClient {

        connections: {[id: string]: ExcessPeer};
        id: string;


        constructor(id: string) {
            this.id = id;
            this.connections = {};
        }




    }

    export class ExcessPeer {
        
    }

    export class SignallingServerConnection {

    }
}


window.onload = () => {
    
};





