import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import {
  getSupportTickets,
  createSupportTicket,
  getTicketReplies,
  addTicketReply,
} from '@/lib/data-service';
import {
  HelpCircle,
  ArrowLeft,
  Plus,
  Send,
  Loader2,
  Clock,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
  X,
  RefreshCw,
} from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

interface Reply {
  id: string;
  sender_type: string;
  sender_name: string;
  message: string;
  created_at: string;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: 'rgba(0,217,255,0.12)', text: '#00D9FF', label: 'Open' },
  in_progress: { bg: 'rgba(255,184,0,0.12)', text: '#FFB800', label: 'In Progress' },
  waiting_client: { bg: 'rgba(123,97,255,0.12)', text: '#7B61FF', label: 'Awaiting Reply' },
  resolved: { bg: 'rgba(57,255,20,0.12)', text: '#39FF14', label: 'Resolved' },
  closed: { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.3)', label: 'Closed' },
};

const categoryIcons: Record<string, string> = {
  general: '💬',
  billing: '💳',
  technical: '🔧',
  deliverable: '📋',
  account: '👤',
  feedback: '⭐',
};

const priorityColors: Record<string, string> = {
  low: '#39FF14',
  normal: '#00D9FF',
  high: '#FFB800',
  urgent: '#FF006E',
};

