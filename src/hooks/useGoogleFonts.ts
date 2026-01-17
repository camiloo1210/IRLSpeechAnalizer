import { useState, useEffect } from 'react';

export interface GoogleFont {
    family: string;
    category: string;
    variants: string[];
}

// Cache for loaded fonts
const loadedFonts = new Set<string>();

// Curated list of highly readable fonts - no handwriting/cursive
const FALLBACK_FONTS: GoogleFont[] = [
    // === DISPLAY / IMPACT (Bold, clean, great for subtitles) ===
    { family: 'Bebas Neue', category: 'display', variants: ['400'] },
    { family: 'Oswald', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Anton', category: 'sans-serif', variants: ['400'] },
    { family: 'Archivo Black', category: 'sans-serif', variants: ['400'] },
    { family: 'Teko', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Barlow Condensed', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Russo One', category: 'sans-serif', variants: ['400'] },
    { family: 'Righteous', category: 'display', variants: ['400'] },
    { family: 'Staatliches', category: 'display', variants: ['400'] },
    { family: 'Bungee', category: 'display', variants: ['400'] },

    // === MODERN SANS-SERIF (Clean, versatile) ===
    { family: 'Inter', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Roboto', category: 'sans-serif', variants: ['400', '500', '700'] },
    { family: 'Open Sans', category: 'sans-serif', variants: ['400', '600', '700'] },
    { family: 'Lato', category: 'sans-serif', variants: ['400', '700'] },
    { family: 'Montserrat', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Poppins', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Outfit', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Nunito', category: 'sans-serif', variants: ['400', '600', '700'] },
    { family: 'Raleway', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Work Sans', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Rubik', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Quicksand', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Manrope', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'DM Sans', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Source Sans 3', category: 'sans-serif', variants: ['400', '600', '700'] },
    { family: 'Noto Sans', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Ubuntu', category: 'sans-serif', variants: ['400', '500', '700'] },
    { family: 'Mulish', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Karla', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Cabin', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Overpass', category: 'sans-serif', variants: ['400', '600', '700'] },

    // === GEOMETRIC SANS (Sharp, modern) ===
    { family: 'Space Grotesk', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Lexend', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Exo 2', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Orbitron', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Rajdhani', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Chakra Petch', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Audiowide', category: 'display', variants: ['400'] },
    { family: 'Play', category: 'sans-serif', variants: ['400', '700'] },
    { family: 'Electrolize', category: 'sans-serif', variants: ['400'] },
    { family: 'Oxanium', category: 'display', variants: ['400', '500', '600', '700'] },

    // === CONDENSED (Space-efficient, impactful) ===
    { family: 'Roboto Condensed', category: 'sans-serif', variants: ['400', '700'] },
    { family: 'PT Sans Narrow', category: 'sans-serif', variants: ['400', '700'] },
    { family: 'Saira Condensed', category: 'sans-serif', variants: ['400', '500', '600', '700'] },
    { family: 'Fjalla One', category: 'sans-serif', variants: ['400'] },
    { family: 'Pathway Extreme', category: 'sans-serif', variants: ['400', '500', '600', '700'] },

    // === MONOSPACE (Technical, gaming) ===
    { family: 'JetBrains Mono', category: 'monospace', variants: ['400', '500', '600'] },
    { family: 'Fira Code', category: 'monospace', variants: ['400', '500', '600'] },
    { family: 'Roboto Mono', category: 'monospace', variants: ['400', '500'] },
    { family: 'Source Code Pro', category: 'monospace', variants: ['400', '500', '600', '700'] },
    { family: 'IBM Plex Mono', category: 'monospace', variants: ['400', '500', '600', '700'] },
    { family: 'Space Mono', category: 'monospace', variants: ['400', '700'] },

    // === READABLE SERIF (Professional, classic) ===
    { family: 'Merriweather', category: 'serif', variants: ['400', '700'] },
    { family: 'Playfair Display', category: 'serif', variants: ['400', '500', '600', '700'] },
    { family: 'Lora', category: 'serif', variants: ['400', '500', '600', '700'] },
    { family: 'PT Serif', category: 'serif', variants: ['400', '700'] },
    { family: 'Roboto Slab', category: 'serif', variants: ['400', '500', '600', '700'] },
];

export const loadGoogleFont = (fontFamily: string) => {
    if (loadedFonts.has(fontFamily)) return;

    // Create link element to load the font
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    loadedFonts.add(fontFamily);
};

export const useGoogleFonts = () => {
    const [fonts, setFonts] = useState<GoogleFont[]>(FALLBACK_FONTS);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFonts = async () => {
            try {
                // Try to use a free Google Fonts API endpoint (no key required for webfonts list)
                // Using a public proxy or direct API call
                const response = await fetch(
                    'https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity'
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch fonts');
                }

                const data = await response.json();
                const fontList: GoogleFont[] = data.items.map((item: any) => ({
                    family: item.family,
                    category: item.category,
                    variants: item.variants,
                }));

                setFonts(fontList);
                setError(null);
            } catch (err) {
                console.warn('[useGoogleFonts] API failed, using fallback fonts:', err);
                setError('Using offline font list');
                // Keep using fallback fonts
            } finally {
                setIsLoading(false);
            }
        };

        fetchFonts();
    }, []);

    return { fonts, isLoading, error, loadFont: loadGoogleFont };
};
