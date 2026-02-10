
import React, { useState, useEffect } from 'react';
import { X, Search, Download, Loader2, IdCard, AlertCircle, Star, Book as BookIcon, ExternalLink } from 'lucide-react';
import { GutenbergBook, searchGutenberg, downloadGutenbergBook } from '../services/gutenbergService';
import { Book } from '../types';
import { parseEpub, createBookFromContent } from '../services/epubService';
import { GeneratedCover } from './GeneratedCover';

// --- Dense List Item ---
const GutenbergBookItem = ({ book, downloadingId, onDownload }: { book: GutenbergBook, downloadingId: number | null, onDownload: (book: GutenbergBook) => void }) => {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex gap-3 hover:border-primary/30 hover:bg-white/[0.04] transition-all duration-200 group h-24">
        {/* Compact Cover */}
        <div className="w-16 h-full bg-surface rounded-lg flex-shrink-0 overflow-hidden relative shadow-sm ring-1 ring-white/5">
            <GeneratedCover title={book.title} author={book.author} customCoverUrl={book.coverUrl} />
        </div>
        
        {/* Dense Content */}
        <div className="flex-1 flex flex-col min-w-0 justify-between py-0.5">
            <div>
                <h3 className="font-bold text-xs text-text leading-tight mb-0.5 line-clamp-2 group-hover:text-primary transition-colors" title={book.title}>{book.title}</h3>
                <p className="text-[10px] text-textMuted line-clamp-1 opacity-70 font-medium uppercase tracking-wide">{book.author}</p>
            </div>
            
            <div className="flex justify-between items-end">
                <div className="flex items-center gap-1 text-[9px] text-textMuted opacity-50 font-mono">
                    <Star size={8} fill="currentColor" />
                    <span>{book.downloads}</span>
                </div>
                <button 
                    onClick={() => onDownload(book)} 
                    disabled={downloadingId !== null} 
                    className="h-7 px-3 bg-white/5 hover:bg-primary hover:text-white text-textMuted rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                    {downloadingId === book.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} strokeWidth={2} />}
                </button>
            </div>
        </div>
    </div>
  );
};

interface GutenbergModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (book: Book) => void;
}

export const GutenbergModal: React.FC<GutenbergModalProps> = ({ isOpen, onClose, onImport }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GutenbergBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => { if (isOpen && results.length === 0) handleSearch(''); }, [isOpen]);

  const handleSearch = async (q: string) => {
    setIsLoading(true); setError(null);
    try { const books = await searchGutenberg(q); setResults(books); } 
    catch (e: any) { setError(e.message || 'Connection error.'); } 
    finally { setIsLoading(false); }
  };

  const handleDownload = async (book: GutenbergBook) => {
    if (downloadingId) return;
    setDownloadingId(book.id);
    try {
      const { blob, type } = await downloadGutenbergBook(book);
      let parsedBook: Book;
      if (type === 'epub') parsedBook = await parseEpub(blob);
      else { const text = await blob.text(); parsedBook = createBookFromContent(text, book.title, book.author, type === 'html'); }
      if (!parsedBook.coverUrl && book.coverUrl) parsedBook.coverUrl = book.coverUrl;
      if (parsedBook.title === 'Untitled Book') parsedBook.title = book.title;
      if (parsedBook.author === 'Unknown Author') parsedBook.author = book.author;
      onImport(parsedBook); onClose();
    } catch (error: any) { alert('Download failed.'); } 
    finally { setDownloadingId(null); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-300" onClick={onClose} />
      
      <div className="bg-[#121212]/95 backdrop-blur-3xl w-full max-w-6xl rounded-[32px] overflow-hidden relative z-10 border border-white/10 shadow-2xl flex flex-col h-[90vh] animate-in zoom-in-95 fade-in duration-300">
        
        {/* Header Section */}
        <div className="p-8 pb-4 bg-gradient-to-b from-white/5 to-transparent">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-amber-400/10 rounded-xl text-amber-400"><IdCard size={24} strokeWidth={1.5} /></div>
                        Your Library Card
                    </h2>
                    <p className="text-xs text-textMuted mt-2 ml-14 opacity-60">Access thousands of public domain classics. Free forever.</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-textMuted hover:text-white transition-colors">
                    <X size={24} strokeWidth={1.5} />
                </button>
            </div>

            {/* Compact Search */}
            <div className="relative group max-w-2xl">
                <input 
                    type="text" 
                    value={query} 
                    onChange={(e) => setQuery(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)} 
                    placeholder="Search titles, authors..." 
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-textMuted/50 focus:outline-none focus:ring-1 focus:ring-amber-400/50 focus:border-amber-400/50 transition-all text-sm font-medium" 
                    autoFocus 
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-textMuted group-focus-within:text-amber-400 transition-colors" size={18} strokeWidth={1.5} />
            </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 pt-2 hide-scrollbar">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full opacity-60">
                    <Loader2 size={32} className="animate-spin mb-4 text-amber-400" strokeWidth={1.5} />
                    <p className="text-xs font-bold uppercase tracking-widest text-textMuted">Checking Archives...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-danger text-center opacity-80">
                    <AlertCircle size={32} className="mb-4" strokeWidth={1.5} />
                    <p>{error}</p>
                </div>
            ) : results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {results.map(book => <GutenbergBookItem key={book.id} book={book} downloadingId={downloadingId} onDownload={handleDownload} />)}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 text-textMuted">
                        <BookIcon size={32} strokeWidth={0.5} />
                    </div>
                    <h3 className="text-lg font-bold text-text mb-2">No Public Domain Results</h3>
                    <p className="text-sm text-textMuted leading-relaxed mb-6">
                        We couldn't find "{query}" in the public domain archive.
                        <br/><br/>
                        <span className="block p-4 bg-amber-400/5 border border-amber-400/10 rounded-xl text-amber-200/80 text-xs text-left">
                            <strong className="block text-amber-400 mb-1 uppercase tracking-wider text-[10px]">Copyright Notice</strong>
                            Modern books (like <em>Fahrenheit 451</em>, <em>Harry Potter</em>, etc.) are protected by copyright and are <strong>not available</strong> via this tool. This Library Card only accesses books published before 1929 (Public Domain).
                        </span>
                    </p>
                    <button onClick={() => { setQuery(''); handleSearch(''); }} className="text-xs text-primary hover:underline">View Popular Classics</button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
