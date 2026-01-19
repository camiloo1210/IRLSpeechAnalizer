import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiKeyDB } from '../db/database';

export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type Theme = 'dark' | 'light';
export type TranscriptionLanguage = 'es' | 'en' | 'pt' | 'fr' | 'de' | 'it' | 'auto';
export type SonioxMode = 'transcription' | 'translation' | 'diarization';
export type DiarizationDivisionMode = 'speaker' | 'language';

export interface SubtitleStyle {
    color: string;
    fontSize: FontSize;
    fontFamily: string;
}

interface SettingsState {
    // API (stored in IndexedDB, this is just the in-memory cache)
    apiKey: string;
    isApiKeyLoaded: boolean;
    setApiKey: (key: string) => Promise<void>;
    loadApiKey: () => Promise<void>;

    // Theme
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;

    // Subtitle Styles
    subtitleStyle: SubtitleStyle;
    setSubtitleColor: (color: string) => void;
    setSubtitleFontSize: (size: FontSize) => void;
    setSubtitleFontFamily: (font: string) => void;

    // Transcription Language
    transcriptionLanguage: TranscriptionLanguage;
    setTranscriptionLanguage: (lang: TranscriptionLanguage) => void;

    // Soniox Mode
    sonioxMode: SonioxMode;
    setSonioxMode: (mode: SonioxMode) => void;

    // Translation Target Language (for translation mode)
    translationTargetLanguage: TranscriptionLanguage;
    setTranslationTargetLanguage: (lang: TranscriptionLanguage) => void;

    // Diarization Languages (for diarization mode - which languages to detect)
    diarizationLanguages: TranscriptionLanguage[];
    setDiarizationLanguages: (langs: TranscriptionLanguage[]) => void;
    toggleDiarizationLanguage: (lang: TranscriptionLanguage) => void;

    // Diarization Division Mode (speaker or language)
    diarizationDivisionMode: DiarizationDivisionMode;
    setDiarizationDivisionMode: (mode: DiarizationDivisionMode) => void;

    // Audio Input Device
    selectedAudioDevice: string; // deviceId, empty string = default
    setSelectedAudioDevice: (deviceId: string) => void;

    // Settings Dialog
    isSettingsOpen: boolean;
    openSettings: () => void;
    closeSettings: () => void;
}

export const FONT_OPTIONS = [
    // Sans-serif (Clean, modern)
    { value: 'Inter', label: 'Inter', category: 'Sans-serif' },
    { value: 'Outfit', label: 'Outfit', category: 'Sans-serif' },
    { value: 'Poppins', label: 'Poppins', category: 'Sans-serif' },
    { value: 'Space Grotesk', label: 'Space Grotesk', category: 'Sans-serif' },
    { value: 'Montserrat', label: 'Montserrat', category: 'Sans-serif' },
    { value: 'Nunito', label: 'Nunito', category: 'Sans-serif' },
    { value: 'Open Sans', label: 'Open Sans', category: 'Sans-serif' },
    // Monospace (Technical)
    { value: 'JetBrains Mono', label: 'JetBrains Mono', category: 'Monospace' },
    { value: 'Roboto Mono', label: 'Roboto Mono', category: 'Monospace' },
    { value: 'Fira Code', label: 'Fira Code', category: 'Monospace' },
    // System fonts (Fallback)
    { value: 'Arial', label: 'Arial', category: 'System' },
    { value: 'Georgia', label: 'Georgia', category: 'System' },
];

export const FONT_SIZE_OPTIONS: { value: FontSize; label: string; class: string }[] = [
    { value: 'sm', label: 'Small', class: 'text-base' },
    { value: 'md', label: 'Medium', class: 'text-xl' },
    { value: 'lg', label: 'Large', class: 'text-2xl' },
    { value: 'xl', label: 'Extra Large', class: 'text-3xl' },
];

