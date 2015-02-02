declare module Phoenix {

    export class Channel {

        topic: string;
        message: string;
        socket: Phoenix.Socket;

        constructor(topic: string, message: string, callback, socket: any);
        reset(): any;

        isMember(topic: string): boolean;

        on(event: string, callback): any;
        off(event: string): any;
        trigger(event: string, msg: any): any[];
        send(event: string, payload: any): any;

        leave(message: any);

    }

    export class Socket {
        constructor(path: string, opts?: SocketOptions);

        protocol: () => string;
        expandEndPoint: (string) => string;
        close(callback?: () => any, code?: any, reason?: any): any;
        reconnect(): any;
        resetBufferTimer(): any;
        log(msg: string): any;

        onOpen(callback: any): any;
        onClose(callback: any): any;
        onError(callback: any): any;
        onMessage(callback: any): any;
        onConnOpen(): any;
        onConnClose(event: any): any;
        onConnError(error: any): any;

        connectionState(): string;
        isConnected(): boolean;
        rejoinAll(): any[];

        rejoin(channel: string): any;
        join(topic: string, message: any, callback: (channel: Phoenix.Channel) => void): any;
        leave(topic: string, message: any): any[];
        send(data: any): any;
        sendHeartBeat(): any;
        flushSendBuffer(): any;
        onConnMessage(rawMessage: string): any[];

        stateChangeCallbacks: StateChangeCallbacks;
    }

    export interface StateChangeCallbacks {
        open: (()=>any) [];
        close: ((event) => any)[];
        error: ((event) => any)[];
        message: ((event) => any)[];
    }

    export interface SocketOptions {
        transport?: WebSocket | LongPoller;
        heartbeatIntervalMs?: number;
        logger?: any;
    }

    export class LongPoller {
        constructor(endPoint: string);
        open(): any;
        normalizeEndpoint(endPoint: string): string;
        poll(): any;
        send(body: any): any;
        close(code: number, reason);
    }

    export interface Ajax {
        request(method, endPoint, accept, body, callback);
    }

}