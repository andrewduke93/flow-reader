
import React, { useState, useEffect } from 'react';
import { Book, ReaderSettings, AppView, BookFolder } from './types';
import { DEFAULT_SETTINGS, INITIAL_BOOKS } from './constants';
import { LibraryView } from './components/LibraryView';
import { ReaderView } from './components/ReaderView';
import { NoteModal } from './components/NoteModal';
import { GutenbergModal } from './components/GutenbergModal';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LIBRARY);
  
  // Load books from local storage or fallback to initial
  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const saved = localStorage.getItem('flow_books');
      return saved ? JSON.parse(saved) : INITIAL_BOOKS;
    } catch (e) {
      console.error('Failed to load books:', e);
      return INITIAL_BOOKS;
    }
  });

  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  
  // Load settings from local storage or fallback to default
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    try {
      const saved = localStorage.getItem('flow_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch (e) {
      console.error('Failed to load settings:', e);
      return DEFAULT_SETTINGS;
    }
  });
  
  // Modals state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isGutenbergModalOpen, setIsGutenbergModalOpen] = useState(false);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('flow_books', JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem('flow_settings', JSON.stringify(settings));
  }, [settings]);

  const handleSelectBook = (book: Book) => {
    setCurrentBookId(book.id);
    // Update last read timestamp
    setBooks(prev => prev.map(b => b.id === book.id ? { ...b, lastRead: Date.now() } : b));
    setView(AppView.READER);
  };

  const handleUpdateProgress = (bookId: string, progress: number) => {
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, progress } : b));
  };

  const handleCreateNote = (title: string, content: string) => {
    const newBook: Book = {
      id: uuidv4(),
      title: title,
      author: 'Note',
      content: content,
      wordCount: content.split(/\s+/).length,
      progress: 0,
      lastRead: Date.now(),
      isGenerated: true,
      // No coverUrl provided, triggered GeneratedCover fallback
      folder: 'notes'
    };

    setBooks(prev => [newBook, ...prev]);
    handleSelectBook(newBook);
  };

  const handleImportBook = (book: Book) => {
    // Ensure imported books go to library by default
    const bookWithFolder = { ...book, folder: book.folder || 'library' };
    setBooks(prev => [bookWithFolder, ...prev]);
    handleSelectBook(bookWithFolder);
  };

  const handleMoveBook = (bookId: string, targetFolder: BookFolder) => {
    setBooks(prev => prev.map(book => {
        if (book.id !== bookId) return book;
        
        // Toggle logic: If clicking the same folder, move back to default
        if (book.folder === targetFolder) {
            // Determine default folder based on type
            const defaultFolder = book.isGenerated || book.author === 'Note' ? 'notes' : 'library';
            // If we are already in default (e.g. moving from library to library), do nothing (or stay)
            // But if we are in 'favorites' and click 'favorites', we go back to default.
            return { ...book, folder: defaultFolder };
        }
        
        return { ...book, folder: targetFolder };
    }));
  };

  const handleDeleteBook = (bookId: string) => {
      setBooks(prev => prev.filter(b => b.id !== bookId));
      if (currentBookId === bookId) {
          setCurrentBookId(null);
          setView(AppView.LIBRARY);
      }
  };

  const currentBook = books.find(b => b.id === currentBookId);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${settings.theme === 'light' ? 'bg-[#F5F5F7] text-gray-900' : settings.theme === 'sepia' ? 'bg-[#F4ECD8] text-[#5b4636]' : 'bg-background text-text'}`}>
      {view === AppView.LIBRARY && (
        <LibraryView 
          books={books} 
          onSelectBook={handleSelectBook}
          onCreateNoteClick={() => setIsNoteModalOpen(true)}
          onImportBook={handleImportBook}
          onOpenGutenberg={() => setIsGutenbergModalOpen(true)}
          onMoveBook={handleMoveBook}
          onDeleteBook={handleDeleteBook}
        />
      )}

      {view === AppView.READER && currentBook && (
        <ReaderView 
          book={currentBook}
          settings={settings}
          onBack={() => setView(AppView.LIBRARY)}
          onUpdateProgress={handleUpdateProgress}
          onUpdateSettings={setSettings}
        />
      )}

      <NoteModal 
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onCreate={handleCreateNote}
      />

      <GutenbergModal 
        isOpen={isGutenbergModalOpen}
        onClose={() => setIsGutenbergModalOpen(false)}
        onImport={handleImportBook}
      />
    </div>
  );
};

export default App;
