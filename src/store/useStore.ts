import { create } from 'zustand';

export interface TranscriptionNode {
    id: string;
    text: string;
    originalText?: string; // Original text before translation (for translation mode)
    isFinal: boolean;
    timestamp: number;
    speakerId?: number; // For diarization mode (legacy)
    language?: string; // Detected language code (e.g., 'es', 'en') for language-based diarization
    tokenCount?: number; // Track number of tokens processed for this chunk
    startTime?: number; // Start time of the first token in ms
    endTime?: number; // End time of the last token in ms
}

interface ChatState {
    transcript: TranscriptionNode[];
    isStreaming: boolean;
    isConnected: boolean;
    showDisconnectedPopup: boolean;
    wasConnected: boolean;

    // Actions
    setStreaming: (isStreaming: boolean) => void;
    setConnected: (isConnected: boolean) => void;
    setShowDisconnectedPopup: (show: boolean) => void;
    addTranscriptChunk: (node: TranscriptionNode) => void;
    updateLastChunk: (text: string, isFinal: boolean, originalText?: string, language?: string, speakerId?: number, tokenCount?: number, startTime?: number, endTime?: number) => void;
    updateLastChunkForSpeaker: (speakerId: number, text: string, isFinal: boolean) => void;
    updateLastChunkForLanguage: (language: string, text: string, isFinal: boolean) => void;
    finalizeChunksForLanguage: (language: string) => void;
    clearTranscript: () => void;
}

