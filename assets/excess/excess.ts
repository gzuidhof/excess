/// <reference path="event/event.ts" />
/// <reference path="phoenix.d.ts" />
/// <reference path="typings/webrtc/rtcpeerconnection.d.ts" />
module excess {}
var c;
window.onload = () => {
    var id = Math.random().toString(36).substr(2, 2);
    console.log('id: ', id);
    c = new excess.ExcessClient("//localhost:4000/excess", id);
    c.joinRoom('__debug');
};
