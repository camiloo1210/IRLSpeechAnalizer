import { X, Key, Palette, Type, Sun, Moon, Check, Loader2, Languages, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore, FONT_SIZE_OPTIONS, LANGUAGE_OPTIONS, MODE_OPTIONS } from '../../store/settingsStore';
import { Button } from '../ui/button';
import { useState, useEffect } from 'react';
import { FontCombobox } from './FontCombobox';

export const SettingsDialog = () => {
    const {
        isSettingsOpen,
        closeSettings,
        apiKey,
        setApiKey,
        loadApiKey,
        isApiKeyLoaded,
        theme,
        toggleTheme,
        subtitleStyle,
        setSubtitleColor,
        setSubtitleFontSize,
        setSubtitleFontFamily,
        transcriptionLanguage,
        setTranscriptionLanguage,
        sonioxMode,
        setSonioxMode,
        translationTargetLanguage,
        setTranslationTargetLanguage,
        diarizationLanguages,
        toggleDiarizationLanguage,
        diarizationDivisionMode,
        setDiarizationDivisionMode,
        selectedAudioDevice,
        setSelectedAudioDevice,
    } = useSettingsStore();

    const [localApiKey, setLocalApiKey] = useState(apiKey);
    const [activeTab, setActiveTab] = useState<'api' | 'theme' | 'subtitles' | 'mode'>('api');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Audio devices state
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [isLoadingDevices, setIsLoadingDevices] = useState(false);

    // Load API key from IndexedDB on mount
    useEffect(() => {
        if (!isApiKeyLoaded) {
            loadApiKey();
        }
    }, [isApiKeyLoaded, loadApiKey]);

    // Sync local state with store when loaded
    useEffect(() => {
        if (isApiKeyLoaded) {
            setLocalApiKey(apiKey);
        }
    }, [apiKey, isApiKeyLoaded]);

    // Load audio devices when settings opens
    useEffect(() => {
        async function loadAudioDevices() {
            if (!isSettingsOpen) return;

            setIsLoadingDevices(true);
            try {
                // Request permission first (needed to get device labels)
                await navigator.mediaDevices.getUserMedia({ audio: true });

                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter(d => d.kind === 'audioinput');
                setAudioDevices(audioInputs);
            } catch (err) {
                console.error('Error loading audio devices:', err);
            } finally {
                setIsLoadingDevices(false);
            }
        }

        loadAudioDevices();
    }, [isSettingsOpen]);

    const handleSaveApiKey = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await setApiKey(localApiKey);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'api' as const, label: 'API', icon: Key },
        { id: 'mode' as const, label: 'Mode', icon: Languages },
        { id: 'theme' as const, label: 'Theme', icon: Palette },
        { id: 'subtitles' as const, label: 'Subtitles', icon: Type },
    ];

    return (
        <AnimatePresence>
            {isSettingsOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeSettings}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Dialog Wrapper - Fixed Centering */}
                    <div
                        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
                        onClick={(e) => e.target === e.currentTarget && closeSettings()}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-2xl max-h-[85vh] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <h2 className="text-xl font-bold text-white">Settings</h2>
                                <Button variant="ghost" size="icon" onClick={closeSettings} className="text-zinc-400 hover:text-white">
                                    <X size={20} />
                                </Button>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-white/10">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors
                                        ${activeTab === tab.id
                                                ? 'text-white border-b-2 border-indigo-500 -mb-[1px]'
                                                : 'text-zinc-400 hover:text-white'
                                            }`}
                                    >
                                        <tab.icon size={16} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Content */}
                            <div className="p-6 min-h-[350px] overflow-y-auto flex-1">
                                {/* API Tab */}
                                {activeTab === 'api' && (
                                    <div className="space-y-6">
                                        {/* API Key Section */}
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Soniox API Key
                                            </label>
                                            <input
                                                type="password"
                                                value={localApiKey}
                                                onChange={(e) => setLocalApiKey(e.target.value)}
                                                placeholder="Enter your API key..."
                                                className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <p className="mt-2 text-xs text-zinc-500">
                                                Get your API key from{' '}
                                                <a href="https://soniox.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                                                    soniox.com
                                                </a>
                                            </p>
                                        </div>
                                        <Button
                                            onClick={handleSaveApiKey}
                                            className="w-full"
                                            variant="premium"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 size={16} className="mr-2 animate-spin" />
                                                    Saving to Database...
                                                </>
                                            ) : saveSuccess ? (
                                                <>
                                                    <Check size={16} className="mr-2" />
                                                    Saved to Database!
                                                </>
                                            ) : (
                                                <>
                                                    <Check size={16} className="mr-2" />
                                                    Save API Key
                                                </>
                                            )}
                                        </Button>

                                        {/* Audio Input Device Section */}
                                        <div className="pt-4 border-t border-white/10">
                                            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                                                <Mic size={16} />
                                                Entrada de Audio
                                            </label>
                                            <select
                                                value={selectedAudioDevice}
                                                onChange={(e) => setSelectedAudioDevice(e.target.value)}
                                                disabled={isLoadingDevices}
                                                className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                            >
                                                <option value="">Sistema (Predeterminado)</option>
                                                {audioDevices.map((device) => (
                                                    <option key={device.deviceId} value={device.deviceId}>
                                                        {device.label || `Micrófono ${device.deviceId.slice(0, 8)}`}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="mt-2 text-xs text-zinc-500">
                                                Selecciona el micrófono que deseas usar para la grabación.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Mode Tab */}
                                {activeTab === 'mode' && (
                                    <div className="space-y-6">
                                        {/* Soniox Mode Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-4">
                                                Processing Mode
                                            </label>
                                            <div className="space-y-3">
                                                {MODE_OPTIONS.map((mode) => (
                                                    <button
                                                        key={mode.value}
                                                        onClick={() => setSonioxMode(mode.value)}
                                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${sonioxMode === mode.value
                                                            ? 'border-indigo-500 bg-indigo-500/10'
                                                            : 'border-white/10 hover:border-white/20'
                                                            }`}
                                                    >
                                                        <span className="text-2xl">{mode.icon}</span>
                                                        <div>
                                                            <span className="text-white font-medium block">{mode.label}</span>
                                                            <span className="text-zinc-400 text-sm">{mode.description}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Source Language - only for transcription and translation */}
                                        {sonioxMode !== 'diarization' && (
                                            <div>
                                                <label className="block text-sm font-medium text-zinc-300 mb-4">
                                                    {sonioxMode === 'translation' ? 'Source Language (Speech input)' : 'Transcription Language'}
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {LANGUAGE_OPTIONS.map((lang) => (
                                                        <button
                                                            key={lang.value}
                                                            onClick={() => setTranscriptionLanguage(lang.value)}
                                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${transcriptionLanguage === lang.value
                                                                ? 'border-indigo-500 bg-indigo-500/10'
                                                                : 'border-white/10 hover:border-white/20'
                                                                }`}
                                                        >
                                                            <span className="text-xl">{lang.flag}</span>
                                                            <span className="text-white font-medium text-sm">{lang.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Translation Target Language (only shown in translation mode) */}
                                        {sonioxMode === 'translation' && (
                                            <div>
                                                <label className="block text-sm font-medium text-zinc-300 mb-4">
                                                    Target Language (Translate to)
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {LANGUAGE_OPTIONS.filter(l => l.value !== 'auto').map((lang) => (
                                                        <button
                                                            key={lang.value}
                                                            onClick={() => setTranslationTargetLanguage(lang.value)}
                                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${translationTargetLanguage === lang.value
                                                                ? 'border-green-500 bg-green-500/10'
                                                                : 'border-white/10 hover:border-white/20'
                                                                }`}
                                                        >
                                                            <span className="text-xl">{lang.flag}</span>
                                                            <span className="text-white font-medium text-sm">{lang.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Diarization Division Mode and Languages (only shown in diarization mode) */}
                                        {sonioxMode === 'diarization' && (
                                            <div className="space-y-4">
                                                {/* Division Mode Toggle */}
                                                <div>
                                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                        Dividir Pantalla Por
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button
                                                            onClick={() => setDiarizationDivisionMode('speaker')}
                                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${diarizationDivisionMode === 'speaker'
                                                                ? 'border-indigo-500 bg-indigo-500/10'
                                                                : 'border-white/10 hover:border-white/20'
                                                                }`}
                                                        >
                                                            <span className="text-xl">👥</span>
                                                            <div className="text-left">
                                                                <span className="text-white font-medium text-sm block">Speaker</span>
                                                                <span className="text-zinc-500 text-xs">Agente / Cliente</span>
                                                            </div>
                                                        </button>
                                                        <button
                                                            onClick={() => setDiarizationDivisionMode('language')}
                                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${diarizationDivisionMode === 'language'
                                                                ? 'border-emerald-500 bg-emerald-500/10'
                                                                : 'border-white/10 hover:border-white/20'
                                                                }`}
                                                        >
                                                            <span className="text-xl">🌐</span>
                                                            <div className="text-left">
                                                                <span className="text-white font-medium text-sm block">Idioma</span>
                                                                <span className="text-zinc-500 text-xs">Español / English</span>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Language Selection */}
                                                <div>
                                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                        Idiomas a Detectar
                                                    </label>
                                                    <p className="text-xs text-zinc-500 mb-4">
                                                        {diarizationDivisionMode === 'language'
                                                            ? 'Selecciona los idiomas para dividir la pantalla.'
                                                            : 'Selecciona los idiomas que se hablarán en la llamada.'}
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {LANGUAGE_OPTIONS.filter(l => l.value !== 'auto').map((lang) => {
                                                            const isSelected = diarizationLanguages.includes(lang.value);
                                                            const isLastSelected = isSelected && diarizationLanguages.length === 1;
                                                            return (
                                                                <button
                                                                    key={lang.value}
                                                                    onClick={() => toggleDiarizationLanguage(lang.value)}
                                                                    disabled={isLastSelected}
                                                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${isSelected
                                                                        ? 'border-indigo-500 bg-indigo-500/10'
                                                                        : 'border-white/10 hover:border-white/20'
                                                                        } ${isLastSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    <span className="text-xl">{lang.flag}</span>
                                                                    <span className="text-white font-medium text-sm">{lang.label}</span>
                                                                    {isSelected && (
                                                                        <Check size={16} className="ml-auto text-indigo-400" />
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <p className="text-xs text-zinc-500">
                                            Changes take effect on next recording session.
                                        </p>
                                    </div>
                                )}

                                {/* Theme Tab */}
                                {activeTab === 'theme' && (
                                    <div className="space-y-4">
                                        <label className="block text-sm font-medium text-zinc-300 mb-4">
                                            Application Theme
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => theme !== 'dark' && toggleTheme()}
                                                className={`p-6 rounded-xl border-2 transition-all ${theme === 'dark'
                                                    ? 'border-indigo-500 bg-indigo-500/10'
                                                    : 'border-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                <Moon size={32} className="mx-auto mb-3 text-indigo-400" />
                                                <span className="block text-white font-medium">Dark</span>
                                            </button>
                                            <button
                                                onClick={() => theme !== 'light' && toggleTheme()}
                                                className={`p-6 rounded-xl border-2 transition-all ${theme === 'light'
                                                    ? 'border-indigo-500 bg-indigo-500/10'
                                                    : 'border-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                <Sun size={32} className="mx-auto mb-3 text-yellow-400" />
                                                <span className="block text-white font-medium">Light</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Subtitles Tab */}
                                {activeTab === 'subtitles' && (
                                    <div className="space-y-6">
                                        {/* Color Picker */}
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Text Color
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={subtitleStyle.color}
                                                    onChange={(e) => setSubtitleColor(e.target.value)}
                                                    className="w-12 h-12 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                                                />
                                                <input
                                                    type="text"
                                                    value={subtitleStyle.color}
                                                    onChange={(e) => setSubtitleColor(e.target.value)}
                                                    className="flex-1 px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Font Size */}
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Font Size
                                            </label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {FONT_SIZE_OPTIONS.map((size) => (
                                                    <button
                                                        key={size.value}
                                                        onClick={() => setSubtitleFontSize(size.value)}
                                                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${subtitleStyle.fontSize === size.value
                                                            ? 'bg-indigo-500 text-white'
                                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                            }`}
                                                    >
                                                        {size.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Font Family */}
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Font Family
                                            </label>
                                            <FontCombobox
                                                value={subtitleStyle.fontFamily}
                                                onChange={setSubtitleFontFamily}
                                            />
                                        </div>

                                        {/* Preview */}
                                        <div className="p-4 bg-zinc-800 rounded-lg border border-white/10">
                                            <p className="text-xs text-zinc-500 mb-2">Preview</p>
                                            <p
                                                style={{
                                                    color: subtitleStyle.color,
                                                    fontFamily: subtitleStyle.fontFamily,
                                                }}
                                                className={FONT_SIZE_OPTIONS.find(s => s.value === subtitleStyle.fontSize)?.class}
                                            >
                                                Hello, this is a sample subtitle.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
