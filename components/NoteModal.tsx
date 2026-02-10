
import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, content: string) => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onCreate(title.trim() || 'Untitled Note', content);
    setTitle('');
    setContent('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-300" onClick={onClose} />
      
      <div className="bg-[#1E1E1E] w-full max-w-2xl rounded-[32px] p-8 relative z-10 border border-white/10 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 fade-in duration-300">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-text flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><FileText size={24} strokeWidth={1.5} /></div>
                New Note
            </h2>
            <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full text-textMuted hover:text-white transition-colors">
                <X size={20} strokeWidth={2} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden gap-6">
          <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (Optional)"
                className="w-full bg-transparent border-b border-white/10 px-2 py-3 text-2xl font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-primary transition-colors"
                autoFocus
              />
            </div>
            
            <div className="flex-1 flex flex-col min-h-0">
                 <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste your text content here..."
                    className="w-full flex-1 bg-black/20 border border-white/5 rounded-2xl px-6 py-6 text-text placeholder:text-textMuted/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all resize-none font-serif text-lg leading-relaxed"
                 />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button 
                type="submit" 
                className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-xs px-8 py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100" 
                disabled={!content.trim()}
            >
                Create Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
