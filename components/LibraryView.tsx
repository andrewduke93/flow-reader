
import React, { useRef, useState } from 'react';
import { Book, BookFolder } from '../types';
import { 
    BookOpen, Clock, ClipboardPen, Upload, Loader2, Library, 
    ChevronRight, Heart, CheckCircle, Trash2, FileText, Star, Archive, Search, IdCard
} from 'lucide-react';
import { parseEpub } from '../services/epubService';
import { GeneratedCover } from './GeneratedCover';

// --- Components ---

const BookCard: React.FC<{ book: Book; onSelect: any; onMove: any; onDelete: any }> = ({ book, onSelect, onMove, onDelete }) => {
    const handleDelete = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); onDelete(book.id); };
    const handleMove = (e: React.MouseEvent, target: BookFolder) => { e.preventDefault(); e.stopPropagation(); onMove(book.id, target); };

    return (
        <div 
            className="group relative h-48 bg-surface rounded-[24px] overflow-hidden border border-white/5 hover:border-primary/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 flex cursor-pointer"
            onClick={(e) => { e.preventDefault(); onSelect(book); }}
        >
            <div className="w-36 h-full relative flex-shrink-0 bg-black/20 border-r border-white/5">
                <GeneratedCover title={book.title} author={book.author} customCoverUrl={book.coverUrl} />
                {book.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 backdrop-blur-sm">
                        <div className="h-full bg-primary shadow-[0_0_10px_rgba(187,134,252,0.5)]" style={{width: `${book.progress * 100}%`}} />
                    </div>
                )}
            </div>
            <div className="flex-1 p-6 flex flex-col min-w-0 bg-gradient-to-br from-white/[0.02] to-transparent">
                <div className="mb-2">
                    <h3 className="font-bold text-text text-base leading-snug mb-1.5 line-clamp-2 tracking-tight group-hover:text-primary transition-colors">{book.title}</h3>
                    <p className="text-xs text-textMuted line-clamp-1 font-medium opacity-70">{book.author}</p>
                </div>
                
                <div className="mt-auto flex items-end justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-textMuted font-bold uppercase tracking-wider opacity-50">
                        <Clock size={12} strokeWidth={1.5} />
                        <span>{Math.ceil(book.wordCount / 225)}m</span>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => handleMove(e, 'favorites')} className={`p-2.5 rounded-xl hover:bg-white/10 transition-colors ${book.folder === 'favorites' ? 'text-red-400 bg-red-400/10' : 'text-textMuted hover:text-red-400'}`}>
                            <Heart size={16} strokeWidth={1.5} fill={book.folder === 'favorites' ? "currentColor" : "none"} />
                        </button>
                        <button onClick={handleDelete} className="p-2.5 rounded-xl hover:bg-white/10 transition-colors text-textMuted hover:text-danger hover:bg-danger/10">
                            <Trash2 size={16} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const FolderSection: React.FC<any> = ({ folder, title, folderBooks, expandedFolders, toggleFolder, onSelectBook, onMoveBook, onDeleteBook }) => {
    const isExpanded = expandedFolders[folder];
    if (folderBooks.length === 0 && folder !== 'library') return null;

    return (
        <div className="w-full mb-12">
            <div 
                className="flex items-center gap-4 cursor-pointer py-3 select-none group mb-4"
                onClick={() => toggleFolder(folder)}
            >
                <div className="text-sm font-bold uppercase tracking-[0.15em] text-textMuted group-hover:text-text transition-colors flex items-center gap-3">
                    {title}
                    <span className="text-[10px] font-mono text-textMuted/60 bg-white/5 px-2.5 py-0.5 rounded-md border border-white/5 group-hover:border-white/10 transition-colors">{folderBooks.length}</span>
                </div>
                <div className="flex-1 h-px bg-white/5 group-hover:bg-white/10 transition-colors" />
            </div>
            {isExpanded && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-500 ease-out">
                    {folderBooks.map((book: Book) => (
                        <BookCard key={book.id} book={book} onSelect={onSelectBook} onMove={onMoveBook} onDelete={onDeleteBook} />
                    ))}
                </div>
            )}
        </div>
    );
};

