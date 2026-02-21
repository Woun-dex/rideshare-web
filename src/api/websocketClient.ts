type MessageHandler = (data: any) => void;

interface WebSocketOptions {
    path: string; // e.g., '/ws/location'
    onMessage?: MessageHandler;
    onConnect?: () => void;
    onDisconnect?: () => void;
    maxRetries?: number; // Default: 5
    heartbeatInterval?: number; // Default: 30000ms
}

// In production, this would use ws:// or wss:// from environment variables
const WS_BASE_URL = 'ws://localhost:8090';

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private options: WebSocketOptions;
    private reconnectAttempts = 0;
    private intentionallyClosed = false;
    private pingIntervalId: number | null = null;

    // Normalized event listeners map
    private listeners: Map<string, Set<MessageHandler>> = new Map();

    constructor(options: WebSocketOptions) {
        this.options = {
            maxRetries: 5,
            heartbeatInterval: 30000,
            ...options
        };
    }

    public connect() {
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            return;
        }

        this.intentionallyClosed = false;

        // Example of attaching token via query param
        const token = localStorage.getItem('token');
        const url = new URL(this.options.path, WS_BASE_URL);

        if (token) {
            url.searchParams.append('token', token);
        }

        this.ws = new WebSocket(url.toString());

        this.ws.onopen = () => {
            console.log(`[WS] Connected to ${this.options.path}`);
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            this.options.onConnect?.();
        };

        this.ws.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                // General message handler (optional)
                this.options.onMessage?.(parsed);

                // Normalized event dispatcher. Assumes messages shape matching EventEnvelope
                const type = parsed.eventType || parsed.type || 'message';
                const payload = parsed.payload !== undefined ? parsed.payload : parsed;
                this.emit(type, payload);
            } catch (e) {
                console.error(`[WS] Failed to parse message from ${this.options.path}`, event.data);
            }
        };

        this.ws.onclose = () => {
            this.stopHeartbeat();
            console.log(`[WS] Disconnected from ${this.options.path}`);
            this.options.onDisconnect?.();

            if (!this.intentionallyClosed) {
                this.attemptReconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error(`[WS] Error on ${this.options.path}`, error);
            // The onclose event usually fires after onerror, handling reconnect
        };
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= (this.options.maxRetries || 5)) {
            console.error(`[WS] Max reconnect retries reached for ${this.options.path}`);
            return;
        }

        // Exponential backoff up to 30 seconds
        const timeout = Math.min(1000 * (2 ** this.reconnectAttempts), 30000);
        console.log(`[WS] Reconnecting to ${this.options.path} in ${timeout}ms...`);

        setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, timeout);
    }

    private startHeartbeat() {
        this.pingIntervalId = window.setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'PING' }));
            }
        }, this.options.heartbeatInterval || 30000);
    }

    private stopHeartbeat() {
        if (this.pingIntervalId) {
            window.clearInterval(this.pingIntervalId);
            this.pingIntervalId = null;
        }
    }

    /**
     * Send arbitrary message payload to the server 
     */
    public send(type: string, payload?: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, payload }));
        } else {
            console.warn(`[WS] Cannot send message, socket not open (${this.options.path})`);
        }
    }

    public close() {
        this.intentionallyClosed = true;
        this.stopHeartbeat();
        this.ws?.close();
    }

    // --- Normalized Event System ---

    public on(type: string, callback: MessageHandler) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type)!.add(callback);
    }

    public off(type: string, callback: MessageHandler) {
        this.listeners.get(type)?.delete(callback);
    }

    private emit(type: string, payload: any) {
        this.listeners.get(type)?.forEach((callback) => callback(payload));
    }
}
