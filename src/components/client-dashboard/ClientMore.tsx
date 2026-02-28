import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Bell,
  Rocket,
  LogOut,
  ChevronRight,
  FileText,
  Star,
  FolderOpen,
  Settings,
  Package,
  Receipt,
  BarChart3,
  Calendar,
  Palette,
  LifeBuoy,
  Users,
} from 'lucide-react';

export default function ClientMore({ 
  onNavigate, 
  notificationCount = 0 
}: { 
  onNavigate: (page: string) => void; 
  notificationCount?: number;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    {
      id: 'profile',
      label: 'Business Profile',
      description: 'Edit business info, social links',
      icon: User,
      color: '#00D9FF',
      badge: 0,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      description: 'Alerts & updates',
      icon: Bell,
      color: '#FFB800',
      badge: notificationCount,
    },
    {
      id: 'team_management',
      label: 'Team Members',
      description: 'Manage sub-users & permissions',
      icon: Users,
      color: '#7B61FF',
      badge: 0,
    },
    {
      id: 'files',
      label: 'Files & Assets',
      description: 'Shared files, approved deliverables',
      icon: FolderOpen,
      color: '#39FF14',
      badge: 0,
    },
    {
      id: 'package_details',
      label: 'Package Details',
      description: 'View plan, usage & upgrade',
      icon: Package,
      color: '#00D9FF',
      badge: 0,
    },
    {
      id: 'payment_history',
      label: 'Payment History',
      description: 'Wallet transactions & receipts',
      icon: Receipt,
      color: '#FFB800',
      badge: 0,
    },
    {
      id: 'boost',
      label: 'Boost Campaigns',
      description: 'Ad campaigns & media buying',
      icon: Rocket,
      color: '#7B61FF',
      badge: 0,
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      description: 'Performance overview & stats',
      icon: BarChart3,
      color: '#00D9FF',
      badge: 0,
    },
    {
      id: 'calendar',
      label: 'Content Calendar',
      description: 'Scheduled content & publishing',
      icon: Calendar,
      color: '#39FF14',
      badge: 0,
    },
    {
      id: 'brand_kit',
      label: 'Brand Kit',
      description: 'Logos, colors, fonts & guidelines',
      icon: Palette,
      color: '#7B61FF',
      badge: 0,
    },
    {
      id: 'support',
      label: 'Help & Support',
      description: 'Tickets & FAQ',
      icon: LifeBuoy,
      color: '#39FF14',
      badge: 0,
    },
    {
      id: 'settings',
      label: 'Account Settings',
      description: 'Security & notification preferences',
      icon: Settings,
      color: '#FF006E',
      badge: 0,
    },
  ];

  const secondaryItems = [
    { label: 'Terms & Policies', icon: FileText, color: '#ffffff30' },
    { label: 'Rate Us', icon: Star, color: '#FFB800' },
  ];

  return (
    <div className="h-full overflow-y-auto scrollbar-hide">
      <div className="px-4 pt-4 pb-6 space-y-5">
        {/* User Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-titan-cyan/30 to-titan-purple/30 border border-white/10 flex items-center justify-center">
              <span className="font-display font-bold text-lg text-white">
                {user?.display_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm text-white truncate">
                {user?.display_name || 'User'}
              </p>
              <p className="font-mono text-[10px] text-white/40 truncate">
                {user?.email || 'No email'}
              </p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-titan-cyan/10 border border-titan-cyan/20">
                <span className="w-1.5 h-1.5 rounded-full bg-titan-lime animate-pulse" />
                <span className="font-mono text-[9px] text-titan-cyan">Client</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Primary Menu */}
        <div className="space-y-2">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                onClick={() => onNavigate(item.id)}
                className="w-full flex items-center gap-3 glass-card p-3 active:scale-[0.98] transition-transform"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${item.color}12`, border: `1px solid ${item.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-display font-semibold text-xs text-white">{item.label}</p>
                  <p className="font-mono text-[10px] text-white/30 mt-0.5">{item.description}</p>
                </div>
                {item.badge > 0 && (
                  <span className="min-w-[20px] h-5 rounded-full bg-titan-magenta text-white text-[10px] font-mono font-bold flex items-center justify-center px-1.5">
                    {item.badge}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-white/15 shrink-0" />
              </motion.button>
            );
          })}
        </div>

        {/* Secondary Menu */}
        <div className="space-y-1">
          <p className="font-mono text-[10px] text-white/20 uppercase tracking-wider mb-2">More</p>
          {secondaryItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-white/[0.02] transition-colors"
              >
                <Icon className="w-4 h-4" style={{ color: item.color }} />
                <span className="font-mono text-xs text-white/50">{item.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-white/10 ml-auto" />
              </motion.button>
            );
          })}
        </div>

        {/* Logout */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-titan-magenta/8 border border-titan-magenta/15 active:scale-[0.97] transition-transform"
        >
          <LogOut className="w-4 h-4 text-titan-magenta/70" />
          <span className="font-display font-bold text-xs text-titan-magenta/70">Sign Out</span>
        </motion.button>

        {/* Version */}
        <p className="text-center font-mono text-[9px] text-white/15">
          TITAN DEV AI • v1.0.0
        </p>
      </div>
    </div>
  );
}
