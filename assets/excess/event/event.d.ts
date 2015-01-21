declare module events {
    interface IEvent {
        add(listener: () => void): void;
        remove(listener: () => void): void;
        trigger(...a: any[]): void;
    }
    class TypedEvent implements IEvent {
        private _listeners;
        public add(listener: () => void): void;
        public remove(listener?: () => void): void;
        public trigger(...a: any[]): void;
    }
}
