import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiKeyDB } from '../db/database';

export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type Theme = 'dark' | 'light';

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

    // Settings Dialog
    isSettingsOpen: boolean;
    openSettings: () => void;
    closeSettings: () => void;
}

export const FONT_OPTIONS = [
    { value: 'Inter', label: 'Inter (Default)' },
    { value: 'Roboto Mono', label: 'Roboto Mono' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Courier New', label: 'Courier New' },
];

export const FONT_SIZE_OPTIONS: { value: FontSize; label: string; class: string }[] = [
    { value: 'sm', label: 'Small', class: 'text-base' },
    { value: 'md', label: 'Medium', class: 'text-xl' },
    { value: 'lg', label: 'Large', class: 'text-2xl' },
    { value: 'xl', label: 'Extra Large', class: 'text-3xl' },
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
            }),
        }
    )
);
