import { create } from 'zustand';

export interface TranscriptionNode {
    id: string;
    text: string;
    originalText?: string; // Original text before translation (for translation mode)
    isFinal: boolean;
    timestamp: number;
    speakerId?: number; // For diarization mode (legacy)
    language?: string; // Detected language code (e.g., 'es', 'en') for language-based diarization
    tokenCount: number; // Track number of tokens processed for this chunk
    startTime?: number; // Start time of the first token in ms
    endTime?: number; // End time of the last token in ms
}

interface ChatState {
    transcript: TranscriptionNode[];
    isStreaming: boolean;
    isConnected: boolean;

    // Actions
    setStreaming: (isStreaming: boolean) => void;
    setConnected: (isConnected: boolean) => void;
    addTranscriptChunk: (node: TranscriptionNode) => void;
    updateLastChunk: (text: string, isFinal: boolean, originalText?: string, language?: string, speakerId?: number, tokenCount?: number, startTime?: number, endTime?: number) => void;
    updateLastChunkForSpeaker: (speakerId: number, text: string, isFinal: boolean) => void;
    updateLastChunkForLanguage: (language: string, text: string, isFinal: boolean) => void;
    clearTranscript: () => void;
}

export const useStore = create<ChatState>((set) => ({
    transcript: [],
    isStreaming: false,
    isConnected: false,

    setStreaming: (isStreaming) => set({ isStreaming }),
    setConnected: (isConnected) => set({ isConnected }),

    addTranscriptChunk: (node) => set((state) => ({
        transcript: [...state.transcript, node]
    })),

    updateLastChunk: (text, isFinal, originalText, language, speakerId, tokenCount, startTime, endTime) => set((state) => {
        const lastNode = state.transcript[state.transcript.length - 1];
        if (!lastNode) return state;

        const updatedNode = {
            ...lastNode,
            text,
            isFinal,
            ...(originalText !== undefined && { originalText }),
            ...(language !== undefined && { language }),
            ...(speakerId !== undefined && { speakerId }),
            ...(tokenCount !== undefined && { tokenCount }),
            ...(startTime !== undefined && { startTime }),
            ...(endTime !== undefined && { endTime })
        };
        return {
            transcript: [...state.transcript.slice(0, -1), updatedNode]
        };
    }),

    updateLastChunkForSpeaker: (speakerId, text, isFinal) => set((state) => {
        // Find the last non-final chunk for this speaker (manual loop for ES compatibility)
        let lastIndex = -1;
        for (let i = state.transcript.length - 1; i >= 0; i--) {
            if (!state.transcript[i].isFinal) {
                lastIndex = i;
                break;
            }
        }

        if (lastIndex === -1) return state;

        const updatedNode = { ...state.transcript[lastIndex], text, isFinal };
        const newTranscript = [...state.transcript];
        newTranscript[lastIndex] = updatedNode;

        return { transcript: newTranscript };
    }),

    updateLastChunkForLanguage: (language, text, isFinal) => set((state) => {
        // Find the last non-final chunk for this language
        let lastIndex = -1;
        for (let i = state.transcript.length - 1; i >= 0; i--) {
            if (!state.transcript[i].isFinal) {
                lastIndex = i;
                break;
            }
        }

        if (lastIndex === -1) return state;

        const updatedNode = { ...state.transcript[lastIndex], text, isFinal };
        const newTranscript = [...state.transcript];
        newTranscript[lastIndex] = updatedNode;

        return { transcript: newTranscript };
    }),

    clearTranscript: () => set({ transcript: [] }),
}));
