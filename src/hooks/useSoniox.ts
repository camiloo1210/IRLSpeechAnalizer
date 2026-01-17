import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { SonioxClient } from '../api/client';

export const useSoniox = () => {
    const [client, setClient] = useState<SonioxClient | null>(null);
    const isStreaming = useStore((state) => state.isStreaming);
    const apiKey = useSettingsStore((state) => state.apiKey);
    const transcriptionLanguage = useSettingsStore((state) => state.transcriptionLanguage);
    const sonioxMode = useSettingsStore((state) => state.sonioxMode);
    const translationTargetLanguage = useSettingsStore((state) => state.translationTargetLanguage);

    useEffect(() => {
        // Initialize client once on mount or when settings change

        let newClient: SonioxClient | null = null;

        if (apiKey) {
            newClient = new SonioxClient({
                apiKey,
                language: transcriptionLanguage,
                mode: sonioxMode,
                targetLanguage: translationTargetLanguage,
            });
            newClient.connect();
            setClient(newClient);
        }

        return () => {

            if (newClient) {
                newClient.disconnect();
            }
            setClient(null);
        };
    }, [apiKey, transcriptionLanguage, sonioxMode, translationTargetLanguage]);

    useEffect(() => {
        if (client) {
            if (isStreaming) {
                client.startStream();
            } else {
                client.stopStream();
            }
        }
    }, [isStreaming, client]);

    return client;
};
