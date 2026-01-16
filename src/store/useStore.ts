import { create } from 'zustand';

export interface TranscriptionNode {
    id: string;
    text: string;
    isFinal: boolean;
    timestamp: number;
}

interface ChatState {
    transcript: TranscriptionNode[];
    isStreaming: boolean;
    isConnected: boolean;

    // Actions
    setStreaming: (isStreaming: boolean) => void;
    setConnected: (isConnected: boolean) => void;
    addTranscriptChunk: (node: TranscriptionNode) => void;
    updateLastChunk: (text: string, isFinal: boolean) => void;
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

    updateLastChunk: (text, isFinal) => set((state) => {
        const lastNode = state.transcript[state.transcript.length - 1];
        if (!lastNode) return state;

        const updatedNode = { ...lastNode, text, isFinal };
        return {
            transcript: [...state.transcript.slice(0, -1), updatedNode]
        };
    }),

    clearTranscript: () => set({ transcript: [] }),
}));
