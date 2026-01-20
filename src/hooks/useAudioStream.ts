import { useRef, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { SonioxClient } from '../api/client';

export const useAudioStream = (client: SonioxClient | null) => {
    const [hasPermission, setHasPermission] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const { isStreaming } = useStore();
    const selectedAudioDevice = useSettingsStore((state) => state.selectedAudioDevice);

    // Request permission and get audio stream when device changes
    useEffect(() => {
        async function getPermission() {
            try {
                // Stop previous stream if exists
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }

                // Configure audio constraints with selected device
                const audioConstraints: MediaStreamConstraints = {
                    audio: selectedAudioDevice
                        ? {
                            deviceId: { exact: selectedAudioDevice },
                            // Requesting capabilities doesn't guarantee the browser respects them for the CONTEXT,
                            // but it helps suggest the preferred hardware configuration.
                            channelCount: 1,
                            sampleRate: 16000
                        }
                        : {
                            channelCount: 1,
                            sampleRate: 16000
                        }
                };

                const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
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
    }, [selectedAudioDevice]);

    useEffect(() => {
        let isCleaningUp = false;

        const startProcessing = async () => {
            if (isStreaming && hasPermission && streamRef.current && client) {
                try {
                    // 1. Create AudioContext with explicit 16kHz sample rate
                    // This forces the browser to handle high-quality resampling natively!
                    const ctx = new AudioContext({ sampleRate: 16000 });
                    audioContextRef.current = ctx;

                    // 2. Add the AudioWorklet module
                    // We use an absolute path relative to root to ensure it loads correctly
                    // Note: Vite usually serves 'public' at root
                    await ctx.audioWorklet.addModule('/audio-processor.js');

                    if (isCleaningUp) {
                        ctx.close();
                        return;
                    }

                    const source = ctx.createMediaStreamSource(streamRef.current);
                    const workletNode = new AudioWorkletNode(ctx, 'audio-processor');

                    workletNode.port.onmessage = (event) => {
                        if (!useStore.getState().isStreaming) return;
                        // The worklet sends us Int16Array directly
                        const pcm16 = event.data;
                        client.sendAudioChunk(pcm16);
                    };

                    source.connect(workletNode);
                    // Worklet usually doesn't need to connect to destination unless we want to hear it
                    // But some browsers might aggressive garbage collect if not connected or processing
                    // connecting to destination might cause feedback loop if not careful!
                    // Safest is to just let it run. source -> worklet is a valid graph.

                    workletNodeRef.current = workletNode;

                } catch (error) {
                    console.error('Failed to start audio processor:', error);
                }
            }
        };

        if (isStreaming) {
            startProcessing();
        } else {
            // Cleanup when stopping stream
            if (workletNodeRef.current) {
                workletNodeRef.current.disconnect();
                workletNodeRef.current = null;
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
        }

        return () => {
            isCleaningUp = true;
            if (workletNodeRef.current) {
                workletNodeRef.current.disconnect();
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, [isStreaming, hasPermission, client]);

    return { hasPermission };
};
