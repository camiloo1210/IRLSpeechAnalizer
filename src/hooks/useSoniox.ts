import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { SonioxClient } from '../api/client';

export const useSoniox = () => {
    const clientRef = useRef<SonioxClient | null>(null);
    const isStreaming = useStore((state) => state.isStreaming);
    const apiKey = useSettingsStore((state) => state.apiKey);

    useEffect(() => {
        // Initialize client once on mount or when API key changes
        if (apiKey) {
            clientRef.current = new SonioxClient(apiKey);
            clientRef.current.connect();
        }

        return () => {
            clientRef.current?.disconnect();
        };
    }, [apiKey]);

    useEffect(() => {
        if (isStreaming) {
            clientRef.current?.startStream();
        } else {
            clientRef.current?.stopStream();
        }
    }, [isStreaming]);

    return clientRef.current;
};
