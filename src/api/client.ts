import { useStore } from '../store/useStore';

const SONIOX_API_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';

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

                // Send initial configuration
                this.socket?.send(JSON.stringify({
                    api_key: this.apiKey,
                    model: 'stt-rt-v3',
                    audio_format: 'pcm_s16le',
                    sample_rate: 16000,
                    num_channels: 1,
                    include_non_final: true,
                    language_hints: ['es'],
                    language_hints_strict: true
                }));
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('[SonioxClient] Received message:', data);

                    // Handle errors from Soniox
                    if (data.error_code || data.error_message) {
                        console.error('[SonioxClient] Server error:', data.error_code, data.error_message);
                        return;
                    }

                    // Handle transcripts - Soniox v3 uses 'tokens' array
                    if (data.tokens && data.tokens.length > 0) {
                        // Each token has 'text' property
                        const text = data.tokens.map((t: any) => t.text).join('');
                        if (text) {
                            const store = useStore.getState();
                            const lastNode = store.transcript[store.transcript.length - 1];
                            const isFinal = data.final_audio_proc_ms > 0;

                            // If we have a pending partial chunk, update it
                            if (lastNode && !lastNode.isFinal) {
                                store.updateLastChunk(text, isFinal);
                            } else {
                                // Start a new chunk
                                store.addTranscriptChunk({
                                    id: Math.random().toString(),
                                    text: text,
                                    isFinal: isFinal,
                                    timestamp: Date.now()
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error('[SonioxClient] Failed to parse message:', e);
                }
            };

            this.socket.onerror = (error) => {
                console.error('[SonioxClient] WebSocket error:', error);
                useStore.getState().setConnected(false);
            };

            this.socket.onclose = (event) => {
                console.log(`[SonioxClient] Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
                useStore.getState().setConnected(false);
                useStore.getState().setStreaming(false);
                this.socket = null;
            };
        } catch (error) {
            console.error('[SonioxClient] Failed to create WebSocket:', error);
        }
    }

    startStream() {
        // No explicit start_stream action needed for Soniox once connected and config sent
        // Just start sending audio
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            useStore.getState().setStreaming(true);
        }
    }

    stopStream() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            // For transcribe-websocket, we don't need to send a stop action
            // The connection will be closed when we terminate
            useStore.getState().setStreaming(false);
        }
    }

    sendAudioChunk(chunk: Int16Array) {
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
