
export type BookFolder = 'library' | 'favorites' | 'read' | 'notes';

export interface Book {
  id: string;
  title: string;
  author: string;
  content: string; // Full text content
  coverUrl?: string;
  progress: number; // 0 to 1
  wordCount: number;
  lastRead: number; // Timestamp
  isGenerated?: boolean;
  folder: BookFolder;
}

export interface ReaderSettings {
  wpm: number;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  theme: 'dark' | 'light' | 'sepia'; // Simplified to dark for this demo primarily
  showProgressBar: boolean;
}

export interface RSVPState {
  currentWordIndex: number;
  isPlaying: boolean;
  content: string[]; // Tokenized words
}

export enum AppView {
  LIBRARY = 'LIBRARY',
  READER = 'READER'
}
