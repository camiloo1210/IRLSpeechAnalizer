import { useRef, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { SonioxClient } from '../api/client';

// Resample audio from source sample rate to target sample rate (16kHz for Soniox)
function resampleBuffer(inputBuffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
    if (inputSampleRate === outputSampleRate) {
        return inputBuffer;
    }

    const ratio = inputSampleRate / outputSampleRate;
    const outputLength = Math.round(inputBuffer.length / ratio);
    const outputBuffer = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
        const srcIndex = i * ratio;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(srcIndexFloor + 1, inputBuffer.length - 1);
        const t = srcIndex - srcIndexFloor;

        // Linear interpolation
        outputBuffer[i] = inputBuffer[srcIndexFloor] * (1 - t) + inputBuffer[srcIndexCeil] * t;
    }

    return outputBuffer;
}

export const useAudioStream = (client: SonioxClient | null) => {
    const [hasPermission, setHasPermission] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
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
                        ? { deviceId: { exact: selectedAudioDevice } }
                        : true
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
            if (processorRef.current) {
                processorRef.current.disconnect();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [selectedAudioDevice]);

    useEffect(() => {
        if (isStreaming && hasPermission && streamRef.current && client) {
            // Create AudioContext with native sample rate (don't force 16kHz)
            // This avoids the "different sample-rate" error on some browsers/devices
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }

            const ctx = audioContextRef.current;
            const nativeSampleRate = ctx.sampleRate;
            const targetSampleRate = 16000; // Soniox requires 16kHz

            const source = ctx.createMediaStreamSource(streamRef.current);

            // Create ScriptProcessorNode with appropriate buffer size
            const bufferSize = 4096;
            const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (!useStore.getState().isStreaming) return;

                const inputData = e.inputBuffer.getChannelData(0);

                // Resample to 16kHz if needed
                const resampledData = resampleBuffer(inputData, nativeSampleRate, targetSampleRate);

                // Convert Float32 to Int16 (PCM)
                const pcm16 = new Int16Array(resampledData.length);
                for (let i = 0; i < resampledData.length; i++) {
                    const s = Math.max(-1, Math.min(1, resampledData[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                client.sendAudioChunk(pcm16);
            };

            source.connect(processor);
            processor.connect(ctx.destination); // Needed for the processor to run

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