export const LibraryView: React.FC<any> = ({ books, onSelectBook, onCreateNoteClick, onImportBook, onOpenGutenberg, onMoveBook, onDeleteBook }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<BookFolder, boolean>>({ 'favorites': true, 'library': true, 'notes': true, 'read': false });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try { const book = await parseEpub(file); onImportBook(book); } 
    catch (error) { alert('Failed to import EPUB.'); } 
    finally { setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const toggleFolder = (folder: BookFolder) => setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  
  const ActionWidget = ({ icon: Icon, label, subLabel, onClick, loading, colorClass }: any) => (
      <button 
        onClick={onClick}
        className="group relative flex flex-col justify-between p-6 rounded-[32px] bg-surface border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all duration-300 active:scale-[0.99] outline-none text-left h-40 overflow-hidden w-full"
      >
          <div className={`absolute top-0 right-0 p-32 opacity-[0.03] rounded-full blur-3xl -mr-10 -mt-10 transition-opacity group-hover:opacity-[0.08] ${colorClass}`} />
          
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-black/20 dark:bg-white/5 border border-white/5 ${colorClass} bg-opacity-10 text-opacity-90`}>
              {loading ? <Loader2 size={24} className="animate-spin" strokeWidth={1.5} /> : <Icon size={24} strokeWidth={1.5} />}
          </div>
          <div>
            <span className="block text-sm font-bold uppercase tracking-wider text-text mb-1 group-hover:translate-x-1 transition-transform">{label}</span>
            <span className="block text-[11px] text-textMuted font-medium opacity-60">{subLabel}</span>
          </div>
      </button>
  );

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-6xl mx-auto w-full flex flex-col">
        <header className="mb-12 mt-4 flex items-center justify-between">
            <div>
                <h1 className="text-4xl font-bold text-text tracking-tight mb-1">Flow</h1>
                <p className="text-base text-textMuted opacity-60 font-medium">Read faster. Retain more.</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary to-blue-500 opacity-80 blur-2xl" />
        </header>

        {/* Wide Action Widgets Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <ActionWidget icon={ClipboardPen} label="Paste" subLabel="Create from clipboard" onClick={onCreateNoteClick} colorClass="text-emerald-400 bg-emerald-400" />
            <ActionWidget icon={Upload} label="Import" subLabel="EPUB files" loading={isImporting} onClick={() => !isImporting && fileInputRef.current?.click()} colorClass="text-blue-400 bg-blue-400" />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".epub" className="hidden" />
            <ActionWidget icon={IdCard} label="Library Card" subLabel="Public Domain Archive" onClick={onOpenGutenberg} colorClass="text-amber-400 bg-amber-400" />
        </div>

        <div className="w-full flex flex-col gap-6">
            <FolderSection folder="favorites" title="Favorites" folderBooks={books.filter((b:Book) => b.folder === 'favorites')} expandedFolders={expandedFolders} toggleFolder={toggleFolder} onSelectBook={onSelectBook} onMoveBook={onMoveBook} onDeleteBook={onDeleteBook} />
            <FolderSection folder="library" title="Library" folderBooks={books.filter((b:Book) => b.folder === 'library' || !b.folder)} expandedFolders={expandedFolders} toggleFolder={toggleFolder} onSelectBook={onSelectBook} onMoveBook={onMoveBook} onDeleteBook={onDeleteBook} />
            <FolderSection folder="notes" title="Notes" folderBooks={books.filter((b:Book) => b.folder === 'notes')} expandedFolders={expandedFolders} toggleFolder={toggleFolder} onSelectBook={onSelectBook} onMoveBook={onMoveBook} onDeleteBook={onDeleteBook} />
            <FolderSection folder="read" title="Archive" folderBooks={books.filter((b:Book) => b.folder === 'read')} expandedFolders={expandedFolders} toggleFolder={toggleFolder} onSelectBook={onSelectBook} onMoveBook={onMoveBook} onDeleteBook={onDeleteBook} />
        </div>
      </div>
    </div>
  );
};