export const LANGUAGE_OPTIONS: { value: TranscriptionLanguage; label: string; flag: string }[] = [
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'pt', label: 'Português', flag: '🇧🇷' },
    { value: 'fr', label: 'Français', flag: '🇫🇷' },
    { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { value: 'it', label: 'Italiano', flag: '🇮🇹' },
    { value: 'auto', label: 'Auto-detect', flag: '🌐' },
];

export const MODE_OPTIONS: { value: SonioxMode; label: string; description: string; icon: string }[] = [
    { value: 'transcription', label: 'Transcription', description: 'Convert speech to text in the same language', icon: '🎤' },
    { value: 'translation', label: 'Translation', description: 'Convert speech to text in another language', icon: '🌐' },
    { value: 'diarization', label: 'Speaker Diarization', description: 'Identify and separate different speakers', icon: '👥' },
];

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            // API Key - stored in IndexedDB
            apiKey: '',
            isApiKeyLoaded: false,
            setApiKey: async (key) => {
                await apiKeyDB.set(key);
                set({ apiKey: key });
            },
            loadApiKey: async () => {
                const key = await apiKeyDB.get();
                set({ apiKey: key || '', isApiKeyLoaded: true });
            },

            // Theme
            theme: 'dark',
            setTheme: (theme) => set({ theme }),
            toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

            // Subtitle Styles
            subtitleStyle: {
                color: '#ffffff',
                fontSize: 'lg',
                fontFamily: 'Inter',
            },
            setSubtitleColor: (color) => set((state) => ({
                subtitleStyle: { ...state.subtitleStyle, color }
            })),
            setSubtitleFontSize: (fontSize) => set((state) => ({
                subtitleStyle: { ...state.subtitleStyle, fontSize }
            })),
            setSubtitleFontFamily: (fontFamily) => set((state) => ({
                subtitleStyle: { ...state.subtitleStyle, fontFamily }
            })),

            // Transcription Language
            transcriptionLanguage: 'es',
            setTranscriptionLanguage: (transcriptionLanguage) => set({ transcriptionLanguage }),

            // Soniox Mode
            sonioxMode: 'transcription',
            setSonioxMode: (sonioxMode) => set({ sonioxMode }),

            // Translation Target Language
            translationTargetLanguage: 'en',
            setTranslationTargetLanguage: (translationTargetLanguage) => set({ translationTargetLanguage }),

            // Diarization Languages (default: Spanish and English)
            diarizationLanguages: ['es', 'en'],
            setDiarizationLanguages: (diarizationLanguages) => set({ diarizationLanguages }),
            toggleDiarizationLanguage: (lang) => set((state) => {
                const current = state.diarizationLanguages;
                if (current.includes(lang)) {
                    // Don't allow removing the last language
                    if (current.length > 1) {
                        return { diarizationLanguages: current.filter(l => l !== lang) };
                    }
                    return state;
                } else {
                    return { diarizationLanguages: [...current, lang] };
                }
            }),

            // Diarization Division Mode (default: speaker)
            diarizationDivisionMode: 'speaker',
            setDiarizationDivisionMode: (diarizationDivisionMode) => set({ diarizationDivisionMode }),

            // Audio Input Device (empty string = system default)
            selectedAudioDevice: '',
            setSelectedAudioDevice: (selectedAudioDevice) => set({ selectedAudioDevice }),

            // Settings Dialog
            isSettingsOpen: false,
            openSettings: () => set({ isSettingsOpen: true }),
            closeSettings: () => set({ isSettingsOpen: false }),
        }),
        {
            name: 'irl-speech-settings',
            // Don't persist apiKey in localStorage (it's in IndexedDB)
            partialize: (state) => ({
                theme: state.theme,
                subtitleStyle: state.subtitleStyle,
                transcriptionLanguage: state.transcriptionLanguage,
                sonioxMode: state.sonioxMode,
                translationTargetLanguage: state.translationTargetLanguage,
                diarizationLanguages: state.diarizationLanguages,
                diarizationDivisionMode: state.diarizationDivisionMode,
                selectedAudioDevice: state.selectedAudioDevice,
            }),
        }
    )
);
