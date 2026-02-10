import React, { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';

interface GeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (topic: string) => Promise<void>;
}

export const GeneratorModal: React.FC<GeneratorModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError('');
    try {
      await onGenerate(topic);
      setTopic('');
      onClose();
    } catch (err) {
      setError('Failed to generate content. Please check API key configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={!isLoading ? onClose : undefined} />
      
      <div className="bg-surface w-full max-w-lg rounded-2xl p-8 relative z-10 border border-white/10 shadow-2xl">
        <button 
          onClick={onClose} 
          disabled={isLoading}
          className="absolute right-4 top-4 p-2 hover:bg-white/10 rounded-full text-textMuted hover:text-text disabled:opacity-0"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-primary/20 rounded-full mb-4">
            <Sparkles size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-text">What do you want to read?</h2>
          <p className="text-textMuted mt-2">Enter a topic, and Flow will generate a short story or article for you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., The history of coffee, A cyberpunk detective story..."
              className="w-full bg-background border border-white/10 rounded-xl px-4 py-4 text-text placeholder:text-textMuted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              autoFocus
              disabled={isLoading}
            />
            {error && <p className="text-danger text-sm mt-2">{error}</p>}
          </div>

          <Button 
            type="submit" 
            className="w-full py-4 text-lg" 
            disabled={!topic.trim() || isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" /> Generating...
              </span>
            ) : (
              'Generate & Read'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};
