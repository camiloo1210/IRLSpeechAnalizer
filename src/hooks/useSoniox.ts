import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { SonioxClient } from '../api/client';

export const useSoniox = () => {
    const clientRef = useRef<SonioxClient | null>(null);
    const isStreaming = useStore((state) => state.isStreaming);
    const apiKey = useSettingsStore((state) => state.apiKey);
    const transcriptionLanguage = useSettingsStore((state) => state.transcriptionLanguage);
    const sonioxMode = useSettingsStore((state) => state.sonioxMode);
    const translationTargetLanguage = useSettingsStore((state) => state.translationTargetLanguage);
    const diarizationDivisionMode = useSettingsStore((state) => state.diarizationDivisionMode);
    const diarizationLanguages = useSettingsStore((state) => state.diarizationLanguages);

    // Conectar y empezar stream cuando isStreaming cambia a true
    useEffect(() => {
        let isCancelled = false;

        const connectAndStart = async () => {
            if (!apiKey) return;

            // Crear nuevo cliente
            const newClient = new SonioxClient({
                apiKey,
                language: transcriptionLanguage,
                mode: sonioxMode,
                targetLanguage: translationTargetLanguage,
                diarizationDivisionMode: diarizationDivisionMode,
                diarizationLanguages: diarizationLanguages,
            });

            clientRef.current = newClient;

            try {
                // Esperar a que la conexión esté lista (onopen + config enviada)
                await newClient.connect();

                // Verificar si el efecto no fue cancelado
                if (!isCancelled) {
                    newClient.startStream();
                }
            } catch (error) {
                console.error('[useSoniox] Failed to connect:', error);
            }
        };

        if (isStreaming) {
            connectAndStart();
        } else if (clientRef.current) {
            // Desconectar cuando se detiene el streaming
            clientRef.current.stopStream();
            clientRef.current.disconnect();
            clientRef.current = null;
        }

        return () => {
            isCancelled = true;
        };
    }, [isStreaming, apiKey, transcriptionLanguage, sonioxMode, translationTargetLanguage, diarizationDivisionMode, diarizationLanguages]);

    // Cleanup al desmontar
    useEffect(() => {
        return () => {
            if (clientRef.current) {
                clientRef.current.disconnect();
                clientRef.current = null;
            }
        };
    }, []);

    return clientRef.current;
};
