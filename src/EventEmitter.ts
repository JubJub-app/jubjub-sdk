type Listener = (...args: any[]) => void;

export class EventEmitter {
  private _listeners: Map<string, Set<Listener>> = new Map();

  on(event: string, fn: Listener): this {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(fn);
    return this;
  }

  off(event: string, fn: Listener): this {
    this._listeners.get(event)?.delete(fn);
    return this;
  }

  protected emit(event: string, ...args: any[]): void {
    this._listeners.get(event)?.forEach((fn) => {
      try {
        fn(...args);
      } catch {
        // Listener errors must never break the SDK.
      }
    });
  }
}
