import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, Wifi, WifiOff, Loader2, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendAIMessage, getAIApiKeys, type ChatMessage as AIChatMessage } from '@/lib/ai-service';

interface AIAssistantProps {
  open: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  loading?: boolean;
}

export default function AIAssistant({ open, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isAIConfigured, setIsAIConfigured] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAIApiKeys().then((keys) => {
      setIsAIConfigured(keys.enabled && !!keys.gemini_api_key);
    });
  }, [open]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: '1',
          role: 'ai',
          content: isAIConfigured
            ? 'Hello! I\'m TITAN AI powered by Google Gemini. Ask me anything about your agency — burn rates, overdue invoices, campaign performance, team utilization, and more!'
            : 'Hello! I\'m TITAN AI. To unlock full AI capabilities, please configure your Gemini API key in Settings → AI & Automation. For now, I can provide basic predefined responses.',
          timestamp: 'Just now',
        },
      ]);
    }
  }, [open, isAIConfigured]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    if (isAIConfigured) {
      // Real AI response via Gemini
      setIsTyping(true);
      const loadingMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: '',
        timestamp: 'Thinking...',
        loading: true,
      };
      setMessages((prev) => [...prev, loadingMsg]);

      try {
        const chatHistory: AIChatMessage[] = messages
          .filter((m) => !m.loading)
          .map((m) => ({
            role: m.role,
            content: m.content,
          }));
        chatHistory.push({ role: 'user', content: input });

        const response = await sendAIMessage(chatHistory);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id
              ? {
                  ...m,
                  content: response.response,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  loading: false,
                }
              : m
          )
        );
      } catch (e: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id
              ? {
                  ...m,
                  content: e.message === 'AI_NOT_CONFIGURED'
                    ? '⚠️ AI not configured. Go to Settings → AI & Automation to set up your Gemini API key.'
                    : `⚠️ Error: ${e.message || 'Failed to get AI response'}. Please check your API key in Settings.`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  loading: false,
                }
              : m
          )
        );
      } finally {
        setIsTyping(false);
      }
    } else {
      // Fallback to predefined responses
      const fallbackResponses: Record<string, string> = {
        'burn rate': 'Your current monthly burn rate is $54,200. This is 8% higher than last month, primarily due to increased media buying spend.\n\n💡 **Tip**: Configure your Gemini API key in Settings for real-time AI-powered analysis.',
        'overdue': 'You have 2 overdue invoices:\n• Invoice #1239 — UrbanFit — $4,200 (15 days overdue)\n• Invoice #1235 — BluePeak — $2,800 (7 days overdue)\n\n💡 Configure Gemini API for deeper analysis.',
        'revenue': 'Revenue this month: $127,450 (+12.5% vs last month). Top contributors: Acme Corp ($32,000), TechStart ($24,500), Zenith Co ($18,900).\n\n💡 Enable Gemini AI for predictive revenue insights.',
        'team': 'Team utilization at 91%. Sarah K. has highest workload (3 active projects). Consider redistributing to Chris P. (60% capacity).\n\n💡 Connect Gemini API for AI-powered recommendations.',
      };

      const lowerInput = input.toLowerCase();
      let responseText = '🤖 I can help with "burn rate", "overdue invoices", "revenue", or "team utilization" questions.\n\nFor unlimited intelligent AI responses, configure your **Gemini API key** in Settings → AI & Automation.';

      for (const [key, value] of Object.entries(fallbackResponses)) {
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
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }, 600);
    }
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
                <div className={cn(
                  "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse",
                  isAIConfigured ? 'bg-titan-lime' : 'bg-yellow-500'
                )} />
              </div>
              <div>
                <h3 className="font-display font-bold text-xs text-white">TITAN AI</h3>
                <p className="font-mono-data text-[9px] text-titan-purple/60">
                  {isAIConfigured ? (
                    <span className="flex items-center gap-1">
                      <Wifi className="w-2 h-2 text-titan-lime" /> Gemini Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <WifiOff className="w-2 h-2 text-yellow-500" /> Offline Mode
                    </span>
                  )}
                </p>
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
                      {msg.loading ? (
                        <Loader2 className="w-3 h-3 text-titan-purple/60 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-titan-purple/60" />
                      )}
                      <span className="font-mono-data text-[9px] text-titan-purple/50">
                        {msg.loading ? 'Thinking...' : 'TITAN AI'}
                      </span>
                    </div>
                  )}
                  {msg.loading ? (
                    <div className="flex items-center gap-1.5 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-titan-purple/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-titan-purple/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-titan-purple/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <p className="font-mono-data text-[11px] text-white/70 leading-relaxed whitespace-pre-line">
                      {msg.content}
                    </p>
                  )}
                  {!msg.loading && (
                    <p className="font-mono-data text-[8px] text-white/15 mt-1.5">{msg.timestamp}</p>
                  )}
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
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={isTyping ? 'AI is thinking...' : 'Ask me anything...'}
                disabled={isTyping}
                className="flex-1 bg-transparent outline-none font-mono-data text-xs text-white/80 placeholder:text-white/20 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-md transition-all duration-200',
                  input.trim() && !isTyping
                    ? 'bg-titan-purple/20 text-titan-purple hover:bg-titan-purple/30'
                    : 'bg-white/[0.03] text-white/10'
                )}
              >
                {isTyping ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
