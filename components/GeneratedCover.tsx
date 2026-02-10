
import React, { useState, useEffect, useMemo } from 'react';

interface GeneratedCoverProps {
  title: string;
  author: string;
  customCoverUrl?: string;
  className?: string;
}

export const GeneratedCover: React.FC<GeneratedCoverProps> = ({ 
  title, 
  author, 
  customCoverUrl,
  className = "" 
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(customCoverUrl || null);
  const [hasError, setHasError] = useState(false);

  // Sync state with props
  useEffect(() => {
    setImgSrc(customCoverUrl || null);
    setHasError(false);
  }, [customCoverUrl, title]);

  // Active Internet Search Logic (Google Books)
  useEffect(() => {
    if (customCoverUrl) return;
    if (!title || title === 'Untitled Note' || author === 'Note') {
        setHasError(true);
        return;
    }

    let isMounted = true;
    const searchCover = async () => {
        try {
            const cleanTitle = title.replace(/\(.*?\)/g, '').trim();
            const cleanAuthor = (author === 'Unknown Author' || author === 'Flow Team' || author === 'Unknown') ? '' : author;
            const q = `intitle:${encodeURIComponent(cleanTitle)}${cleanAuthor ? `+inauthor:${encodeURIComponent(cleanAuthor)}` : ''}`;
            const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&printType=books`);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            const thumb = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;

            if (isMounted) {
                if (thumb) {
                    setImgSrc(thumb.replace('http://', 'https://'));
                    setHasError(false);
                } else {
                    setHasError(true);
                }
            }
        } catch (e) {
            if (isMounted) setHasError(true);
        }
    };
    const timeoutId = setTimeout(searchCover, 500);
    return () => { isMounted = false; clearTimeout(timeoutId); };
  }, [customCoverUrl, title, author]);

  // --- DETERMINISTIC DESIGN GENERATION ---
  const design = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // 1. Color Palette (Sophisticated/Muted)
    const hue = Math.abs(hash % 360);
    // Lower saturation for a more premium/print look
    const sat = 20 + (Math.abs(hash >> 2) % 40); // 20-60%
    const lit = 15 + (Math.abs(hash >> 4) % 20); // 15-35% (Dark backgrounds)
    
    const bg = `hsl(${hue}, ${sat}%, ${lit}%)`;
    const textCol = `hsl(${hue}, 10%, 90%)`;
    const accentCol = `hsla(${(hue + 45) % 360}, ${sat + 20}%, ${lit + 30}%, 0.2)`;

    // 2. Archetypes (Layout & Typography)
    // Updated with much smaller fonts for dense grids
    const layouts = [
        {   // 0: Swiss (Top Left, Sans, Bold, Uppercase)
            name: 'swiss',
            container: 'items-start justify-start p-2',
            titleFont: 'font-sans font-black uppercase tracking-wider text-[7px] leading-tight',
            authorFont: 'font-sans font-medium uppercase tracking-widest text-[5px] opacity-70 mt-1',
            textAlign: 'text-left',
            shape: 'circle'
        },
        {   // 1: Editorial (Center, Serif, Italic)
            name: 'editorial',
            container: 'items-center justify-center p-2',
            titleFont: 'font-serif italic font-medium text-[8px] leading-snug',
            authorFont: 'font-sans text-[5px] uppercase tracking-widest opacity-60 mt-2 border-t border-white/20 pt-0.5',
            textAlign: 'text-center',
            shape: 'rect'
        },
        {   // 2: Technical (Bottom Left, Mono)
            name: 'tech',
            container: 'items-start justify-end p-2',
            titleFont: 'font-mono font-bold text-[6px] uppercase tracking-tight leading-none',
            authorFont: 'font-mono text-[5px] opacity-60 mt-1',
            textAlign: 'text-left',
            shape: 'grid'
        },
        {   // 3: Modern (Top Right, Sans)
            name: 'modern',
            container: 'items-end justify-start p-2',
            titleFont: 'font-sans font-bold text-[8px] leading-none tracking-wide',
            authorFont: 'font-sans text-[5px] opacity-60 mt-1',
            textAlign: 'text-right',
            shape: 'bar'
        }
    ];

    const layoutIndex = Math.abs(hash >> 3) % 4;
    const selectedLayout = layouts[layoutIndex];

    // 3. Shape Properties
    const shapePos = Math.abs(hash >> 5) % 100;
    const shapeScale = 0.5 + ((Math.abs(hash >> 6) % 100) / 100); // 0.5 - 1.5

    return { bg, textCol, accentCol, layout: selectedLayout, shapePos, shapeScale };
  }, [title]);

  if (imgSrc && !hasError) {
      return (
        <div className={`relative overflow-hidden bg-surface ${className}`}>
             <img 
                src={imgSrc} 
                onError={() => setHasError(true)} 
                className="w-full h-full object-cover transition-opacity duration-500 animate-in fade-in" 
                alt={`Cover for ${title}`} 
                loading="lazy"
            />
        </div>
      );
  }

  return (
    <div 
        className={`w-full h-full flex flex-col relative overflow-hidden select-none ${className} ${design.layout.container}`} 
        style={{ background: design.bg, color: design.textCol }}
    >
        {/* --- Abstract Background Elements --- */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Swiss Circle */}
            {design.layout.shape === 'circle' && (
                <div 
                    className="absolute rounded-full mix-blend-overlay"
                    style={{
                        background: design.accentCol,
                        width: '150%',
                        paddingBottom: '150%',
                        top: `${design.shapePos - 50}%`,
                        left: `${design.shapePos - 50}%`,
                        transform: `scale(${design.shapeScale})`
                    }}
                />
            )}
            {/* Editorial Rect */}
            {design.layout.shape === 'rect' && (
                <div 
                    className="absolute mix-blend-soft-light"
                    style={{
                        border: `2px solid ${design.accentCol}`,
                        width: '80%',
                        height: '80%',
                        top: '10%',
                        left: '10%',
                        transform: `rotate(${design.shapePos}deg)`
                    }}
                />
            )}
            {/* Tech Grid */}
            {design.layout.shape === 'grid' && (
                 <div 
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `radial-gradient(${design.accentCol} 1px, transparent 1px)`,
                        backgroundSize: '8px 8px'
                    }}
                 />
            )}
            {/* Modern Bar */}
            {design.layout.shape === 'bar' && (
                <div 
                    className="absolute w-full mix-blend-overlay"
                    style={{
                        background: design.accentCol,
                        height: '40%',
                        bottom: 0,
                        transform: `skewY(-${design.shapePos / 5}deg)`
                    }}
                />
            )}
            
            {/* Noise Texture */}
            <div 
                className="absolute inset-0 opacity-[0.15] mix-blend-overlay" 
                style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
                }}
            />
        </div>

        {/* --- Text Layer --- */}
        <div className={`relative z-10 w-full ${design.layout.textAlign}`}>
            <div className={`${design.layout.titleFont} drop-shadow-sm line-clamp-4 break-words`}>
                {title}
            </div>
            <div className={`${design.layout.authorFont} line-clamp-1`}>
                {author}
            </div>
        </div>
    </div>
  );
};
