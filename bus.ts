export class Bus {
    subscriptions: Record<string, ((...args: unknown[]) => void)[]> = {};

    on = (event: string, callback: (...args: unknown[]) => void) => {
        if (!this.subscriptions[event]) this.subscriptions[event] = [];
        this.subscriptions[event].push(callback);
    };

    emit = (event: string, ...args: unknown[]) => {
        if (!this.subscriptions[event]) return;
        console.dir(`emitted [${event}]`, args ? `with: ${args}` : "");
        const callbacks = this.subscriptions[event];
        if (!callbacks || callbacks.length === 0) {
            console.error(`unhandled event: ${event}`);
            return;
        }
        callbacks.forEach((callback) => callback(...args));
    };
}
