type Listener = (...args: any[]) => void;
export declare class EventEmitter {
    private _listeners;
    on(event: string, fn: Listener): this;
    off(event: string, fn: Listener): this;
    protected emit(event: string, ...args: any[]): void;
}
export {};
