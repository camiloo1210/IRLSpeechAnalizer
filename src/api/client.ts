import { useStore } from '../store/useStore';
import type { TranscriptionLanguage, SonioxMode } from '../store/settingsStore';

const SONIOX_API_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';

export interface SonioxClientOptions {
    apiKey: string;
    language: TranscriptionLanguage;
    mode: SonioxMode;
    targetLanguage?: TranscriptionLanguage;
}

export class SonioxClient {
    private socket: WebSocket | null = null;
    private apiKey: string;
    private language: TranscriptionLanguage;
    private mode: SonioxMode;
    private targetLanguage: TranscriptionLanguage;

    constructor(options: SonioxClientOptions) {
        this.apiKey = options.apiKey;
        this.language = options.language;
        this.mode = options.mode;
        this.targetLanguage = options.targetLanguage || 'en';
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
                console.log('[SonioxClient] Connected to Soniox with mode:', this.mode, 'language:', this.language);

                // Build configuration based on mode and language settings
                const config: Record<string, unknown> = {
                    api_key: this.apiKey,
                    model: 'stt-rt-v3',
                    audio_format: 'pcm_s16le',
                    sample_rate: 16000,
                    num_channels: 1,
                    include_non_final: true,
                };

                // Language hints
                if (this.language !== 'auto') {
                    config.language_hints = [this.language];
                    config.language_hints_strict = true;
                } else {
                    config.enable_language_identification = true;
                }

                // Mode-specific configuration
                if (this.mode === 'translation') {
                    // Enable translation to target language
                    config.enable_translation = true;
                    config.translation_target_languages = [this.targetLanguage];
                } else if (this.mode === 'diarization') {
                    // Enable speaker diarization
                    config.enable_speaker_diarization = true;
                    config.min_speakers = 1;
                    config.max_speakers = 6;
                }

                this.socket?.send(JSON.stringify(config));
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
                        // Extract speaker ID if available (for diarization mode)
                        // Tokens may have speaker property when diarization is enabled
                        const speakerId = data.tokens[0]?.speaker ?? undefined;

                        // Each token has 'text' property
                        const text = data.tokens.map((t: any) => t.text).join('');
                        if (text) {
                            const store = useStore.getState();
                            const isFinal = data.final_audio_proc_ms > 0;

                            if (this.mode === 'diarization' && speakerId !== undefined) {
                                // For diarization, track by speaker
                                const lastSpeakerNode = store.transcript.find(
                                    (node) => node.speakerId === speakerId && !node.isFinal
                                );

                                if (lastSpeakerNode) {
                                    store.updateLastChunkForSpeaker(speakerId, text, isFinal);
                                } else {
                                    store.addTranscriptChunk({
                                        id: Math.random().toString(),
                                        text: text,
                                        isFinal: isFinal,
                                        timestamp: Date.now(),
                                        speakerId: speakerId
                                    });
                                }
                            } else {
                                // Standard handling for transcription/translation
                                const lastNode = store.transcript[store.transcript.length - 1];

                                if (lastNode && !lastNode.isFinal) {
                                    store.updateLastChunk(text, isFinal);
                                } else {
                                    store.addTranscriptChunk({
                                        id: Math.random().toString(),
                                        text: text,
                                        isFinal: isFinal,
                                        timestamp: Date.now()
                                    });
                                }
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
