import { useState, useCallback } from 'react';
import {
  Search,
  Bell,
  Bot,
  Command,
  X,
  AlertTriangle,
  DollarSign,
  Users,
  UserCog,
  ChevronDown,
  LogOut,
  CheckCheck,
  Trash2,
  ExternalLink,
  Eye,
  Loader2,
  MessageSquare,
  Package,
  Settings,
  Zap,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notificationsData as mockNotificationsData } from './mock-data';
import type { NotificationItem } from './types';
import { useAuth, getRoleLabel } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '@/lib/data-service';

interface TopCommandBarProps {
  onSearchOpen: () => void;
  onAIToggle: () => void;
  notifications?: NotificationItem[];
  notificationsLoading?: boolean;
  onNotificationsRefresh?: () => void;
  onNavigate?: (section: string) => void;
}

// Map action_type / category to a sidebar navigation section
function resolveNavigationTarget(notif: NotificationItem): string | null {
  const metaSection = notif.metadata?.section as string | undefined;
  if (metaSection) return metaSection;

  switch (notif.actionType) {
    case 'view_client':
    case 'assign_team':
      return 'clients';
    case 'view_invoice':
    case 'view_finance':
      return 'finance';
    case 'view_team':
      return 'team';
    case 'view_deliverable':
      return 'packages';
    case 'view_campaign':
    case 'view_media':
      return 'media';
    case 'view_wallet':
      return 'wallet';
    case 'view_message':
      return 'messaging';
    case 'view_assignment':
      return 'assignments';
    case 'view_settings':
      return 'settings';
    default:
      break;
  }

  switch (notif.category) {
    case 'client': return 'clients';
    case 'financial': return 'finance';
    case 'team': return 'team';
    default: return null;
  }
}

function getNavigationIcon(target: string | null) {
  switch (target) {
    case 'clients': return Users;
    case 'finance': return DollarSign;
    case 'team': return UserCog;
    case 'packages': return Package;
    case 'messaging': return MessageSquare;
    case 'media': return Zap;
    case 'wallet': return Wallet;
    case 'assignments': return UserPlus;
    case 'settings': return Settings;
    default: return ExternalLink;
  }
}

function getNavigationLabel(target: string | null): string {
  switch (target) {
    case 'clients': return 'Go to Clients';
    case 'finance': return 'Go to Finance';
    case 'team': return 'Go to Team';
    case 'packages': return 'Go to Packages';
    case 'messaging': return 'Go to Messages';
    case 'media': return 'Go to Campaigns';
    case 'wallet': return 'Go to Wallet';
    case 'assignments': return 'Go to Assignments';
    case 'settings': return 'Go to Settings';
    default: return 'View Details';
  }
}

