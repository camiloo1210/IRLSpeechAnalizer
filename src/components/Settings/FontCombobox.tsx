import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useGoogleFonts, loadGoogleFont } from '../../hooks/useGoogleFonts';
import type { GoogleFont } from '../../hooks/useGoogleFonts';

interface FontComboboxProps {
    value: string;
    onChange: (fontFamily: string) => void;
}

export const FontCombobox = ({ value, onChange }: FontComboboxProps) => {
    const { fonts, isLoading } = useGoogleFonts();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [hoveredFont, setHoveredFont] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter fonts based on search
    const filteredFonts = fonts.filter(font =>
        font.family.toLowerCase().includes(search.toLowerCase())
    );

    // Group fonts by category
    const groupedFonts = filteredFonts.reduce((acc, font) => {
        const category = font.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(font);
        return acc;
    }, {} as Record<string, GoogleFont[]>);

    // Load font when hovered for preview
    useEffect(() => {
        if (hoveredFont) {
            loadGoogleFont(hoveredFont);
        }
    }, [hoveredFont]);

    // Load selected font
    useEffect(() => {
        if (value) {
            loadGoogleFont(value);
        }
    }, [value]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when dropdown opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (fontFamily: string) => {
        onChange(fontFamily);
        setIsOpen(false);
        setSearch('');
    };

    const categoryLabels: Record<string, string> = {
        'sans-serif': 'Sans Serif',
        'serif': 'Serif',
        'display': 'Display',
        'handwriting': 'Handwriting',
        'monospace': 'Monospace',
        'other': 'Other',
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Selected Font Display / Trigger */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white hover:bg-zinc-700 transition-colors"
            >
                <span
                    className="truncate"
                    style={{ fontFamily: value }}
                >
                    {value || 'Select a font...'}
                </span>
                <ChevronDown size={16} className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    {/* Search Input */}
                    <div className="p-3 border-b border-white/10">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search fonts..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Font List */}
                    <div className="max-h-64 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 size={24} className="animate-spin text-indigo-400" />
                                <span className="ml-2 text-zinc-400">Loading fonts...</span>
                            </div>
                        ) : filteredFonts.length === 0 ? (
                            <div className="py-8 text-center text-zinc-500">
                                No fonts found for "{search}"
                            </div>
                        ) : (
                            Object.entries(groupedFonts).map(([category, categoryFonts]) => (
                                <div key={category}>
                                    <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-800/50 sticky top-0">
                                        {categoryLabels[category] || category} ({categoryFonts.length})
                                    </div>
                                    {categoryFonts.slice(0, 50).map((font) => (
                                        <button
                                            key={font.family}
                                            type="button"
                                            onClick={() => handleSelect(font.family)}
                                            onMouseEnter={() => setHoveredFont(font.family)}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${value === font.family
                                                ? 'bg-indigo-500/20 text-indigo-300'
                                                : 'text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <span
                                                className="truncate"
                                                style={{ fontFamily: font.family }}
                                            >
                                                {font.family}
                                            </span>
                                            {value === font.family && (
                                                <Check size={16} className="text-indigo-400 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer with count */}
                    <div className="px-3 py-2 border-t border-white/10 text-xs text-zinc-500 bg-zinc-800/50">
                        {filteredFonts.length} fonts available
                    </div>
                </div>
            )}
        </div>
    );
};
