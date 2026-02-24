import { useEffect, useRef, useState } from 'react';
import { WebSocketClient } from '../api/websocketClient';

interface UseWebSocketOptions {
    path: string | null; // e.g., '/ws/location' or null to avoid connecting yet
    queryParams?: Record<string, string>;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onMessage?: (data: any) => void;
}

/**
 * A standard React hook to implement our resilient WebSocket Client setup into a component lifecycle.
 */
export function useWebSocket({ path, queryParams, onConnect, onDisconnect, onMessage }: UseWebSocketOptions) {
    const wsRef = useRef<WebSocketClient | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Only connect if there is a path
        if (!path) return;

        const client = new WebSocketClient({
            path,
            queryParams,
            onConnect: () => {
                setIsConnected(true);
                onConnect?.();
            },
            onDisconnect: () => {
                setIsConnected(false);
                onDisconnect?.();
            },
            onMessage: (data) => {
                onMessage?.(data);
            },
        });

        client.connect();
        wsRef.current = client;

        // Cleanup exactly once on component unmount
        return () => {
            client.close();
            wsRef.current = null;
            setIsConnected(false);
        };
    }, [path]);

    // Expose the raw instance so consumers can use `.send()` or normalize Events via `.on()`
    return {
        ws: wsRef.current,
        isConnected,
        send: (type: string, payload?: any) => wsRef.current?.send(type, payload),
        on: (type: string, cb: (data: any) => void) => wsRef.current?.on(type, cb),
        off: (type: string, cb: (data: any) => void) => wsRef.current?.off(type, cb),
    };
}