export default function TopCommandBar({
  onSearchOpen,
  onAIToggle,
  notifications,
  notificationsLoading,
  onNotificationsRefresh,
  onNavigate,
}: TopCommandBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const notificationsData = notifications && notifications.length > 0 ? notifications : mockNotificationsData;
  const unreadCount = notificationsData.filter(n => !n.read).length;

  const visibleNotifications = filterTab === 'unread'
    ? notificationsData.filter(n => !n.read)
    : notificationsData;

  const handleMarkAsRead = useCallback(async (notifId: string) => {
    setMarkingIds(prev => new Set(prev).add(notifId));
    try {
      await markNotificationAsRead(notifId);
      onNotificationsRefresh?.();
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    } finally {
      setMarkingIds(prev => {
        const next = new Set(prev);
        next.delete(notifId);
        return next;
      });
    }
  }, [onNotificationsRefresh]);

  const handleMarkAllAsRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      onNotificationsRefresh?.();
    } catch (e) {
      console.error('Failed to mark all notifications as read:', e);
    } finally {
      setMarkingAll(false);
    }
  }, [onNotificationsRefresh]);

  const handleDeleteNotification = useCallback(async (notifId: string) => {
    setDeletingIds(prev => new Set(prev).add(notifId));
    try {
      await deleteNotification(notifId);
      onNotificationsRefresh?.();
    } catch (e) {
      console.error('Failed to delete notification:', e);
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(notifId);
        return next;
      });
    }
  }, [onNotificationsRefresh]);

  const handleNotificationClick = useCallback((notif: NotificationItem) => {
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
    const target = resolveNavigationTarget(notif);
    if (target && onNavigate) {
      onNavigate(target);
      setNotifOpen(false);
    }
  }, [handleMarkAsRead, onNavigate]);

  const handleNavigateAction = useCallback((notif: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
    const target = resolveNavigationTarget(notif);
    if (target && onNavigate) {
      onNavigate(target);
      setNotifOpen(false);
    }
  }, [handleMarkAsRead, onNavigate]);

  const categoryIcons: Record<string, typeof AlertTriangle> = {
    urgent: AlertTriangle,
    financial: DollarSign,
    client: Users,
    team: UserCog,
  };

  const categoryColors: Record<string, string> = {
    urgent: 'text-titan-magenta',
    financial: 'text-titan-cyan',
    client: 'text-titan-purple',
    team: 'text-titan-lime',
  };

  const categoryBgColors: Record<string, string> = {
    urgent: 'bg-titan-magenta/10',
    financial: 'bg-titan-cyan/10',
    client: 'bg-titan-purple/10',
    team: 'bg-titan-lime/10',
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06] bg-[#0D1029]/60 backdrop-blur-xl relative z-30">
      {/* Left: Search */}
      <button
        onClick={onSearchOpen}
        className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-titan-cyan/30 hover:bg-white/[0.06] transition-all duration-200 group"
      >
        <Search className="w-4 h-4 text-white/30 group-hover:text-titan-cyan/60 transition-colors" />
        <span className="font-mono-data text-xs text-white/30 hidden sm:inline">Search anything...</span>
        <kbd className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono-data text-white/20">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* AI Toggle */}
        <button
          onClick={onAIToggle}
          className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-titan-purple/20 to-titan-cyan/10 border border-titan-purple/30 hover:border-titan-purple/50 transition-all duration-200 group"
        >
          <Bot className="w-4 h-4 text-titan-purple group-hover:text-titan-cyan transition-colors" />
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-titan-lime animate-pulse" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-all duration-200"
          >
            <Bell className="w-4 h-4 text-white/50" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-titan-magenta text-[9px] font-mono-data text-white font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-12 w-[400px] z-50 glass-card border border-white/[0.08] shadow-2xl animate-fade-in-up overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-sm text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-titan-magenta/15 text-titan-magenta text-[9px] font-mono-data font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        disabled={markingAll}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-titan-cyan hover:bg-titan-cyan/10 transition-colors disabled:opacity-50"
                        title="Mark all as read"
                      >
                        {markingAll ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCheck className="w-3 h-3" />
                        )}
                        {markingAll ? 'Marking...' : 'Mark all read'}
                      </button>
                    )}
                    <button onClick={() => setNotifOpen(false)} className="text-white/30 hover:text-white/60 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center border-b border-white/[0.06]">
                  <button
                    onClick={() => setFilterTab('all')}
                    className={cn(
                      'flex-1 py-2 text-center font-mono text-[10px] uppercase tracking-wider transition-all border-b-2',
                      filterTab === 'all'
                        ? 'text-titan-cyan border-titan-cyan'
                        : 'text-white/30 border-transparent hover:text-white/50'
                    )}
                  >
                    All ({notificationsData.length})
                  </button>
                  <button
                    onClick={() => setFilterTab('unread')}
                    className={cn(
                      'flex-1 py-2 text-center font-mono text-[10px] uppercase tracking-wider transition-all border-b-2',
                      filterTab === 'unread'
                        ? 'text-titan-cyan border-titan-cyan'
                        : 'text-white/30 border-transparent hover:text-white/50'
                    )}
                  >
                    Unread ({unreadCount})
                  </button>
                </div>

                {/* Notification List */}
                <div className="max-h-[420px] overflow-y-auto scrollbar-hide">
                  {notificationsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
                    </div>
                  ) : visibleNotifications.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <Bell className="w-8 h-8 text-white/10 mx-auto mb-3" />
                      <p className="font-mono-data text-xs text-white/30 mb-1">
                        {filterTab === 'unread' ? 'All caught up!' : 'No notifications'}
                      </p>
                      <p className="font-mono-data text-[10px] text-white/15">
                        {filterTab === 'unread' ? 'You have no unread notifications' : 'Notifications will appear here'}
                      </p>
                    </div>
                  ) : (
                    visibleNotifications.map((notif) => {
                      const CategoryIcon = categoryIcons[notif.category] || Bell;
                      const navTarget = resolveNavigationTarget(notif);
                      const NavIcon = getNavigationIcon(navTarget);
                      const navLabel = getNavigationLabel(navTarget);
                      const isMarking = markingIds.has(notif.id);
                      const isDeleting = deletingIds.has(notif.id);

                      return (
                        <div
                          key={notif.id}
                          className={cn(
                            'relative flex flex-col border-b border-white/[0.04] transition-all',
                            isDeleting && 'opacity-30 pointer-events-none',
                            !notif.read && 'bg-white/[0.02]'
                          )}
                        >
                          {/* Unread indicator bar */}
                          {!notif.read && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-titan-cyan" />
                          )}

                          {/* Main clickable area */}
                          <div
                            className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors group"
                            onClick={() => handleNotificationClick(notif)}
                          >
                            <div className={cn(
                              'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                              categoryBgColors[notif.category]
                            )}>
                              <CategoryIcon className={cn('w-4 h-4', categoryColors[notif.category])} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={cn(
                                  'font-mono-data text-xs truncate flex-1',
                                  notif.read ? 'text-white/60' : 'text-white/90 font-medium'
                                )}>
                                  {notif.title}
                                </p>
                                {!notif.read && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-titan-cyan shrink-0 animate-pulse" />
                                )}
                              </div>
                              <p className="font-mono-data text-[10px] text-white/30 mt-0.5 truncate">{notif.description}</p>
                              <p className="font-mono-data text-[10px] text-white/20 mt-1">{notif.timestamp}</p>
                            </div>
                          </div>

                          {/* Action Buttons Row */}
                          <div className="flex items-center justify-between px-4 pb-2 pt-0">
                            {/* Left: Navigate action */}
                            {navTarget && onNavigate ? (
                              <button
                                onClick={(e) => handleNavigateAction(notif, e)}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono text-titan-cyan/70 hover:text-titan-cyan hover:bg-titan-cyan/10 transition-all"
                              >
                                <NavIcon className="w-3 h-3" />
                                {navLabel}
                              </button>
                            ) : (
                              <span />
                            )}

                            {/* Right: Mark read + Delete */}
                            <div className="flex items-center gap-1">
                              {!notif.read && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                                  disabled={isMarking}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono text-white/30 hover:text-titan-cyan hover:bg-white/[0.04] transition-all disabled:opacity-50"
                                  title="Mark as read"
                                >
                                  {isMarking ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                  <span className="hidden sm:inline">Read</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notif.id); }}
                                disabled={isDeleting}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono text-white/20 hover:text-titan-magenta hover:bg-titan-magenta/5 transition-all disabled:opacity-50"
                                title="Delete notification"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                {visibleNotifications.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center justify-center">
                    <p className="font-mono text-[10px] text-white/20">
                      {notificationsData.length} total · {unreadCount} unread
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User Avatar */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-all duration-200 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-titan-cyan/40 to-titan-purple/40 flex items-center justify-center border border-white/10">
              <span className="font-display font-bold text-xs text-white">
                {user?.avatar && user.avatar.length <= 2 ? user.avatar : user?.display_name?.slice(0, 2).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden md:flex flex-col items-start">
              <span className="font-mono-data text-[11px] text-white/70">{user?.display_name || 'User'}</span>
              <span className="font-mono-data text-[9px] text-titan-cyan/60">{user ? getRoleLabel(user.role) : 'Guest'}</span>
            </div>
            <ChevronDown className="w-3 h-3 text-white/20 hidden md:block" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-12 w-[200px] z-50 glass-card border border-white/[0.08] shadow-2xl animate-fade-in-up overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <p className="font-display font-bold text-xs text-white">{user?.display_name}</p>
                  <p className="font-mono-data text-[10px] text-white/30">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setUserMenuOpen(false); logout(); navigate('/login'); }}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-titan-magenta" />
                  <span className="font-mono-data text-xs text-titan-magenta">Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
