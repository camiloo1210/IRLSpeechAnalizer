import { useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { useSettingsStore, FONT_SIZE_OPTIONS } from '../../store/settingsStore';
import { useAudioStream } from '../../hooks/useAudioStream';
import { Mic, Settings, Activity, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { useSoniox } from '../../hooks/useSoniox';
import { SettingsDialog } from '../Settings/SettingsDialog';

export const LiveStream = () => {
    // Main Store
    const transcript = useStore((state) => state.transcript);
    const isStreaming = useStore((state) => state.isStreaming);
    const isConnected = useStore((state) => state.isConnected);
    const setStreaming = useStore((state) => state.setStreaming);

    // Settings Store
    const { subtitleStyle, openSettings /* theme */ } = useSettingsStore();

    // Get subtitle font size class
    const fontSizeClass = FONT_SIZE_OPTIONS.find(s => s.value === subtitleStyle.fontSize)?.class || 'text-xl';

    // Hooks
    useSoniox();
    const { hasPermission } = useAudioStream();

    const endRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logic
    useEffect(() => {
        if (endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [transcript]);

    return (
        <div className="flex flex-col h-screen w-full bg-background text-foreground font-sans overflow-hidden selection:bg-indigo-500/30">
            {/* Settings Dialog */}
            <SettingsDialog />

            {/* Background Gradient Mesh */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/30 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/30 rounded-full blur-[120px]" />
            </div>

            {/* 1. Header */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between
                bg-background/80 backdrop-blur-md border-b border-white/5 shadow-sm">

                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                        <Activity size={20} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold tracking-tight text-foreground leading-none">
                            IRL Speech
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
            <main className="relative z-10 flex-1 pt-24 pb-48 px-4 md:px-0 w-full max-w-3xl mx-auto overflow-y-auto scrollbar-hide">
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

                        {transcript.map((node, index) => (
                            <motion.div
                                key={node.id || index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="group mb-6 pl-4 md:pl-0"
                            >
                                <div className={`relative p-5 rounded-2xl border transition-all duration-300 ${node.isFinal
                                    ? 'bg-secondary/40 border-white/5 hover:bg-secondary/60'
                                    : 'bg-indigo-500/10 border-indigo-500/20'
                                    }`}>
                                    {/* Apply custom subtitle styles */}
                                    <p
                                        className={`leading-relaxed font-medium tracking-wide ${fontSizeClass} ${node.isFinal ? '' : 'opacity-70'}`}
                                        style={{
                                            color: subtitleStyle.color,
                                            fontFamily: subtitleStyle.fontFamily,
                                        }}
                                    >
                                        {node.text}
                                        {!node.isFinal && <span className="inline-block w-2 h-5 ml-1 bg-indigo-400 animate-pulse align-middle" />}
                                    </p>

                                    <div className="mt-3 flex items-center gap-3">
                                        <span className="text-[10px] font-mono font-bold text-muted-foreground/40 bg-white/5 px-2 py-0.5 rounded uppercase">
                                            {new Date(node.timestamp).toLocaleTimeString([], { second: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={endRef} className="h-4" />
                </div>
            </main>

            {/* 3. Bottom Control Dock */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-6">
                <div className="flex items-center justify-center gap-6 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl ring-1 ring-white/5">

                    <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl w-12 h-12">
                        <Terminal size={20} />
                    </Button>

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
