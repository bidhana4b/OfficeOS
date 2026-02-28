import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import {
  Bell,
  BellOff,
  ArrowLeft,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  Package,
  CreditCard,
  MessageCircle,
  ClipboardList,
  AlertCircle,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  read: boolean;
  category: string;
  created_at: string;
  action_url?: string;
}

const categoryConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  task: { icon: ClipboardList, color: '#00D9FF', bg: 'rgba(0,217,255,0.1)' },
  deliverable_request: { icon: ClipboardList, color: '#7B61FF', bg: 'rgba(123,97,255,0.1)' },
  billing: { icon: CreditCard, color: '#FFB800', bg: 'rgba(255,184,0,0.1)' },
  message: { icon: MessageCircle, color: '#39FF14', bg: 'rgba(57,255,20,0.1)' },
  package: { icon: Package, color: '#00D9FF', bg: 'rgba(0,217,255,0.1)' },
  alert: { icon: AlertCircle, color: '#FF006E', bg: 'rgba(255,0,110,0.1)' },
  general: { icon: Info, color: '#ffffff40', bg: 'rgba(255,255,255,0.04)' },
};

const priorityColors: Record<string, string> = {
  high: '#FF006E',
  medium: '#FFB800',
  low: '#ffffff30',
};

export default function ClientNotifications({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = useCallback(async () => {
    try {
      const clientId = user?.client_id;
      if (!clientId) { setLoading(false); return; }

      // Fetch notifications targeted at this client or general ones
      const { data, error: err } = await supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', DEMO_TENANT_ID)
        .or(`target_client_id.eq.${clientId},target_client_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (err) throw err;

      if (data) {
        setNotifications(data.map((n: Record<string, unknown>) => ({
          id: n.id as string,
          type: (n.type as string) || 'general',
          title: (n.title as string) || 'Notification',
          message: (n.message as string) || '',
          priority: (n.priority as string) || 'low',
          read: (n.read as boolean) || false,
          category: (n.category as string) || (n.type as string) || 'general',
          created_at: (n.created_at as string) || new Date().toISOString(),
          action_url: n.action_url as string | undefined,
        })));
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.client_id]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    const clientId = user?.client_id;
    if (!clientId) return;

    const channel = supabase
      .channel(`client-notifications-${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
      }, () => { fetchNotifications(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.client_id, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length === 0) return;
      await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await supabase.from('notifications').delete().eq('id', id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error('Failed to delete notification:', e);
    }
  };

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
            >
              <ArrowLeft className="w-4 h-4 text-white/50" />
            </button>
            <div>
              <h1 className="font-display font-extrabold text-lg text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-titan-cyan" />
                Notifications
                {unreadCount > 0 && (
                  <span className="min-w-[20px] h-5 rounded-full bg-titan-magenta text-white text-[10px] font-mono font-bold flex items-center justify-center px-1.5">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="font-mono text-[10px] text-white/30 mt-0.5">
                {notifications.length} total • {unreadCount} unread
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchNotifications}
              className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white/40 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-titan-cyan/10 border border-titan-cyan/20 active:scale-95 transition-transform"
              >
                <CheckCheck className="w-3 h-3 text-titan-cyan" />
                <span className="font-mono text-[9px] text-titan-cyan">Read all</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 pb-3">
        <div className="flex gap-2">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full font-mono text-[10px] border transition-all active:scale-95 ${
                filter === f
                  ? 'bg-titan-cyan/15 border-titan-cyan/30 text-titan-cyan'
                  : 'border-white/[0.06] text-white/30'
              }`}
            >
              {f === 'all' ? 'All' : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-titan-cyan/40 animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BellOff className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-white/40 text-sm font-medium">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-white/20 text-xs mt-1">
              {filter === 'unread' ? "You're all caught up!" : 'Notifications will appear here'}
            </p>
          </div>
        )}

        <AnimatePresence>
          {filtered.map((notification, i) => {
            const config = categoryConfig[notification.category] || categoryConfig.general;
            const Icon = config.icon;

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: i * 0.03 }}
                className={`glass-card p-3 flex gap-3 transition-all ${
                  !notification.read ? 'border-l-2' : ''
                }`}
                style={{
                  borderLeftColor: !notification.read ? config.color : undefined,
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: config.bg }}
                >
                  <Icon className="w-4 h-4" style={{ color: config.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`font-display text-xs truncate ${!notification.read ? 'font-bold text-white' : 'font-semibold text-white/60'}`}>
                        {notification.title}
                      </p>
                      <p className="font-mono text-[10px] text-white/40 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                    {notification.priority === 'high' && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0 mt-1"
                        style={{ background: priorityColors.high }}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="font-mono text-[9px] text-white/25 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(notification.created_at)}
                    </span>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="font-mono text-[9px] text-titan-cyan/70 hover:text-titan-cyan flex items-center gap-0.5"
                      >
                        <Check className="w-2.5 h-2.5" /> Mark read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="font-mono text-[9px] text-white/20 hover:text-titan-magenta flex items-center gap-0.5 ml-auto"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
