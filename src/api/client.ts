import { useStore } from '../store/useStore';
import type { TranscriptionLanguage, SonioxMode, DiarizationDivisionMode } from '../store/settingsStore';

const SONIOX_API_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';

// DEBUG: Log collector for deep analysis
const debugLogs: string[] = [];
const MAX_LOGS = 1000;

function addDebugLog(message: string, data?: unknown) {
    const timestamp = new Date().toISOString();
    const logEntry = data
        ? `[${timestamp}] ${message}\n${JSON.stringify(data, null, 2)}`
        : `[${timestamp}] ${message}`;
    debugLogs.push(logEntry);
    if (debugLogs.length > MAX_LOGS) {
        debugLogs.shift(); // Remove oldest
    }
    console.log(message, data || '');
}

// Export function to download logs
export function downloadDebugLogs() {
    const content = debugLogs.join('\n\n---\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soniox-debug-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

export interface SonioxClientOptions {
    apiKey: string;
    language: TranscriptionLanguage;
    mode: SonioxMode;
    targetLanguage?: TranscriptionLanguage;
    diarizationDivisionMode?: DiarizationDivisionMode;
}

export class SonioxClient {
    private socket: WebSocket | null = null;
    private apiKey: string;
    private language: TranscriptionLanguage;
    private mode: SonioxMode;
    private targetLanguage: TranscriptionLanguage;
    private diarizationDivisionMode: DiarizationDivisionMode;
    private configSent: boolean = false;
    // For translation mode: track which audio segment we've seen the original for
    // When we get a second final with same final_audio_proc_ms, it's the translation
    private lastOriginalFinalMs: number = 0;

    constructor(options: SonioxClientOptions) {
        this.apiKey = options.apiKey;
        this.language = options.language;
        this.mode = options.mode;
        this.targetLanguage = options.targetLanguage || 'en';
        this.diarizationDivisionMode = options.diarizationDivisionMode || 'speaker';
    }

    private buildConfig(): Record<string, unknown> {
        const config: Record<string, unknown> = {
            api_key: this.apiKey,
            model: 'stt-rt-v3',
            audio_format: 'pcm_s16le',
            sample_rate: 16000,
            num_channels: 1,
            include_non_final: true,
            // Enable endpoint detection - uses AI to detect when speaker finished
            // based on intonation, pauses, and conversational context
            enable_endpoint_detection: true,
        };

        // Language hints - for transcription and translation source language
        if (this.language !== 'auto') {
            config.language_hints = [this.language];
            config.language_hints_strict = true;
        } else {
            config.enable_language_identification = true;
        }

        // Mode-specific configuration
        if (this.mode === 'translation') {
            config.translation = {
                type: 'one_way',
                target_language: this.targetLanguage
            };

        } else if (this.mode === 'diarization') {
            // Enable speaker diarization - Soniox uses flat boolean parameter
            config.enable_speaker_diarization = true;
            // Enable language identification for multilingual call center support
            // This allows detecting different languages per speaker
            config.enable_language_identification = true;
            // Remove any strict language hints to allow multi-language detection
            delete config.language_hints;
            delete config.language_hints_strict;

        }

        return config;
    }

    private sendConfig() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN && !this.configSent) {
            const config = this.buildConfig();

            this.socket.send(JSON.stringify(config));
            this.configSent = true;
        }
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

                // Config will be sent when startStream() is called
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);


                    // Handle errors from Soniox
                    if (data.error_code || data.error_message) {
                        console.error('[SonioxClient] Server error:', data.error_code, data.error_message);
                        return;
                    }

                    // Handle transcripts - Soniox v3 uses 'tokens' array
                    // For translation mode, check for 'translation' or 'translation_tokens' field
                    if (data.tokens && data.tokens.length > 0) {
                        // DEBUG: Log full response in diarization mode
                        if (this.mode === 'diarization') {
                            addDebugLog('[DIARIZATION] Raw response', data);
                            addDebugLog('[DIARIZATION] First token', data.tokens[0]);
                        }

                        // Extract speaker ID if available (for diarization mode)
                        // Soniox returns speaker as a string ("1", "2", etc.) or number
                        const rawSpeaker = data.tokens[0]?.speaker;
                        const speakerId = rawSpeaker !== undefined ? Number(rawSpeaker) : undefined;

                        if (this.mode === 'diarization') {
                            addDebugLog(`[DIARIZATION] Speaker: ${rawSpeaker} -> ${speakerId}`);
                        }

                        // Always get original text from tokens
                        const originalText = data.tokens.map((t: any) => t.text).join('');

                        // Get translated text if in translation mode
                        let translatedText: string | undefined;
                        if (this.mode === 'translation') {
                            // Log the entire translation object to understand the structure


                            if (data.translation) {
                                // Soniox may return translation as a string or as tokens
                                if (typeof data.translation === 'string') {
                                    translatedText = data.translation;
                                } else if (data.translation.tokens) {
                                    translatedText = data.translation.tokens.map((t: any) => t.text).join('');
                                } else if (data.translation.text) {
                                    translatedText = data.translation.text;
                                }
                            }
                        }

                        // Use translated text as main text if available, otherwise original
                        const text = translatedText || originalText;

                        if (text) {
                            const store = useStore.getState();

                            // Industry-standard approach for detecting final results:
                            const allTokensFinal = data.tokens.every((t: any) => t.is_final === true);
                            const audioFullyProcessed = data.final_audio_proc_ms > 0 &&
                                data.final_audio_proc_ms === data.total_audio_proc_ms;
                            const hasEndToken = data.tokens.some((t: any) => t.text === '<end>');
                            const isFinal = allTokensFinal || audioFullyProcessed || hasEndToken;

                            // Filter out the <end> token from display text
                            const displayText = originalText.replace('<end>', '').trim();

                            // For translation mode: Soniox sends translation as a SEPARATE final message
                            // Pattern discovered:
                            // - Original final:   finalMs = X, totalMs = Y (where X < Y)
                            // - Translation final: finalMs = Y, totalMs = Y (fully processed)
                            // When finalMs === totalMs on a final message, it's the translation
                            let isTranslation = false;
                            if (this.mode === 'translation' && isFinal && data.final_audio_proc_ms > 0) {
                                // Check if this is a "fully processed" message (finalMs === totalMs)
                                // AND it's different from the last original we saw
                                const isFullyProcessed = data.final_audio_proc_ms === data.total_audio_proc_ms;

                                if (isFullyProcessed && data.final_audio_proc_ms !== this.lastOriginalFinalMs) {
                                    // This is the translation (fully processed, different finalMs)
                                    isTranslation = true;
                                } else if (!isFullyProcessed) {
                                    // This is a new original (not fully processed yet)
                                    this.lastOriginalFinalMs = data.final_audio_proc_ms;
                                }
                            }



                            if (this.mode === 'diarization') {
                                // Get detected language from response
                                const detectedLanguage = data.language || data.tokens[0]?.language || 'unknown';

                                // Log what we're about to do
                                addDebugLog('[DIARIZATION] Processing chunk', {
                                    displayText,
                                    displayTextLength: displayText.length,
                                    isFinal,
                                    speakerId,
                                    detectedLanguage,
                                    tokenCount: data.tokens?.length,
                                    divisionMode: this.diarizationDivisionMode,
                                    transcriptLength: store.transcript.length,
                                    lastChunkText: store.transcript[store.transcript.length - 1]?.text?.substring(0, 50),
                                    lastChunkIsFinal: store.transcript[store.transcript.length - 1]?.isFinal
                                });

                                if (this.diarizationDivisionMode === 'language') {
                                    // Group by detected language
                                    const lastLanguageNode = store.transcript.find(
                                        (node) => node.language === detectedLanguage && !node.isFinal
                                    );

                                    if (lastLanguageNode) {
                                        addDebugLog('[DIARIZATION] Updating language chunk', { language: detectedLanguage, newTextLen: displayText.length, existingTextLen: lastLanguageNode.text.length });
                                        store.updateLastChunkForLanguage(detectedLanguage, displayText, isFinal);
                                    } else if (displayText) {
                                        addDebugLog('[DIARIZATION] Creating NEW language chunk', { language: detectedLanguage, text: displayText.substring(0, 50) });
                                        store.addTranscriptChunk({
                                            id: Math.random().toString(),
                                            text: displayText,
                                            isFinal: isFinal,
                                            timestamp: Date.now(),
                                            language: detectedLanguage,
                                            tokenCount: data.tokens?.length || 0
                                        });
                                    }
                                } else {
                                    // Group by speaker (default)
                                    if (speakerId !== undefined) {
                                        const lastSpeakerNode = store.transcript.find(
                                            (node) => node.speakerId === speakerId && !node.isFinal
                                        );

                                        if (lastSpeakerNode) {
                                            addDebugLog('[DIARIZATION] Updating speaker chunk', { speakerId, newTextLen: displayText.length, existingTextLen: lastSpeakerNode.text.length });
                                            store.updateLastChunkForSpeaker(speakerId, displayText, isFinal);
                                        } else if (displayText) {
                                            addDebugLog('[DIARIZATION] Creating NEW speaker chunk', { speakerId, text: displayText.substring(0, 50) });
                                            store.addTranscriptChunk({
                                                id: Math.random().toString(),
                                                text: displayText,
                                                isFinal: isFinal,
                                                timestamp: Date.now(),
                                                speakerId: speakerId
                                            });
                                        }
                                    }
                                }
                            } else if (this.mode === 'translation') {
                                // Translation mode: show original and translation side by side
                                // Flow:
                                // 1. Partials (isFinal=false): update existing non-final chunk OR create first chunk
                                // 2. Original final (isFinal=true, isTranslation=false): update existing with original
                                // 3. Translation (isFinal=true, isTranslation=true): update existing with translation

                                const lastNode = store.transcript[store.transcript.length - 1];
                                const hasNonFinalChunk = lastNode && !lastNode.isFinal;
                                // Translation is complete when: isFinal=true AND text !== originalText
                                const hasTranslationComplete = lastNode && lastNode.isFinal &&
                                    lastNode.text !== lastNode.originalText;

                                if (isTranslation && lastNode) {
                                    // Translation received - update last chunk with translated text
                                    store.updateLastChunk(displayText, true, lastNode.originalText || lastNode.text);
                                } else if (isFinal && !isTranslation && hasNonFinalChunk) {
                                    // Original final - update the partial chunk, keep as "waiting for translation"
                                    store.updateLastChunk(displayText, true, displayText);
                                } else if (!isFinal && hasNonFinalChunk) {
                                    // Partial update for ongoing speech
                                    store.updateLastChunk(displayText, false, displayText);
                                } else if (!isFinal && (hasTranslationComplete || !lastNode)) {
                                    // First partial of new segment after translation completed (or first ever)
                                    store.addTranscriptChunk({
                                        id: Math.random().toString(),
                                        text: displayText,
                                        originalText: displayText,
                                        isFinal: false,
                                        timestamp: Date.now()
                                    });
                                } else if (displayText && !lastNode) {
                                    // Very first chunk
                                    store.addTranscriptChunk({
                                        id: Math.random().toString(),
                                        text: displayText,
                                        originalText: displayText,
                                        isFinal: false,
                                        timestamp: Date.now()
                                    });
                                }
                                // Note: we ignore isFinal && !isTranslation && !hasNonFinalChunk because
                                // the original final should have been preceded by partials
                            } else if (displayText) {
                                // Standard transcription mode
                                const lastNode = store.transcript[store.transcript.length - 1];

                                if (lastNode && !lastNode.isFinal) {
                                    store.updateLastChunk(displayText, isFinal);
                                } else {
                                    store.addTranscriptChunk({
                                        id: Math.random().toString(),
                                        text: displayText,
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

            this.socket.onclose = () => {
                useStore.getState().setConnected(false);
                useStore.getState().setStreaming(false);
                this.socket = null;
            };
        } catch (error) {
            console.error('[SonioxClient] Failed to create WebSocket:', error);
        }
    }

    startStream() {
        // Send config and start sending audio when user initiates streaming
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            // Send config first (only once per session)
            this.sendConfig();
            useStore.getState().setStreaming(true);

        } else {
            console.warn('[SonioxClient] Cannot start stream - socket not connected');
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
