
import React from 'react';
import { ReaderSettings } from '../types';
import { X, Type, Zap, Minus, Plus, Palette, Settings2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onUpdateSettings: (settings: ReaderSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  const update = (key: keyof ReaderSettings, value: any) => onUpdateSettings({ ...settings, [key]: value });

  const adjustWpm = (e: React.MouseEvent, amount: number) => {
    e.preventDefault(); e.stopPropagation();
    const current = typeof settings.wpm === 'number' ? settings.wpm : parseInt(String(settings.wpm), 10) || 350;
    update('wpm', Math.max(100, Math.min(1000, current + amount)));
  };

  const bgClass = settings.theme === 'light' ? 'bg-white text-gray-900' : settings.theme === 'sepia' ? 'bg-[#E9DFCC] text-[#5b4636]' : 'bg-[#1E1E1E] text-white';
  const surfaceClass = "bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl pointer-events-auto transition-opacity duration-300" onClick={onClose} />
      <div className={`relative z-10 w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-8 pointer-events-auto shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 ${bgClass}`}>
        
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Settings2 size={20} strokeWidth={2} className="opacity-70" />
              Display
          </h3>
          <button onClick={onClose} className="p-2.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X size={20} strokeWidth={2} className="opacity-60" /></button>
        </div>

        <div className="space-y-6">
          {/* Speed */}
          <div className={`${surfaceClass} rounded-3xl p-6`}>
            <div className="flex justify-between items-center mb-6">
              <label className="flex items-center gap-2.5 text-xs font-bold opacity-60 uppercase tracking-widest"><Zap size={14} strokeWidth={2} /> Speed</label>
              <span className="text-2xl font-mono font-bold text-primary tracking-tighter">{settings.wpm}<span className="text-[10px] font-sans opacity-60 ml-1 tracking-widest">WPM</span></span>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={(e) => adjustWpm(e, -25)} className="h-12 w-16 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"><Minus size={18} strokeWidth={2} /></button>
                <div className="flex-1 h-12 bg-black/5 dark:bg-white/5 rounded-2xl relative overflow-hidden">
                    <input type="range" min="100" max="1000" step="25" value={settings.wpm} onChange={(e) => update('wpm', parseInt(e.target.value) || 350)} className="w-full h-full opacity-0 cursor-pointer absolute z-10" />
                    <div className="absolute top-0 left-0 bottom-0 bg-primary opacity-20 pointer-events-none transition-all duration-100 ease-out" style={{ width: `${(settings.wpm - 100) / 9}%` }} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30 text-[9px] uppercase font-bold tracking-[0.2em]">Slide</div>
                </div>
                <button onClick={(e) => adjustWpm(e, 25)} className="h-12 w-16 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"><Plus size={18} strokeWidth={2} /></button>
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold opacity-60 uppercase tracking-widest mb-4 px-2"><Type size={14} strokeWidth={2} /> Typography</label>
            <div className="grid grid-cols-4 gap-2">
              {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                <button key={size} onClick={() => update('fontSize', size)} className={`h-14 rounded-2xl text-[10px] font-bold transition-all border ${settings.fontSize === size ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-black/5 dark:bg-white/5 border-transparent opacity-60 hover:opacity-100 hover:bg-black/10'}`}>
                  {size === 'sm' ? 'Aa' : size === 'md' ? 'Aa' : size === 'lg' ? 'Aa' : 'Aa'}
                  <div className="opacity-50 font-normal mt-0.5">{size.toUpperCase()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
           <div>
            <label className="flex items-center gap-2 text-xs font-bold opacity-60 uppercase tracking-widest mb-4 px-2"><Palette size={14} strokeWidth={2} /> Appearance</label>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => update('theme', 'dark')} className={`h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 bg-[#121212] ${settings.theme === 'dark' ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-white/10 opacity-70 hover:opacity-100'}`}>
                <div className="w-6 h-6 rounded-full bg-white/10" />
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Dark</span>
              </button>
               <button onClick={() => update('theme', 'light')} className={`h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 bg-[#F5F5F7] ${settings.theme === 'light' ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-black/5 opacity-70 hover:opacity-100'}`}>
                <div className="w-6 h-6 rounded-full bg-black/10" />
                <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Light</span>
              </button>
               <button onClick={() => update('theme', 'sepia')} className={`h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 bg-[#F4ECD8] ${settings.theme === 'sepia' ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-[#d3c0a3] opacity-70 hover:opacity-100'}`}>
                <div className="w-6 h-6 rounded-full bg-[#5b4636]/10" />
                <span className="text-[9px] text-[#5b4636] font-bold uppercase tracking-widest">Sepia</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
