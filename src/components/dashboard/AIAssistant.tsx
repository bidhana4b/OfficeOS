import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIAssistantProps {
  open: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'ai',
    content: 'Hello! I\'m your TITAN AI assistant. I can help you with burn rates, overdue invoices, campaign performance, and more. What would you like to know?',
    timestamp: 'Just now',
  },
];

const aiResponses: Record<string, string> = {
  'burn rate': 'Your current monthly burn rate is $54,200. This is 8% higher than last month, primarily due to increased media buying spend for Zenith Co\'s holiday campaign.',
  'overdue': 'You have 2 overdue invoices:\n• Invoice #1239 — UrbanFit — $4,200 (15 days overdue)\n• Invoice #1235 — BluePeak — $2,800 (7 days overdue)\nTotal outstanding: $7,000',
  'revenue': 'Revenue this month: $127,450 (+12.5% vs last month). Top contributors: Acme Corp ($32,000), TechStart ($24,500), Zenith Co ($18,900).',
  'team': 'Team utilization is at 91%. Sarah K. has the highest workload (3 active projects). Consider redistributing the NovaBrand briefing to Chris P. who\'s at 60% capacity.',
};

export default function AIAssistant({ open, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: 'Just now',
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    // Find matching AI response
    const lowerInput = input.toLowerCase();
    let responseText = 'I\'m analyzing your request. Based on your current data, I\'ll need a moment to generate comprehensive insights. Try asking about "burn rate", "overdue invoices", "revenue", or "team utilization".';
    
    for (const [key, value] of Object.entries(aiResponses)) {
      if (lowerInput.includes(key)) {
        responseText = value;
        break;
      }
    }
    
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: responseText,
        timestamp: 'Just now',
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 800);
    
    setInput('');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[520px] glass-card border border-titan-purple/20 shadow-2xl shadow-titan-purple/10 rounded-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-gradient-to-r from-titan-purple/10 to-titan-cyan/5">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-titan-purple/30 to-titan-cyan/20 flex items-center justify-center border border-titan-purple/30">
                <Bot className="w-4 h-4 text-titan-purple" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-titan-lime animate-pulse" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xs text-white">TITAN AI</h3>
                <p className="font-mono-data text-[9px] text-titan-purple/60">Online • Ready</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3 min-h-[300px]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div className={cn(
                  'max-w-[85%] p-3 rounded-xl',
                  msg.role === 'user'
                    ? 'bg-titan-cyan/15 border border-titan-cyan/20 rounded-br-sm'
                    : 'bg-white/[0.04] border border-white/[0.06] rounded-bl-sm'
                )}>
                  {msg.role === 'ai' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="w-3 h-3 text-titan-purple/60" />
                      <span className="font-mono-data text-[9px] text-titan-purple/50">TITAN AI</span>
                    </div>
                  )}
                  <p className="font-mono-data text-[11px] text-white/70 leading-relaxed whitespace-pre-line">
                    {msg.content}
                  </p>
                  <p className="font-mono-data text-[8px] text-white/15 mt-1.5">{msg.timestamp}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] focus-within:border-titan-purple/30 transition-colors">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1 bg-transparent outline-none font-mono-data text-xs text-white/80 placeholder:text-white/20"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-md transition-all duration-200',
                  input.trim()
                    ? 'bg-titan-purple/20 text-titan-purple hover:bg-titan-purple/30'
                    : 'bg-white/[0.03] text-white/10'
                )}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