export const useStore = create<ChatState>((set) => ({
    transcript: [],
    isStreaming: false,
    isConnected: false,
    showDisconnectedPopup: false,
    wasConnected: false,

    setStreaming: (isStreaming) => set({ isStreaming }),
    setConnected: (isConnected) => set((state) => {
        // Si la conexión se perdió (estábamos conectados y ahora no), mostrar popup
        if (state.wasConnected && !isConnected) {
            return { isConnected, showDisconnectedPopup: true, wasConnected: false };
        }
        // Si nos conectamos, marcar que estuvimos conectados
        if (isConnected) {
            return { isConnected, wasConnected: true };
        }
        return { isConnected };
    }),
    setShowDisconnectedPopup: (show) => set({ showDisconnectedPopup: show }),

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
        // Find the last non-final chunk for THIS SPECIFIC speaker
        let lastIndex = -1;
        for (let i = state.transcript.length - 1; i >= 0; i--) {
            if (state.transcript[i].speakerId === speakerId && !state.transcript[i].isFinal) {
                lastIndex = i;
                break;
            }
        }

        // If no non-final chunk found for this speaker, CREATE a new one
        if (lastIndex === -1) {
            const newChunk: TranscriptionNode = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                text: text.trim(),
                isFinal,
                speakerId,
                timestamp: Date.now(),
            };
            return { transcript: [...state.transcript, newChunk] };
        }

        const currentNode = state.transcript[lastIndex];
        const existingText = currentNode.text;

        // CRITICAL FIX: Soniox sliding window problem
        // When tokens are marked as is_final, Soniox REMOVES them from subsequent updates
        // Strategy: Find overlap between END of existing text and START of new text, then merge

        let finalText = text;

        // Check if new text starts with the existing prefix (normal case - no tokens removed)
        const existingPrefix = existingText.substring(0, Math.min(10, existingText.length)).trim();
        const newTextHasPrefix = existingPrefix.length === 0 || text.includes(existingPrefix);

        if (newTextHasPrefix && text.length >= existingText.length) {
            // Normal case: new text has the prefix and is longer - use it directly
            finalText = text;
        } else if (existingText.length > 0) {
            // New text is missing the prefix OR is shorter
            // We need to merge: keep existing prefix + append new content

            const newTextTrimmed = text.trimStart();

            // Find overlap: where does the START of newText appear in existingText?
            // Try progressively shorter prefixes of newText to find overlap
            let overlapFound = false;
            let mergedText = existingText;

            // Try to find where newText starts within existingText
            for (let prefixLen = Math.min(30, newTextTrimmed.length); prefixLen >= 5; prefixLen--) {
                const newTextStart = newTextTrimmed.substring(0, prefixLen);
                const overlapIndex = existingText.lastIndexOf(newTextStart);

                if (overlapIndex > 0) {
                    // Found where new text begins in existing text
                    // Merge: existing prefix + new text (avoiding duplication)
                    mergedText = existingText.substring(0, overlapIndex) + newTextTrimmed;
                    overlapFound = true;
                    break;
                }
            }

            if (!overlapFound) {
                // No overlap found - try to find overlap at the END of existingText with START of newText
                // This handles cases like: existing="...realmente" new="realmente necesito..."
                for (let overlapLen = Math.min(30, existingText.length, newTextTrimmed.length); overlapLen >= 3; overlapLen--) {
                    const existingEnd = existingText.substring(existingText.length - overlapLen);
                    if (newTextTrimmed.startsWith(existingEnd)) {
                        // Found overlap at the boundary - append new content after overlap
                        mergedText = existingText + newTextTrimmed.substring(overlapLen);
                        overlapFound = true;
                        break;
                    }
                }
            }

            if (!overlapFound && text.length > existingText.length) {
                // New text is longer but no overlap found
                // The new text might have completely new content after the finalized part was removed
                // Try to find ANY common word to merge
                const existingWords = existingText.split(' ');
                const newWords = newTextTrimmed.split(' ');

                // Find last word in existing that appears in new text
                for (let i = existingWords.length - 1; i >= 0; i--) {
                    const word = existingWords[i];
                    if (word.length >= 3) {
                        const wordIndexInNew = newWords.indexOf(word);
                        if (wordIndexInNew >= 0) {
                            // Found common word - merge at this point
                            const existingUpToWord = existingWords.slice(0, i).join(' ');
                            mergedText = existingUpToWord + (existingUpToWord ? ' ' : '') + newTextTrimmed;
                            overlapFound = true;
                            break;
                        }
                    }
                }
            }

            // Use the merged result if it's longer, otherwise keep existing
            finalText = mergedText.length >= existingText.length ? mergedText : existingText;
        }

        const updatedNode = { ...currentNode, text: finalText, isFinal };
        const newTranscript = [...state.transcript];
        newTranscript[lastIndex] = updatedNode;

        return { transcript: newTranscript };
    }),

    updateLastChunkForLanguage: (language, text, isFinal) => set((state) => {
        // Find the last non-final chunk for THIS SPECIFIC language
        let lastIndex = -1;
        for (let i = state.transcript.length - 1; i >= 0; i--) {
            if (state.transcript[i].language === language && !state.transcript[i].isFinal) {
                lastIndex = i;
                break;
            }
        }


        // If no non-final chunk found for this language, check for duplicates before creating
        if (lastIndex === -1) {
            const newTextTrimmed = text.trim();
            const newTextLower = newTextTrimmed.toLowerCase();

            // Normalize punctuation for comparison
            const normalizePunctuation = (t: string) =>
                t.replace(/[.,;:!?¿¡]/g, '').replace(/\s+/g, ' ').trim();
            const newTextNormalized = normalizePunctuation(newTextLower);

            // Check if this text already exists in any finalized chunk for this language
            const isDuplicate = state.transcript.some(node => {
                if (!node.isFinal || node.language !== language) return false;
                const nodeTextLower = node.text.toLowerCase().trim();
                const nodeTextNormalized = normalizePunctuation(nodeTextLower);

                // Exact or near-exact match
                if (nodeTextLower === newTextLower) return true;
                if (nodeTextNormalized === newTextNormalized) return true;

                // New text is substring of existing (content already captured)
                if (nodeTextNormalized.includes(newTextNormalized)) return true;

                // Lengths within 5 chars and one starts with the other
                if (Math.abs(nodeTextLower.length - newTextLower.length) <= 5) {
                    const shorter = nodeTextLower.length < newTextLower.length ? nodeTextLower : newTextLower;
                    const longer = nodeTextLower.length >= newTextLower.length ? nodeTextLower : newTextLower;
                    if (longer.startsWith(shorter)) return true;
                }

                return false;
            });

            // Skip creating duplicate chunk
            if (isDuplicate) {
                return { transcript: state.transcript };
            }

            const newChunk: TranscriptionNode = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                text: newTextTrimmed,
                isFinal,
                language,
                timestamp: Date.now(),
            };
            return { transcript: [...state.transcript, newChunk] };
        }

        const currentNode = state.transcript[lastIndex];
        const existingText = currentNode.text;

        // CRITICAL FIX: Soniox sliding window problem (same as updateLastChunkForSpeaker)
        let finalText = text;

        const existingPrefix = existingText.substring(0, Math.min(10, existingText.length)).trim();
        const newTextHasPrefix = existingPrefix.length === 0 || text.includes(existingPrefix);

        if (newTextHasPrefix && text.length >= existingText.length) {
            finalText = text;
        } else if (existingText.length > 0) {
            const newTextTrimmed = text.trimStart();
            let overlapFound = false;
            let mergedText = existingText;

            for (let prefixLen = Math.min(30, newTextTrimmed.length); prefixLen >= 5; prefixLen--) {
                const newTextStart = newTextTrimmed.substring(0, prefixLen);
                const overlapIndex = existingText.lastIndexOf(newTextStart);

                if (overlapIndex > 0) {
                    mergedText = existingText.substring(0, overlapIndex) + newTextTrimmed;
                    overlapFound = true;
                    break;
                }
            }

            if (!overlapFound) {
                for (let overlapLen = Math.min(30, existingText.length, newTextTrimmed.length); overlapLen >= 3; overlapLen--) {
                    const existingEnd = existingText.substring(existingText.length - overlapLen);
                    if (newTextTrimmed.startsWith(existingEnd)) {
                        mergedText = existingText + newTextTrimmed.substring(overlapLen);
                        overlapFound = true;
                        break;
                    }
                }
            }

            if (!overlapFound && text.length > existingText.length) {
                const existingWords = existingText.split(' ');
                const newWords = newTextTrimmed.split(' ');

                for (let i = existingWords.length - 1; i >= 0; i--) {
                    const word = existingWords[i];
                    if (word.length >= 3) {
                        const wordIndexInNew = newWords.indexOf(word);
                        if (wordIndexInNew >= 0) {
                            const existingUpToWord = existingWords.slice(0, i).join(' ');
                            mergedText = existingUpToWord + (existingUpToWord ? ' ' : '') + newTextTrimmed;
                            overlapFound = true;
                            break;
                        }
                    }
                }
            }

            finalText = mergedText.length >= existingText.length ? mergedText : existingText;
        }

        const updatedNode = { ...currentNode, text: finalText, isFinal };
        const newTranscript = [...state.transcript];
        newTranscript[lastIndex] = updatedNode;

        return { transcript: newTranscript };
    }),

    // Finalize all non-final chunks for a specific language
    finalizeChunksForLanguage: (language) => set((state) => {
        let modified = false;
        const newTranscript = state.transcript.map(node => {
            if (node.language === language && !node.isFinal) {
                modified = true;
                return { ...node, isFinal: true };
            }
            return node;
        });
        return modified ? { transcript: newTranscript } : state;
    }),

    clearTranscript: () => set({ transcript: [] }),
}));
