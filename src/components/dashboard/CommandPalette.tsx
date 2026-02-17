import { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  Users,
  FolderKanban,
  DollarSign,
  Sparkles,
  ArrowRight,
  X,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const suggestions = [
  { id: '1', type: 'client', icon: Users, label: 'Acme Corp', description: 'Client — 3 active projects', color: 'text-titan-cyan' },
  { id: '2', type: 'client', icon: Users, label: 'TechStart Inc', description: 'Client — 1 active project', color: 'text-titan-cyan' },
  { id: '3', type: 'project', icon: FolderKanban, label: 'Q4 Social Campaign', description: 'Project — In Progress (65%)', color: 'text-titan-purple' },
  { id: '4', type: 'invoice', icon: FileText, label: 'Invoice #1247', description: 'Invoice — $8,500 (Paid)', color: 'text-titan-lime' },
  { id: '5', type: 'invoice', icon: DollarSign, label: 'Invoice #1239', description: 'Invoice — $4,200 (Overdue)', color: 'text-titan-magenta' },
  { id: '6', type: 'ai', icon: Sparkles, label: 'Create invoice for Acme Corp', description: 'AI Suggestion — Based on last month\'s services', color: 'text-titan-purple' },
  { id: '7', type: 'ai', icon: Sparkles, label: 'Show overdue invoices', description: 'AI Suggestion — 2 invoices overdue', color: 'text-titan-purple' },
  { id: '8', type: 'project', icon: FolderKanban, label: 'Website Redesign', description: 'Project — Review (90%)', color: 'text-titan-purple' },
];

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
        else onClose(); // This would need to trigger open from parent
      }
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const filtered = suggestions.filter(
    (s) =>
      s.label.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-[560px] mx-4 glass-card border border-white/[0.1] shadow-2xl shadow-titan-cyan/5 animate-fade-in-up overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <Search className="w-4 h-4 text-titan-cyan/60 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients, projects, invoices, or ask AI..."
            className="flex-1 bg-transparent outline-none font-mono-data text-sm text-white/90 placeholder:text-white/25"
          />
          <kbd className="flex items-center px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono-data text-white/20">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto scrollbar-hide py-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Search className="w-8 h-8 text-white/10 mb-2" />
              <p className="font-mono-data text-xs text-white/20">No results found</p>
            </div>
          ) : (
            <>
              {/* Group by type */}
              {['ai', 'client', 'project', 'invoice'].map((type) => {
                const items = filtered.filter((s) => s.type === type);
                if (items.length === 0) return null;
                const typeLabel = type === 'ai' ? 'AI Suggestions' : type.charAt(0).toUpperCase() + type.slice(1) + 's';
                
                return (
                  <div key={type} className="mb-1">
                    <p className="px-4 py-1.5 font-mono-data text-[9px] text-white/20 tracking-widest uppercase">{typeLabel}</p>
                    {items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors group"
                          onClick={onClose}
                        >
                          <Icon className={cn('w-4 h-4 shrink-0', item.color)} />
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-mono-data text-xs text-white/80 truncate">{item.label}</p>
                            <p className="font-mono-data text-[10px] text-white/25 truncate">{item.description}</p>
                          </div>
                          <ArrowRight className="w-3 h-3 text-white/10 group-hover:text-white/30 shrink-0 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.04] bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[9px] font-mono-data text-white/15">
              <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">↑↓</kbd>
              Navigate
            </div>
            <div className="flex items-center gap-1 text-[9px] font-mono-data text-white/15">
              <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">↵</kbd>
              Select
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-titan-purple/40" />
            <span className="font-mono-data text-[9px] text-white/15">AI-powered</span>
          </div>
        </div>
      </div>
    </div>
  );
}