export default function ClientSupport({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'normal',
  });

  const fetchTickets = useCallback(async () => {
    const clientId = user?.client_id;
    if (!clientId) return;
    setLoading(true);
    try {
      const data = await getSupportTickets(clientId, activeFilter === 'all' ? undefined : activeFilter);
      setTickets(data as Ticket[]);
    } catch (e) {
      console.error('Failed to fetch tickets:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.client_id, activeFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleCreateTicket = async () => {
    const clientId = user?.client_id;
    if (!clientId || !newTicket.subject.trim()) return;
    setSubmitting(true);
    try {
      await createSupportTicket({
        clientId,
        subject: newTicket.subject,
        description: newTicket.description,
        category: newTicket.category,
        priority: newTicket.priority,
      });
      setShowCreateForm(false);
      setNewTicket({ subject: '', description: '', category: 'general', priority: 'normal' });
      fetchTickets();
    } catch (e) {
      console.error('Failed to create ticket:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const openTicketDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    try {
      const data = await getTicketReplies(ticket.id);
      setReplies(data as Reply[]);
    } catch (e) {
      console.error('Failed to fetch replies:', e);
      setReplies([]);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSubmitting(true);
    try {
      await addTicketReply({
        ticketId: selectedTicket.id,
        senderType: 'client',
        senderId: user?.id,
        senderName: user?.display_name || 'Client',
        message: replyText,
      });
      setReplyText('');
      const data = await getTicketReplies(selectedTicket.id);
      setReplies(data as Reply[]);
    } catch (e) {
      console.error('Failed to send reply:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  };

  const filters = ['all', 'open', 'in_progress', 'resolved', 'closed'];

  return (
    <div className="h-full overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-titan-bg/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={selectedTicket ? () => setSelectedTicket(null) : onBack}
            className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-sm text-white">
              {selectedTicket ? selectedTicket.subject : 'Help & Support'}
            </h1>
            <p className="font-mono text-[10px] text-white/30">
              {selectedTicket
                ? statusColors[selectedTicket.status]?.label || selectedTicket.status
                : `${tickets.length} tickets`}
            </p>
          </div>
          {!selectedTicket && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-8 h-8 rounded-full bg-titan-cyan/15 border border-titan-cyan/30 flex items-center justify-center active:scale-90 transition-transform"
            >
              <Plus className="w-4 h-4 text-titan-cyan" />
            </button>
          )}
          {!selectedTicket && (
            <button
              onClick={fetchTickets}
              className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
            >
              <RefreshCw className={`w-4 h-4 text-white/30 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Ticket Detail View */}
      {selectedTicket ? (
        <div className="flex flex-col h-[calc(100%-60px)]">
          {/* Ticket Info */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold"
                style={{
                  background: statusColors[selectedTicket.status]?.bg,
                  color: statusColors[selectedTicket.status]?.text,
                }}
              >
                {statusColors[selectedTicket.status]?.label}
              </span>
              <span className="text-[9px] font-mono text-white/20">
                {categoryIcons[selectedTicket.category]} {selectedTicket.category}
              </span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: priorityColors[selectedTicket.priority] }}
              />
              <span className="text-[9px] font-mono text-white/20">{selectedTicket.priority}</span>
            </div>
            {selectedTicket.description && (
              <p className="font-mono text-[11px] text-white/50 mt-2">{selectedTicket.description}</p>
            )}
          </div>

          {/* Replies */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {replies.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="font-mono text-xs text-white/30">No replies yet</p>
                <p className="font-mono text-[10px] text-white/15">Our team will respond shortly</p>
              </div>
            ) : (
              replies.map((reply) => (
                <motion.div
                  key={reply.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${reply.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                      reply.sender_type === 'client'
                        ? 'bg-titan-cyan/10 border border-titan-cyan/20'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <p className="font-mono text-[9px] text-white/30 mb-1">
                      {reply.sender_name || (reply.sender_type === 'client' ? 'You' : 'Support Agent')}
                    </p>
                    <p className="font-mono text-xs text-white/70">{reply.message}</p>
                    <p className="font-mono text-[8px] text-white/15 mt-1 text-right">
                      {formatTime(reply.created_at)}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Reply Input */}
          {(selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved') && (
            <div className="shrink-0 px-4 py-3 border-t border-white/[0.06] bg-titan-bg/95">
              <div className="flex gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                  placeholder="Type a reply..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none"
                />
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || submitting}
                  className="w-10 h-10 rounded-xl bg-titan-cyan/15 border border-titan-cyan/30 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 text-titan-cyan animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-titan-cyan" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 pt-3 pb-6 space-y-4">
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`flex-none px-3 py-1.5 rounded-full font-mono text-[10px] transition-all ${
                  activeFilter === f
                    ? 'bg-titan-cyan/15 border border-titan-cyan/30 text-titan-cyan'
                    : 'bg-white/5 border border-white/[0.06] text-white/30'
                }`}
              >
                {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Ticket List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-titan-cyan/40 animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <HelpCircle className="w-10 h-10 text-white/10 mb-3" />
              <p className="font-display font-semibold text-sm text-white/40">No tickets</p>
              <p className="font-mono text-[10px] text-white/20 mt-1">Create a ticket to get help</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-titan-cyan/15 border border-titan-cyan/30 font-display font-bold text-xs text-titan-cyan active:scale-95 transition-transform"
              >
                <Plus className="w-3.5 h-3.5 inline mr-1" /> New Ticket
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket, i) => {
                const sc = statusColors[ticket.status] || statusColors.open;
                return (
                  <motion.button
                    key={ticket.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => openTicketDetail(ticket)}
                    className="w-full text-left glass-card p-3 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                        style={{ background: `${sc.bg}` }}
                      >
                        {categoryIcons[ticket.category] || '💬'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold text-xs text-white truncate">
                          {ticket.subject}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold"
                            style={{ background: sc.bg, color: sc.text }}
                          >
                            {sc.label}
                          </span>
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: priorityColors[ticket.priority] }}
                          />
                          <span className="font-mono text-[9px] text-white/20">
                            {formatTime(ticket.created_at)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/10 shrink-0 mt-1" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Ticket Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
            onClick={() => setShowCreateForm(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[85vh] overflow-y-auto bg-titan-bg border-t border-white/10 rounded-t-3xl p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-base text-white">New Support Ticket</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="w-8 h-8 rounded-full glass-card flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>

              {/* Subject */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Subject</label>
                <input
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="Brief summary of your issue..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(categoryIcons).map(([cat, icon]) => (
                    <button
                      key={cat}
                      onClick={() => setNewTicket((p) => ({ ...p, category: cat }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                        newTicket.category === cat
                          ? 'bg-titan-cyan/10 border-titan-cyan/30 text-titan-cyan'
                          : 'bg-white/5 border-white/[0.06] text-white/40'
                      }`}
                    >
                      <span className="text-sm">{icon}</span>
                      <span className="font-mono text-[10px] capitalize">{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Priority</label>
                <div className="flex gap-2">
                  {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewTicket((prev) => ({ ...prev, priority: p }))}
                      className={`flex-1 px-3 py-2 rounded-xl border font-mono text-[10px] capitalize transition-all ${
                        newTicket.priority === p
                          ? 'border-opacity-40'
                          : 'bg-white/5 border-white/[0.06] text-white/30'
                      }`}
                      style={
                        newTicket.priority === p
                          ? { background: `${priorityColors[p]}12`, borderColor: `${priorityColors[p]}40`, color: priorityColors[p] }
                          : undefined
                      }
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe your issue in detail..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleCreateTicket}
                disabled={!newTicket.subject.trim() || submitting}
                className="w-full py-3 rounded-xl bg-titan-cyan/15 border border-titan-cyan/30 font-display font-bold text-sm text-titan-cyan active:scale-[0.97] transition-transform disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Ticket
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
