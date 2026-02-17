import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notificationsData as mockNotificationsData } from './mock-data';
import type { NotificationItem } from './types';
import { useAuth, getRoleLabel } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

interface TopCommandBarProps {
  onSearchOpen: () => void;
  onAIToggle: () => void;
  notifications?: NotificationItem[];
  notificationsLoading?: boolean;
}

export default function TopCommandBar({ onSearchOpen, onAIToggle, notifications, notificationsLoading }: TopCommandBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const notificationsData = notifications && notifications.length > 0 ? notifications : mockNotificationsData;
  const unreadCount = notificationsData.filter(n => !n.read).length;

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
              <div className="absolute right-0 top-12 w-[360px] z-50 glass-card border border-white/[0.08] shadow-2xl animate-fade-in-up overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <h3 className="font-display font-bold text-sm text-white">Notifications</h3>
                  <button onClick={() => setNotifOpen(false)} className="text-white/30 hover:text-white/60">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                  {notificationsData.map((notif) => {
                    const CategoryIcon = categoryIcons[notif.category] || Bell;
                    return (
                      <div
                        key={notif.id}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer',
                          !notif.read && 'bg-white/[0.02]'
                        )}
                      >
                        <div className={cn(
                          'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                          notif.category === 'urgent' ? 'bg-titan-magenta/10' :
                          notif.category === 'financial' ? 'bg-titan-cyan/10' :
                          notif.category === 'client' ? 'bg-titan-purple/10' : 'bg-titan-lime/10'
                        )}>
                          <CategoryIcon className={cn('w-4 h-4', categoryColors[notif.category])} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn('font-mono-data text-xs truncate', notif.read ? 'text-white/60' : 'text-white/90')}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <div className="w-1.5 h-1.5 rounded-full bg-titan-cyan shrink-0" />
                            )}
                          </div>
                          <p className="font-mono-data text-[10px] text-white/30 mt-0.5 truncate">{notif.description}</p>
                          <p className="font-mono-data text-[10px] text-white/20 mt-1">{notif.timestamp}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
