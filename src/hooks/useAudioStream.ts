import { useRef, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

export const useAudioStream = () => {
    const [hasPermission, setHasPermission] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
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
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    useEffect(() => {
        if (isStreaming && hasPermission && streamRef.current) {
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }

            const ctx = audioContextRef.current;
            const source = ctx.createMediaStreamSource(streamRef.current);
            // In a real implementation, we would connect this to an AudioWorklet
            // source.connect(workletNode);

            // For now, we just placeholder the connection
            console.log('Audio stream started processing');

            return () => {
                // cleanup
                source.disconnect();
            };
        }
    }, [isStreaming, hasPermission]);

    return { hasPermission };
};
