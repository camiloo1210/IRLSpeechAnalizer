import { useEffect, useRef, useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import type { TranscriptionNode } from '../../store/useStore';
import { useSettingsStore, FONT_SIZE_OPTIONS } from '../../store/settingsStore';
import { useAudioStream } from '../../hooks/useAudioStream';
import { Mic, Settings, Terminal, Download, Trash2, X, Bug, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { useSoniox } from '../../hooks/useSoniox';
import { SettingsDialog } from '../Settings/SettingsDialog';
import { downloadDebugLogs } from '../../api/client';

// Speaker colors for diarization mode
const SPEAKER_COLORS = [
    { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400' },
    { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
    { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
    { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
    { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400' },
    { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
];

export const LiveStream = () => {
    // Main Store
    const transcript = useStore((state) => state.transcript);
    const isStreaming = useStore((state) => state.isStreaming);
    const isConnected = useStore((state) => state.isConnected);
    const showDisconnectedPopup = useStore((state) => state.showDisconnectedPopup);
    const setShowDisconnectedPopup = useStore((state) => state.setShowDisconnectedPopup);
    const setStreaming = useStore((state) => state.setStreaming);
    const clearTranscript = useStore((state) => state.clearTranscript);

    // Settings Store
    const { subtitleStyle, openSettings, sonioxMode, diarizationDivisionMode } = useSettingsStore();

    // Menu state
    const [showMenu, setShowMenu] = useState(false);

    // Get subtitle font size class
    const fontSizeClass = FONT_SIZE_OPTIONS.find(s => s.value === subtitleStyle.fontSize)?.class || 'text-xl';

    // Export transcript as text file
    const handleExport = () => {
        if (transcript.length === 0) return;

        let content = '';
        if (sonioxMode === 'diarization') {
            // Format for diarization - show speaker
            transcript.forEach((node) => {
                const speaker = node.speakerId === 0 ? 'Agente' : 'Cliente';
                content += `[${speaker}] ${node.text}\n`;
            });
        } else {
            // Standard format
            transcript.forEach((node) => {
                content += `${node.text}\n`;
            });
        }

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `glu-transcript-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        setShowMenu(false);
    };

    // Clear transcript
    const handleClear = () => {
        clearTranscript();
        setShowMenu(false);
    };

    // Hooks
    const client = useSoniox();
    const { hasPermission } = useAudioStream(client);

    const endRef = useRef<HTMLDivElement>(null);

    // Refs for independent auto-scroll per speaker in diarization mode
    const speaker1Ref = useRef<HTMLDivElement>(null);
    const speaker2Ref = useRef<HTMLDivElement>(null);
    const speaker1EndRef = useRef<HTMLDivElement>(null);
    const speaker2EndRef = useRef<HTMLDivElement>(null);

    // Get unique languages for diarization mode (language-based division)
    const detectedLanguages = useMemo(() => {
        if (sonioxMode !== 'diarization') return [];
        const langSet = new Set<string>();
        transcript.forEach((node) => {
            if (node.language) {
                langSet.add(node.language);
            }
        });
        return Array.from(langSet).sort();
    }, [transcript, sonioxMode]);

    // Get unique speakers for diarization mode (speaker-based division)
    const speakers = useMemo(() => {
        if (sonioxMode !== 'diarization') return [];
        const speakerSet = new Set<number>();
        transcript.forEach((node) => {
            if (node.speakerId !== undefined) {
                speakerSet.add(node.speakerId);
            }
        });
        return Array.from(speakerSet).sort();
    }, [transcript, sonioxMode]);

    // Get transcripts per language
    const getTranscriptByLanguage = (language: string) => {
        return transcript.filter((node) => node.language === language);
    };

    // Get transcripts per speaker
    const getTranscriptBySpeaker = (speakerId: number) => {
        return transcript.filter((node) => node.speakerId === speakerId);
    };

    // Language display info
    const getLanguageInfo = (lang: string) => {
        const langMap: Record<string, { label: string; flag: string; icon: string }> = {
            'es': { label: 'Español', flag: '🇪🇸', icon: '🎧' },
            'en': { label: 'English', flag: '🇺🇸', icon: '📞' },
            'pt': { label: 'Português', flag: '🇧🇷', icon: '🎤' },
            'fr': { label: 'Français', flag: '🇫🇷', icon: '🎤' },
            'de': { label: 'Deutsch', flag: '🇩🇪', icon: '🎤' },
            'it': { label: 'Italiano', flag: '🇮🇹', icon: '🎤' },
        };
        return langMap[lang] || { label: lang.toUpperCase(), flag: '🌐', icon: '🎤' };
    };

    // Auto-scroll logic for standard/translation views
    useEffect(() => {
        if (sonioxMode !== 'diarization' && endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [transcript, sonioxMode]);

    // Independent auto-scroll for diarization mode - scrolls container to bottom
    useEffect(() => {
        if (sonioxMode === 'diarization') {
            // Scroll speaker 1 column to bottom
            if (speaker1Ref.current) {
                speaker1Ref.current.scrollTop = speaker1Ref.current.scrollHeight;
            }
            // Scroll speaker 2 column to bottom
            if (speaker2Ref.current) {
                speaker2Ref.current.scrollTop = speaker2Ref.current.scrollHeight;
            }
        }
    }, [transcript, sonioxMode]);

    // Render a single transcript node
    const renderTranscriptNode = (node: typeof transcript[0], index: number, speakerColor?: typeof SPEAKER_COLORS[0]) => (
        <div key={node.id || index} className="group mb-4 w-full" style={{ minWidth: 0 }}>
            <div className={`diarization-message relative p-4 rounded-xl border transition-all duration-300 w-full ${node.isFinal
                ? speakerColor ? `${speakerColor.bg} ${speakerColor.border}` : 'bg-secondary/40 border-white/5 hover:bg-secondary/60'
                : 'bg-indigo-500/10 border-indigo-500/20'
                }`}>
                <p
                    className={`text-wrap-force leading-relaxed font-medium tracking-wide w-full ${sonioxMode === 'diarization' ? 'text-base' : fontSizeClass} ${node.isFinal ? '' : 'opacity-70'}`}
                    style={{
                        color: subtitleStyle.color,
                        fontFamily: subtitleStyle.fontFamily,
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-all',
                        minWidth: 0
                    }}
                >
                    {node.text}
                    {!node.isFinal && <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />}
                </p>
                <div className="mt-2 flex items-center gap-3">
                    <span className="text-[9px] font-mono font-bold text-muted-foreground/40 bg-white/5 px-2 py-0.5 rounded uppercase">
                        {new Date(node.timestamp).toLocaleTimeString([], { second: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen w-full bg-background text-foreground font-sans overflow-hidden selection:bg-indigo-500/30">
            {/* Settings Dialog */}
            <SettingsDialog />

            {/* Disconnected Toast Notification */}
            <AnimatePresence>
                {showDisconnectedPopup && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: 20 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, y: 20, x: 20 }}
                        className="fixed bottom-24 right-4 z-[100] max-w-sm"
                    >
                        <div className="bg-zinc-900/95 backdrop-blur-md border border-amber-500/30 rounded-xl p-4 shadow-lg shadow-black/20 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white">
                                    Conexión finalizada
                                </p>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Presiona el micrófono para reconectar
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDisconnectedPopup(false)}
                                className="text-zinc-500 hover:text-white transition-colors p-1 -mr-1 -mt-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Background Gradient Mesh */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/30 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/30 rounded-full blur-[120px]" />
            </div>

            {/* 1. Header */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between
                bg-background/80 backdrop-blur-md border-b border-white/5 shadow-sm">

                <div className="flex items-center gap-3">
                    <img
                        src="/glu.svg"
                        alt="Glu Logo"
                        className="w-10 h-10 rounded-xl shadow-lg shadow-indigo-500/20"
                    />
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold tracking-tight text-foreground leading-none">
                            Glu
                        </h1>
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-0.5">
                            Real-time AI Analysis
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${isConnected
                        ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.1)]'
                        : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-zinc-500'}`} />
                        {isConnected ? 'LIVE' : 'READY'}
                    </div>
                </div>
            </header>

            {/* 2. Main Content Area */}
            <main className={`relative z-10 flex-1 pt-24 pb-48 px-4 md:px-0 w-full mx-auto overflow-y-auto scrollbar-hide ${sonioxMode === 'diarization' || sonioxMode === 'translation' ? 'max-w-5xl' : 'max-w-3xl'}`}>

                {/* Translation Split View */}
                {sonioxMode === 'translation' ? (
                    <div className="grid grid-cols-2 gap-6 min-h-full">
                        {/* Original Language Column */}
                        <div className="flex flex-col">
                            <div className="sticky top-0 z-10 p-3 mb-4 rounded-xl border bg-amber-500/10 border-amber-500/30 backdrop-blur-sm">
                                <span className="font-bold text-amber-400">
                                    🎤 Original
                                </span>
                            </div>
                            <div className="flex-1 flex flex-col justify-end">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {transcript.map((node, index) => (
                                        <motion.div
                                            key={`orig-${node.id || index}`}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="group mb-4"
                                        >
                                            <div className={`diarization-message relative p-4 rounded-xl border transition-all duration-300 ${node.isFinal
                                                ? 'bg-amber-500/10 border-amber-500/20'
                                                : 'bg-indigo-500/10 border-indigo-500/20'
                                                }`}>
                                                <p
                                                    className={`text-wrap-force leading-relaxed font-medium tracking-wide ${fontSizeClass} ${node.isFinal ? '' : 'opacity-70'}`}
                                                    style={{
                                                        color: subtitleStyle.color,
                                                        fontFamily: subtitleStyle.fontFamily,
                                                    }}
                                                >
                                                    {node.originalText || node.text}
                                                    {!node.isFinal && <span className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse align-middle" />}
                                                </p>
                                                <div className="mt-2">
                                                    <span className="text-[9px] font-mono font-bold text-muted-foreground/40 bg-white/5 px-2 py-0.5 rounded uppercase">
                                                        {new Date(node.timestamp).toLocaleTimeString([], { second: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Translated Language Column */}
                        <div className="flex flex-col">
                            <div className="sticky top-0 z-10 p-3 mb-4 rounded-xl border bg-green-500/10 border-green-500/30 backdrop-blur-sm">
                                <span className="font-bold text-green-400">
                                    🌐 Translated
                                </span>
                            </div>
                            <div className="flex-1 flex flex-col justify-end">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {transcript.map((node, index) => (
                                        <motion.div
                                            key={`trans-${node.id || index}`}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="group mb-4"
                                        >
                                            <div className={`diarization-message relative p-4 rounded-xl border transition-all duration-300 ${node.isFinal
                                                ? 'bg-green-500/10 border-green-500/20'
                                                : 'bg-indigo-500/10 border-indigo-500/20'
                                                }`}>
                                                <p
                                                    className={`text-wrap-force leading-relaxed font-medium tracking-wide ${fontSizeClass} ${node.isFinal ? '' : 'opacity-70'}`}
                                                    style={{
                                                        color: subtitleStyle.color,
                                                        fontFamily: subtitleStyle.fontFamily,
                                                    }}
                                                >
                                                    {node.text}
                                                    {!node.isFinal && <span className="inline-block w-2 h-4 ml-1 bg-green-400 animate-pulse align-middle" />}
                                                </p>
                                                <div className="mt-2">
                                                    <span className="text-[9px] font-mono font-bold text-muted-foreground/40 bg-white/5 px-2 py-0.5 rounded uppercase">
                                                        {new Date(node.timestamp).toLocaleTimeString([], { second: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                        <div ref={endRef} className="col-span-2 h-4" />
                    </div>
                ) : sonioxMode === 'diarization' && (
                    diarizationDivisionMode === 'language'
                        ? detectedLanguages.length > 0
                        : speakers.length > 0
                ) ? (
                    /* Diarization Split View - Conditional on division mode */
                    <div className="grid grid-cols-2 gap-4 h-full min-w-0 overflow-hidden">
                        {diarizationDivisionMode === 'language' ? (
                            /* Language-based Division */
                            detectedLanguages.slice(0, 2).map((language: string, idx: number) => {
                                const color = idx === 0
                                    ? { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', accent: 'bg-indigo-500', badge: 'bg-indigo-500/20' }
                                    : { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', accent: 'bg-emerald-500', badge: 'bg-emerald-500/20' };
                                const langTranscript = getTranscriptByLanguage(language);
                                const isActiveLang = langTranscript.length > 0 && !langTranscript[langTranscript.length - 1]?.isFinal;
                                const langInfo = getLanguageInfo(language);

                                return (
                                    <div key={language} className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
                                        <div className={`sticky top-0 z-10 p-3 mb-3 rounded-xl border ${color.bg} ${color.border} backdrop-blur-sm`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">{langInfo.flag}</span>
                                                    <span className={`font-bold ${color.text}`}>{langInfo.label}</span>
                                                    {isActiveLang && (
                                                        <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color.badge} ${color.text}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${color.accent} animate-pulse`} />
                                                            Hablando
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`text-xs font-mono ${color.text} opacity-70`}>{langTranscript.length} msgs</span>
                                            </div>
                                        </div>
                                        <div ref={idx === 0 ? speaker1Ref : speaker2Ref} className="flex-1 overflow-y-auto scrollbar-hide pr-1 min-w-0">
                                            <div className="flex flex-col justify-end min-h-full min-w-0">
                                                {langTranscript.map((node: TranscriptionNode, index: number) => (
                                                    <div key={node.id || index} className="mb-2 w-full" style={{ minWidth: 0 }}>
                                                        <div className={`diarization-message relative p-3 rounded-lg border transition-all duration-200 w-full ${node.isFinal ? `${color.bg} ${color.border}` : 'bg-white/5 border-white/10'}`}>
                                                            <p className={`text-wrap-force leading-snug text-sm font-medium w-full ${node.isFinal ? '' : 'opacity-60'}`}
                                                                style={{
                                                                    color: subtitleStyle.color,
                                                                    fontFamily: subtitleStyle.fontFamily,
                                                                    whiteSpace: 'pre-wrap',
                                                                    overflowWrap: 'anywhere',
                                                                    wordBreak: 'break-all',
                                                                    minWidth: 0
                                                                }}>
                                                                {node.text}
                                                                {!node.isFinal && <span className={`inline-block w-1.5 h-3 ml-1 ${color.accent} animate-pulse align-middle rounded-sm`} />}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div ref={idx === 0 ? speaker1EndRef : speaker2EndRef} className="h-2" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            /* Speaker-based Division */
                            speakers.slice(0, 2).map((speakerId: number, idx: number) => {
                                const color = idx === 0
                                    ? { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', accent: 'bg-indigo-500', badge: 'bg-indigo-500/20' }
                                    : { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', accent: 'bg-emerald-500', badge: 'bg-emerald-500/20' };
                                const speakerTranscript = getTranscriptBySpeaker(speakerId);
                                const isActiveSpeaker = speakerTranscript.length > 0 && !speakerTranscript[speakerTranscript.length - 1]?.isFinal;
                                const speakerLabel = idx === 0 ? 'Agente' : 'Cliente';
                                const speakerIcon = idx === 0 ? '🎧' : '📞';

                                return (
                                    <div key={speakerId} className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
                                        <div className={`sticky top-0 z-10 p-3 mb-3 rounded-xl border ${color.bg} ${color.border} backdrop-blur-sm`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">{speakerIcon}</span>
                                                    <span className={`font-bold ${color.text}`}>{speakerLabel}</span>
                                                    {isActiveSpeaker && (
                                                        <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color.badge} ${color.text}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${color.accent} animate-pulse`} />
                                                            Hablando
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`text-xs font-mono ${color.text} opacity-70`}>{speakerTranscript.length} msgs</span>
                                            </div>
                                        </div>
                                        <div ref={idx === 0 ? speaker1Ref : speaker2Ref} className="flex-1 overflow-y-auto scrollbar-hide pr-1 min-w-0">
                                            <div className="flex flex-col justify-end min-h-full min-w-0">
                                                {speakerTranscript.map((node: TranscriptionNode, index: number) => (
                                                    <div key={node.id || index} className="mb-2 w-full" style={{ minWidth: 0 }}>
                                                        <div className={`diarization-message relative p-3 rounded-lg border transition-all duration-200 w-full ${node.isFinal ? `${color.bg} ${color.border}` : 'bg-white/5 border-white/10'}`}>
                                                            <p className={`text-wrap-force leading-snug text-sm font-medium w-full ${node.isFinal ? '' : 'opacity-60'}`}
                                                                style={{
                                                                    color: subtitleStyle.color,
                                                                    fontFamily: subtitleStyle.fontFamily,
                                                                    whiteSpace: 'pre-wrap',
                                                                    overflowWrap: 'anywhere',
                                                                    wordBreak: 'break-all',
                                                                    minWidth: 0
                                                                }}>
                                                                {node.text}
                                                                {!node.isFinal && <span className={`inline-block w-1.5 h-3 ml-1 ${color.accent} animate-pulse align-middle rounded-sm`} />}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div ref={idx === 0 ? speaker1EndRef : speaker2EndRef} className="h-2" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    /* Standard View */
                    <div className="min-h-full flex flex-col justify-end pb-4">
                        <AnimatePresence mode="popLayout" initial={false}>
                            {transcript.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="flex flex-col items-center justify-center py-20 text-center space-y-6"
                                >
                                    <div className="relative group cursor-pointer" onClick={() => setStreaming(true)}>
                                        <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500" />
                                        <div className="relative w-28 h-28 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-300">
                                            <Mic size={40} className="text-indigo-400" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 max-w-sm">
                                        <h2 className="text-3xl font-bold text-foreground">
                                            Start Speaking
                                        </h2>
                                        <p className="text-muted-foreground">
                                            Click the microphone to begin real-time analysis.
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {transcript.map((node, index) => renderTranscriptNode(node, index))}
                        </AnimatePresence>
                        <div ref={endRef} className="h-4" />
                    </div>
                )}
            </main>

            {/* 3. Bottom Control Dock */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-6">
                <div className="flex items-center justify-center gap-6 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl ring-1 ring-white/5">

                    {/* Menu Button with Dropdown */}
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl w-12 h-12"
                            onClick={() => setShowMenu(!showMenu)}
                        >
                            {showMenu ? <X size={20} /> : <Terminal size={20} />}
                        </Button>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {showMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full left-0 mb-2 w-48 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                                >
                                    <button
                                        onClick={handleExport}
                                        disabled={transcript.length === 0}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Download size={16} />
                                        Exportar Texto
                                    </button>
                                    <button
                                        onClick={() => { downloadDebugLogs(); setShowMenu(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-amber-400 hover:bg-white/10 transition-colors"
                                    >
                                        <Bug size={16} />
                                        Descargar Logs Debug
                                    </button>
                                    <button
                                        onClick={handleClear}
                                        disabled={transcript.length === 0}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 size={16} />
                                        Limpiar Todo
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <Button
                        size="xl"
                        className={`relative w-20 h-20 rounded-2xl shadow-xl transition-all duration-300 ring-4 ring-black ${isStreaming
                            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/40'
                            : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/40'
                            } ${!hasPermission ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => setStreaming(!isStreaming)}
                        disabled={!hasPermission}
                    >
                        {isStreaming ? (
                            <div className="w-8 h-8 bg-white rounded-lg animate-[spin_3s_linear_infinite]" />
                        ) : (
                            <Mic className="w-8 h-8 text-white" />
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl w-12 h-12"
                        onClick={openSettings}
                    >
                        <Settings size={20} />
                    </Button>
                </div>
            </div>
        </div>
    );
};
