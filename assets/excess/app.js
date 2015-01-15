var excess;
(function (excess) {
    var ExcessClient = (function () {
        function ExcessClient(id) {
            this.id = id;
            this.connections = {};
        }
        return ExcessClient;
    })();
    excess.ExcessClient = ExcessClient;
    var ExcessPeer = (function () {
        function ExcessPeer() {
        }
        return ExcessPeer;
    })();
    excess.ExcessPeer = ExcessPeer;
    var SignallingServerConnection = (function () {
        function SignallingServerConnection() {
        }
        return SignallingServerConnection;
    })();
    excess.SignallingServerConnection = SignallingServerConnection;
})(excess || (excess = {}));
window.onload = function () {
};
//# sourceMappingURL=app.js.map