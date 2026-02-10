
import { useState, useEffect, useRef, useCallback } from 'react';

// --- Constants for Regex (Compile once) ---
const PUNCTUATION_CLEANUP = /[—–]/g; // Normalize dashes
const PUNCTUATION_PADDING = /([—–…])/g; // Pad distinct punctuation tokens
const WHITESPACE_SPLIT = /\s+/;
const STRIP_PUNCTUATION = /[.,!?;:"'()«»]/g;
const STRONG_TERMINATORS = /[.?!]+["']?$/;
const PAUSE_DELIMITERS = /[,:;]+["']?$/;
const MINOR_BREAKS = /[)"]$/;
const NUMERIC_CHECK = /\d/;

// --- Helpers ---

export const cleanText = (text: string): string => {
  if (!text) return "";
  // Minimal cleanup to normalize exotic dashes to standard em/en dashes
  return text.replace(PUNCTUATION_CLEANUP, (match) => match === '—' ? '—' : '–');
};

export const tokenize = (text: string): string[] => {
  if (!text) return [];
  
  // 1. Normalize & Flatten newlines (fastest way for huge strings)
  // We use a specific regex to pad punctuation that needs to be its own token.
  // We avoid multiple .replace() calls on the full string where possible.
  
  const processed = text
    .replace(/\n/g, ' ') 
    .replace(PUNCTUATION_PADDING, ' $1 '); // Pad dashes/ellipses

  // 2. Split and filter
  // This is the heavy lifting for 500k+ word books.
  const rawTokens = processed.split(WHITESPACE_SPLIT);
  
  const tokens: string[] = [];
  const len = rawTokens.length;
  
  // Manual loop is often faster than .filter(Boolean) for massive arrays
  for (let i = 0; i < len; i++) {
    if (rawTokens[i].length > 0) {
      tokens.push(rawTokens[i]);
    }
  }
  
  return tokens;
};

export const calculateDelay = (word: string, wpm: number): number => {
  const baseDelay = 60000 / wpm;
  
  // Clean word for length calculation
  const cleanWord = word.replace(STRIP_PUNCTUATION, '');
  const len = cleanWord.length;

  // 1. Length Factor
  let lengthFactor = 1.0;
  if (len < 2) lengthFactor = 0.6;
  else if (len < 4) lengthFactor = 0.85;
  else if (len < 9) lengthFactor = 1.0;
  else if (len < 14) lengthFactor = 1.2;
  else lengthFactor = 1.5;

  // 2. Punctuation Factor
  let punctuationFactor = 1.0;
  
  if (STRONG_TERMINATORS.test(word)) {
    punctuationFactor = 2.8; 
  } else if (PAUSE_DELIMITERS.test(word) || word === '—' || word === '–') {
    punctuationFactor = 2.0;
  } else if (MINOR_BREAKS.test(word) || word === '…') {
    punctuationFactor = 1.4;
  }

  // 3. Complexity
  if (NUMERIC_CHECK.test(word)) {
      lengthFactor *= 1.3;
  }

  const totalDelay = baseDelay * lengthFactor * punctuationFactor;
  return Math.min(Math.max(totalDelay, 50), 3000);
};

export const getORPIndex = (word: string): number => {
  const match = word.match(/^([«"'(\[\{]*)(.*?)([.,!?;:»"')\]\}]*)$/);
  
  if (!match) return Math.floor(word.length * 0.3);

  const prefix = match[1] || '';
  const core = match[2] || '';
  
  const len = core.length;
  if (len === 0) return 0;

  const orp = Math.floor(len * 0.3);
  return prefix.length + orp;
};

// --- Hook ---

interface UseRSVPProps {
  content?: string; // Optional if words provided
  words?: string[]; // Pre-calculated tokens (Preferred for performance)
  wpm: number;
  initialIndex?: number;
  onComplete?: () => void;
  onProgress?: (index: number) => void;
}

export const useRSVP = ({ content, words: inputWords, wpm, initialIndex = 0, onComplete, onProgress }: UseRSVPProps) => {
  const [words, setWords] = useState<string[]>(inputWords || []);
  const [index, setIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const timerRef = useRef<number | null>(null);

  // Parse content if words aren't provided directly
  useEffect(() => {
    if (inputWords) {
      setWords(inputWords);
    } else if (content) {
      setWords(tokenize(content));
    }
  }, [content, inputWords]);

  // Sync initial index if it changes externally (and isn't just natural progression)
  // We use a ref to track if the update is internal or external to avoid loops
  const isInternalUpdate = useRef(false);
  useEffect(() => {
    if (!isInternalUpdate.current) {
        setIndex(initialIndex);
    }
    isInternalUpdate.current = false;
  }, [initialIndex]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const tick = useCallback(() => {
    setIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      
      // Notify progress
      if (onProgress) {
          isInternalUpdate.current = true;
          onProgress(nextIndex);
      }

      if (nextIndex >= words.length) {
        stop();
        if (onComplete) onComplete();
        return prevIndex;
      }
      return nextIndex;
    });
  }, [words.length, stop, onComplete, onProgress]);

  useEffect(() => {
    if (isPlaying && index < words.length) {
      const currentWord = words[index];
      const delay = calculateDelay(currentWord || '', wpm);
      
      timerRef.current = window.setTimeout(() => {
        tick();
      }, delay);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, index, words, tick, wpm]); 

  const togglePlay = () => {
    if (index >= words.length - 1) {
      setIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const seek = (newIndex: number) => {
    const clamped = Math.max(0, Math.min(newIndex, words.length - 1));
    setIndex(clamped);
    isInternalUpdate.current = true;
    if (onProgress) onProgress(clamped);
  };

  return {
    words,
    index,
    currentWord: words[index] || '',
    isPlaying,
    togglePlay,
    stop,
    seek
  };
};
