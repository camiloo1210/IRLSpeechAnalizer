import { useRef, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { SonioxClient } from '../api/client';

export const useAudioStream = (client: SonioxClient | null) => {
    const [hasPermission, setHasPermission] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const { isStreaming } = useStore();

    useEffect(() => {
        async function getPermission() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                setHasPermission(true);
            } catch (err) {
                console.error('Error accessing microphone:', err);
                setHasPermission(false);
            }
        }

        getPermission();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (processorRef.current) {
                processorRef.current.disconnect();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    useEffect(() => {
        if (isStreaming && hasPermission && streamRef.current && client) {
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext({ sampleRate: 16000 });
            }

            const ctx = audioContextRef.current;
            const source = ctx.createMediaStreamSource(streamRef.current);

            // Create ScriptProcessorNode
            // Buffer size 4096 gives ~256ms of audio at 16kHz
            const processor = ctx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (!useStore.getState().isStreaming) return;

                const inputData = e.inputBuffer.getChannelData(0);
                // Convert Float32 to Int16
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                client.sendAudioChunk(pcm16);
            };

            source.connect(processor);
            processor.connect(ctx.destination); // Needed for the processor to run

            console.log('Audio stream started processing');

            return () => {
                source.disconnect();
                if (processorRef.current) {
                    processorRef.current.disconnect();
                    processorRef.current = null;
                }
            };
        }
    }, [isStreaming, hasPermission, client]);

    return { hasPermission };
};
