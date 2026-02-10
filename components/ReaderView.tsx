
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRSVP, getORPIndex, cleanText, tokenize } from '../services/rsvpEngine';
import { Book, ReaderSettings } from '../types';
import { FONT_SIZES, SCROLL_FONT_SIZES, THEMES } from '../constants';
import { 
  Play, Pause, RotateCcw, 
  Type, Zap, BookOpen,
  Minus, Plus, Sun, Moon, Palette,
  ChevronLeft, Loader2, Settings2, Sliders
} from 'lucide-react';

interface ReaderViewProps {
  book: Book;
  settings: ReaderSettings;
  onBack: () => void;
  onUpdateProgress: (bookId: string, progress: number) => void;
  onUpdateSettings: (settings: ReaderSettings) => void;
  onToggleSettings?: () => void; 
}

interface ParagraphData {
  text: string;
  startIndex: number;
  wordCount: number;
  words: string[];
}

// --- Scroll Reader (Virtualization & Auto-Center) ---
const WINDOW_BUFFER = 40; 

const ScrollReader: React.FC<{
  paragraphs: ParagraphData[];
  currentIndex: number;
  onIndexUpdate: (index: number) => void;
  settings: ReaderSettings;
  theme: typeof THEMES['dark'];
  isPlaying: boolean;
}> = ({ paragraphs, currentIndex, onIndexUpdate, settings, theme, isPlaying }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const fontSizeClass = SCROLL_FONT_SIZES[settings.fontSize] || SCROLL_FONT_SIZES.lg;
  
  // Track auto-scrolling to prevent scroll events from hijacking index during animation
  const isAutoScrolling = useRef(false);
  const autoScrollTimeout = useRef<number | null>(null);

  const activeParagraphIndex = useMemo(() => {
    return paragraphs.findIndex(
      p => currentIndex >= p.startIndex && currentIndex < p.startIndex + p.wordCount
    );
  }, [currentIndex, paragraphs]);

  const anchorIndex = activeParagraphIndex === -1 ? 0 : activeParagraphIndex;
  const startIndex = Math.max(0, anchorIndex - WINDOW_BUFFER);
  const endIndex = Math.min(paragraphs.length, anchorIndex + WINDOW_BUFFER + 1);
  const visibleParagraphs = paragraphs.slice(startIndex, endIndex);

  // --- Aggressive Auto-Centering Logic ---
  useEffect(() => {
    const activeEl = document.getElementById('flow-active-token');
    
    if (activeEl && containerRef.current) {
        const container = containerRef.current;
        const rect = activeEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate deviation from vertical center
        const containerCenter = containerRect.top + (containerRect.height / 2);
        const elCenter = rect.top + (rect.height / 2);
        const delta = Math.abs(containerCenter - elCenter);
        
        // Threshold: If we drift more than 50px from center while playing, correction is needed.
        // If not playing, we rely on standard visibility checks (handled below/natively) to avoid being annoying.
        const shouldScroll = isPlaying ? delta > 50 : (rect.top < containerRect.top || rect.bottom > containerRect.bottom);

        if (shouldScroll) {
             isAutoScrolling.current = true;
             activeEl.scrollIntoView({ 
                 behavior: 'smooth', 
                 block: 'center',
                 inline: 'nearest'
             });
             
             // Lock 'manual' scroll detection for a moment to prevent fighting
             if (autoScrollTimeout.current) clearTimeout(autoScrollTimeout.current);
             autoScrollTimeout.current = window.setTimeout(() => {
                 isAutoScrolling.current = false;
             }, 600); 
        }
    } else if (activeParagraphIndex !== -1 && !activeEl) {
        // Fallback: If no word is highlighted (rare), ensure paragraph is visible
        const el = paragraphRefs.current[activeParagraphIndex];
        if (el && containerRef.current) {
            const rect = el.getBoundingClientRect();
            const containerRect = containerRef.current.getBoundingClientRect();
            const isVisible = (rect.top >= containerRect.top - 50 && rect.bottom <= containerRect.bottom + 50);
            if (!isVisible && !isAutoScrolling.current) {
                el.scrollIntoView({ behavior: 'auto', block: 'center' });
            }
        }
    }
  }, [currentIndex, isPlaying, activeParagraphIndex]); 

  const handleScroll = useCallback(() => {
    // CRITICAL: Ignore scroll updates if we are auto-scrolling or playing.
    // This allows the "Teleprompter" effect without the scroll event trying to reset the index to the top of the paragraph.
    if (isPlaying || isAutoScrolling.current || !containerRef.current) return;

    const container = containerRef.current;
    const viewCenter = container.scrollTop + (container.clientHeight / 2);
    let closestIndex = -1;
    let minDiff = Infinity;
    
    for (let i = startIndex; i < endIndex; i++) {
        const el = paragraphRefs.current[i];
        if (el) {
            const elCenter = el.offsetTop + (el.offsetHeight / 2);
            const diff = Math.abs(elCenter - viewCenter);
            if (diff < minDiff) { minDiff = diff; closestIndex = i; }
        }
    }
    
    if (closestIndex !== -1 && closestIndex !== activeParagraphIndex) {
        onIndexUpdate(paragraphs[closestIndex].startIndex);
    }
  }, [paragraphs, startIndex, endIndex, activeParagraphIndex, onIndexUpdate, isPlaying]);

  return (
    <div 
        ref={containerRef} onScroll={handleScroll}
        className={`h-full w-full overflow-y-auto px-6 md:px-0 py-32 hide-scrollbar ${theme.bg} ${theme.text} transition-colors duration-500`}
        style={{ overflowAnchor: 'auto' }}
    >
      <div className="max-w-2xl mx-auto min-h-screen flex flex-col justify-center">
        {visibleParagraphs.map((p, idx) => {
          const trueIndex = startIndex + idx;
          const isActiveParagraph = trueIndex === activeParagraphIndex;
          return (
            <p 
              key={trueIndex} ref={el => { paragraphRefs.current[trueIndex] = el }}
              className={`font-serif leading-relaxed mb-10 transition-opacity duration-500 ease-out antialiased ${fontSizeClass} ${isActiveParagraph ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
              onClick={() => onIndexUpdate(p.startIndex)}
            >
              {isActiveParagraph ? (
                p.words.map((word, wIdx) => {
                  const globalIndex = p.startIndex + wIdx;
                  return (
                    <React.Fragment key={wIdx}>
                      <span 
                        id={globalIndex === currentIndex ? 'flow-active-token' : undefined}
                        onClick={(e) => { e.stopPropagation(); onIndexUpdate(globalIndex); }}
                        className={`cursor-pointer rounded-md py-0.5 transition-all duration-200 ${globalIndex === currentIndex ? 'bg-primary/20 text-primary font-bold px-1.5 -mx-1.5 scale-105 inline-block' : 'hover:text-primary/60'}`}>
                        {word}
                      </span>{' '}
                    </React.Fragment>
                  );
                })
              ) : <span className="cursor-pointer">{p.text}</span>}
            </p>
          );
        })}
        <div className="h-[50vh]" /> 
      </div>
    </div>
  );
};

// --- Main Component ---

export const ReaderView: React.FC<ReaderViewProps> = ({ book, settings, onBack, onUpdateProgress, onUpdateSettings }) => {
  const [viewMode, setViewMode] = useState<'rsvp' | 'scroll'>('rsvp');
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
  const [localWpm, setLocalWpm] = useState(settings.wpm);
  const [isParsing, setIsParsing] = useState(true);
  const [paragraphs, setParagraphs] = useState<ParagraphData[]>([]);
  const [allWords, setAllWords] = useState<string[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);

  useEffect(() => setLocalWpm(settings.wpm), [settings.wpm]);
  const uiTheme = THEMES.dark; 
  const readerTheme = THEMES[settings.theme] || THEMES.dark;

  useEffect(() => {
    setIsParsing(true);
    const timer = setTimeout(() => {
        const raw = cleanText(book.content);
        const chunks = raw.split('\n');
        let globalWordCount = 0;
        const parsedParagraphs: ParagraphData[] = [];
        const flatWords: string[] = [];
        chunks.forEach((chunk) => {
            const trimmed = chunk.trim();
            if (!trimmed) return;
            const tokens = tokenize(trimmed);
            if (tokens.length === 0) return;
            const normalizedText = tokens.join(' ');
            parsedParagraphs.push({ text: normalizedText, startIndex: globalWordCount, wordCount: tokens.length, words: tokens });
            for (let i = 0; i < tokens.length; i++) flatWords.push(tokens[i]);
            globalWordCount += tokens.length;
        });
        setParagraphs(parsedParagraphs);
        setAllWords(flatWords);
        const savedIdx = Math.floor(book.progress * flatWords.length) || 0;
        setInitialIndex(savedIdx);
        setIsParsing(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [book.id, book.content]);

  const lastProgressUpdate = useRef(Date.now());
  const handleProgressUpdate = useCallback((idx: number, total: number) => {
    const now = Date.now();
    if (now - lastProgressUpdate.current > 2000 || idx >= total - 1) {
        onUpdateProgress(book.id, idx / total);
        lastProgressUpdate.current = now;
    }
  }, [book.id, onUpdateProgress]);

  const { words, index, currentWord, isPlaying, togglePlay, stop, seek } = useRSVP({
    words: allWords, 
    wpm: localWpm, 
    initialIndex, 
    onProgress: (idx) => { 
        scrollIndexRef.current = idx; 
        if (allWords.length > 0) handleProgressUpdate(idx, allWords.length); 
    }
  });

  const scrollIndexRef = useRef(index);
  
  const handleToggleMode = () => {
    if (viewMode === 'rsvp') {
        stop(); 
        onUpdateProgress(book.id, index / words.length); 
        setViewMode('scroll');
    } else {
        seek(scrollIndexRef.current); 
        setViewMode('rsvp');
    }
  };

  const handleBack = () => { stop(); onUpdateProgress(book.id, index / words.length); onBack(); };
  
  const adjustWpm = (delta: number) => {
      const newWpm = Math.max(100, Math.min(1000, localWpm + delta));
      setLocalWpm(newWpm); 
      onUpdateSettings({...settings, wpm: newWpm});
  };
  
  const adjustFontSize = (size: 'sm' | 'md' | 'lg' | 'xl') => onUpdateSettings({...settings, fontSize: size});
  const cycleTheme = () => {
      const order: ('dark' | 'light' | 'sepia')[] = ['dark', 'light', 'sepia'];
      const nextIndex = (order.indexOf(settings.theme) + 1) % order.length;
      onUpdateSettings({...settings, theme: order[nextIndex]});
  };

  const progressPct = words.length > 0 ? (index / words.length) * 100 : 0;
  const minutesLeft = Math.ceil((words.length - index) / localWpm);
  const safeWord = currentWord || '';
  const orpIndex = getORPIndex(safeWord);
  const leftPart = safeWord.slice(0, orpIndex);
  const pivotChar = safeWord[orpIndex] || '';
  const rightPart = safeWord.slice(orpIndex + 1);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isParsing) return;
      if (e.code === 'Escape') handleBack();
      else if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.code === 'ArrowLeft') seek(index - 10);
      else if (e.code === 'ArrowRight') seek(index + 10);
      else if (e.code === 'ArrowUp') { e.preventDefault(); adjustWpm(25); }
      else if (e.code === 'ArrowDown') { e.preventDefault(); adjustWpm(-25); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seek, index, handleBack, viewMode, localWpm, isParsing]);

  // Design Tokens - Wide, Sophisticated Blocks
  const blockClass = (active: boolean = false) => `
    relative flex items-center justify-center 
    rounded-[20px] transition-all duration-300 ease-out active:scale-95 outline-none 
    border select-none
    ${active 
      ? 'bg-primary text-white border-primary shadow-[0_0_25px_rgba(187,134,252,0.3)]' 
      : `bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/10`
    }
  `;

  if (isParsing) {
      return (
          <div className={`h-[100dvh] w-full flex flex-col items-center justify-center bg-[#121212] text-white`}>
              <Loader2 className="animate-spin text-primary mb-4" size={48} strokeWidth={1.5} />
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">Initializing Flow</div>
          </div>
      );
  }

  return (
    <div className={`h-[100dvh] w-full flex flex-col overflow-hidden select-none bg-[#121212] text-white`}>
      
      {/* --- Top Navigation --- */}
      <div className="absolute top-0 left-0 right-0 z-30 px-6 py-8 flex items-start justify-between pointer-events-none">
          <button onClick={handleBack} className={`pointer-events-auto h-12 w-12 flex items-center justify-center rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl text-gray-300 hover:text-white hover:bg-black/60 transition-all active:scale-95`} aria-label="Back">
              <ChevronLeft size={24} strokeWidth={1.5} />
          </button>

          <div className={`pointer-events-auto px-6 py-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col items-end shadow-sm max-w-[60%]`}>
               <h1 className="text-[11px] font-bold tracking-widest uppercase opacity-90 truncate w-full text-right mb-0.5 text-white">{book.title}</h1>
               <div className={`text-[10px] font-mono text-gray-400 opacity-80`}>
                   {Math.floor(progressPct)}% · {minutesLeft} MIN
               </div>
          </div>
      </div>

      {/* --- Main Reading Area --- */}
      <div className={`flex-1 relative flex flex-col justify-center overflow-hidden transition-colors duration-500 ${readerTheme.bg} ${readerTheme.text}`}>
        {viewMode === 'scroll' ? (
             <ScrollReader 
                paragraphs={paragraphs} currentIndex={index} settings={settings} theme={readerTheme} isPlaying={isPlaying}
                onIndexUpdate={(newIdx) => { 
                    scrollIndexRef.current = newIdx; 
                    if (Math.abs(newIdx - index) > 5) seek(newIdx); 
                }}
             />
        ) : (
            <div className="relative w-full h-full flex flex-col items-center justify-center cursor-pointer" onClick={togglePlay}>
                <div className={`absolute top-0 bottom-0 left-[35%] w-px opacity-[0.05] ${settings.theme === 'light' ? 'bg-black' : 'bg-white'}`} />
                <div className={`absolute left-0 right-0 top-1/2 h-28 -mt-14 border-t border-b w-full opacity-[0.05] pointer-events-none ${settings.theme === 'light' ? 'border-black' : 'border-white'}`} />
                
                <div className={`font-serif tracking-wide leading-none flex items-center w-full ${FONT_SIZES[settings.fontSize]} z-10 relative h-28`}>
                  <div className={`text-right opacity-90 whitespace-nowrap overflow-visible`} style={{ width: 'calc(35% - 0.7ch)' }}>{leftPart}</div>
                  <div className="text-primary font-bold text-center flex-shrink-0 flex justify-center" style={{ width: '1.4ch' }}>
                     <span className="transform scale-110 origin-center block">{pivotChar}</span>
                  </div>
                  <div className={`text-left flex-1 opacity-90 whitespace-nowrap overflow-visible`}>{rightPart}</div>
                </div>
                
                {!isPlaying && (
                    <div className={`absolute mt-40 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse opacity-50`}>
                       <Play size={10} fill="currentColor" /> Tap to Resume
                    </div>
                )}
            </div>
        )}
      </div>

      {/* --- Sophisticated Control Deck (Tall & Wide) --- */}
      <div className={`w-full bg-[#1E1E1E] transition-colors duration-500 relative z-30 pb-safe border-t border-white/5`}>
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
            
            {/* 1. Scrubber */}
            <div 
                className="w-full h-2 rounded-full bg-white/10 cursor-pointer relative group hover:h-3 transition-all duration-300"
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    seek(Math.floor(((e.clientX - rect.left) / rect.width) * words.length));
                }}
            >
                <div className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-100 ease-linear shadow-[0_0_15px_rgba(187,134,252,0.4)]" style={{ width: `${progressPct}%` }} />
            </div>

            {/* 2. Main Transport Grid */}
            <div className="grid grid-cols-4 gap-4 h-28">
                 {/* Speed Down / Rewind */}
                 <div className="col-span-1 flex flex-col gap-3">
                     <button onClick={() => adjustWpm(-25)} className={`${blockClass(false)} flex-1`} title="Slower">
                        <Minus size={22} strokeWidth={2} />
                     </button>
                     <button onClick={() => seek(index - 50)} className={`${blockClass(false)} flex-1`} title="Rewind 50">
                        <RotateCcw size={18} strokeWidth={2} className="opacity-70" />
                     </button>
                 </div>

                 {/* PLAY */}
                 <button onClick={togglePlay} className={`col-span-2 ${blockClass(isPlaying)} text-center flex flex-col items-center justify-center gap-2 h-full`}>
                    {isPlaying ? <Pause size={40} fill="currentColor" strokeWidth={0} /> : <Play size={40} fill="currentColor" className="ml-1" strokeWidth={0} />}
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{isPlaying ? 'Flowing' : 'Paused'}</span>
                 </button>

                 {/* Speed Up / Forward */}
                 <div className="col-span-1 flex flex-col gap-3">
                     <button onClick={() => adjustWpm(25)} className={`${blockClass(false)} flex-1`} title="Faster">
                        <Plus size={22} strokeWidth={2} />
                     </button>
                     <div className={`${blockClass(false)} flex-1 flex-col gap-0.5`}>
                        <span className="text-sm font-bold font-mono tracking-tighter text-primary">{localWpm}</span>
                        <span className="text-[7px] font-bold uppercase tracking-widest opacity-40">WPM</span>
                     </div>
                 </div>
            </div>

            {/* 3. Utilities */}
            <div className="grid grid-cols-2 gap-4 h-16">
                 <button onClick={() => setShowAppearanceMenu(!showAppearanceMenu)} className={`${blockClass(showAppearanceMenu)} relative`}>
                    <Settings2 size={22} strokeWidth={1.5} className="mr-3" />
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">Display</span>
                    
                    {/* Floating Menu */}
                    {showAppearanceMenu && (
                         <div className={`absolute bottom-full left-0 mb-4 w-[240px] p-4 rounded-3xl shadow-2xl border border-white/10 bg-[#1A1A1A]/95 backdrop-blur-xl flex flex-col gap-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300`} onClick={e => e.stopPropagation()}>
                            <div className="grid grid-cols-4 gap-2 bg-white/5 rounded-2xl p-1.5">
                                {(['sm', 'md', 'lg', 'xl'] as const).map(s => (
                                    <button key={s} onClick={() => adjustFontSize(s)} className={`h-9 text-[10px] font-bold rounded-xl transition-all ${settings.fontSize === s ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Aa</button>
                                ))}
                            </div>
                            <div className="flex justify-between items-center px-2">
                                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Mode</span>
                                <button onClick={cycleTheme} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors">
                                    {settings.theme === 'light' ? <Sun size={14} strokeWidth={1.5} /> : settings.theme === 'dark' ? <Moon size={14} strokeWidth={1.5} /> : <Palette size={14} strokeWidth={1.5} />}
                                    <span className="text-[10px] font-bold uppercase">{settings.theme}</span>
                                </button>
                            </div>
                        </div>
                    )}
                 </button>

                 <button onClick={handleToggleMode} className={blockClass(false)}>
                    {viewMode === 'rsvp' ? (
                        <>
                            <Zap size={22} strokeWidth={1.5} className="mr-3 text-primary" />
                            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Flow</span>
                        </>
                    ) : (
                        <>
                            <BookOpen size={22} strokeWidth={1.5} className="mr-3" />
                            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Scroll</span>
                        </>
                    )}
                 </button>
            </div>
            
        </div>
      </div>
    </div>
  );
};
