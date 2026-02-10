
import { Book, ReaderSettings } from './types';

export const DEFAULT_SETTINGS: ReaderSettings = {
  wpm: 225,
  fontSize: 'lg',
  theme: 'dark',
  showProgressBar: true,
};

export const INITIAL_BOOKS: Book[] = [
  {
    id: '1',
    title: 'The Art of Focus',
    author: 'Flow Team',
    content: `Flow is a distraction-free, speed-reading-first reader that turns long-form text into a calm, highly-focused experience. 
    It is designed for busy readers who want to consume books quickly, casual readers who prefer clean, tactile reading without UI noise, and accessibility-focused users who benefit from single-word presentation.
    The core value propositions are instant comprehension using ORP-aligned RSVP with grammar-aware pacing, direct manipulability, and a calm UI.
    We believe in visible state, reliable controls, and speed over cleverness.`,
    wordCount: 78,
    progress: 0,
    lastRead: Date.now(),
    // coverUrl intentionally omitted to trigger GeneratedCover
    folder: 'library'
  }
];

export const FONT_SIZES = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-4xl',
  xl: 'text-6xl'
};

export const SCROLL_FONT_SIZES = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl'
};

export const THEMES = {
  dark: {
    bg: 'bg-background',
    text: 'text-text',
    muted: 'text-textMuted',
    surface: 'bg-surface'
  },
  light: {
    bg: 'bg-[#F5F5F7]',
    text: 'text-gray-900',
    muted: 'text-gray-500',
    surface: 'bg-white'
  },
  sepia: {
    bg: 'bg-[#F4ECD8]',
    text: 'text-[#5b4636]',
    muted: 'text-[#8b7e72]',
    surface: 'bg-[#E9DFCC]'
  }
};
