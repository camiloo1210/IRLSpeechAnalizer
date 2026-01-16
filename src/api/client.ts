import { useStore } from '../store/useStore';

const SONIOX_API_URL = 'wss://api.soniox.com/v1/websocket'; // Placeholder URL

export class SonioxClient {
    private socket: WebSocket | null = null;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    connect() {
        // Don't try to connect with invalid keys
        if (!this.apiKey || this.apiKey === 'demo_key') {
            console.warn('[SonioxClient] No valid API key provided. Skipping connection.');
            return;
        }

        if (this.socket) return;

        try {
            this.socket = new WebSocket(`${SONIOX_API_URL}?api_key=${this.apiKey}`);

            this.socket.onopen = () => {
                useStore.getState().setConnected(true);
                console.log('[SonioxClient] Connected to Soniox');
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('[SonioxClient] Message:', data);
                } catch (e) {
                    console.error('[SonioxClient] Failed to parse message:', e);
                }
            };

            this.socket.onerror = (error) => {
                console.error('[SonioxClient] WebSocket error:', error);
                useStore.getState().setConnected(false);
            };

            this.socket.onclose = () => {
                console.log('[SonioxClient] Connection closed');
                useStore.getState().setConnected(false);
                useStore.getState().setStreaming(false);
                this.socket = null;
            };
        } catch (error) {
            console.error('[SonioxClient] Failed to create WebSocket:', error);
        }
    }

    startStream() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ action: 'start_stream' }));
            useStore.getState().setStreaming(true);
        }
    }

    stopStream() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ action: 'stop_stream' }));
            useStore.getState().setStreaming(false);
        }
    }

    sendAudioChunk(chunk: Float32Array) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(chunk);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}
