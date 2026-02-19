import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Megaphone,
  UserCog,
  Brain,
  ChevronLeft,
  ChevronRight,
  Zap,
  MessageSquare,
  Package,
  Settings,
  UserPlus,
  Wallet,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, type UserRole } from '@/lib/auth';

interface SidebarNavProps {
  collapsed: boolean;
  onToggle: () => void;
  activeItem: string;
  onNavigate: (id: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
  roles?: UserRole[]; // if undefined, show for all roles
}

const allNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'messaging', label: 'Messaging', icon: MessageSquare, badge: 23 },
  { id: 'clients', label: 'Clients', icon: Users, badge: 12, roles: ['super_admin', 'account_manager'] },
  { id: 'assignments', label: 'Assignments', icon: UserPlus, roles: ['super_admin', 'account_manager'] },
  { id: 'packages', label: 'Packages', icon: Package, badge: 4, roles: ['super_admin', 'account_manager', 'finance'] },
  { id: 'projects', label: 'Projects', icon: FolderKanban, badge: 7, roles: ['super_admin', 'designer', 'account_manager'] },
  { id: 'finance', label: 'Invoices', icon: Receipt, roles: ['super_admin', 'finance', 'account_manager'] },
  { id: 'wallet', label: 'Wallet', icon: Wallet, roles: ['super_admin', 'finance'] },
  { id: 'media', label: 'Campaigns', icon: Megaphone, badge: 3, roles: ['super_admin', 'media_buyer'] },
  { id: 'team', label: 'Team', icon: UserCog, badge: 52, roles: ['super_admin', 'account_manager'] },
  { id: 'ai-insights', label: 'AI Insights', icon: Brain, roles: ['super_admin'] },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['super_admin'] },
  { id: 'debug', label: 'Debug Panel', icon: Zap, roles: ['super_admin'] },
];

export default function SidebarNav({ collapsed, onToggle, activeItem, onNavigate }: SidebarNavProps) {
  const { user } = useAuth();
  const userRole = user?.role || 'super_admin';

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => {
    if (!item.roles) return true; // show for all roles
    return item.roles.includes(userRole);
  });

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300 ease-out',
        'bg-[#0D1029]/90 backdrop-blur-xl border-r border-white/[0.06]',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-white/[0.06]',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-titan-cyan/20 to-titan-purple/20 border border-titan-cyan/30">
          <Zap className="w-5 h-5 text-titan-cyan" />
          <div className="absolute inset-0 rounded-lg animate-glow-pulse opacity-40" />
        </div>
        {!collapsed && (
          <div className="flex flex-col animate-fade-in-up">
            <span className="font-display font-extrabold text-sm text-white tracking-wider">TITAN DEV</span>
            <span className="font-mono-data text-[10px] text-titan-cyan/70 tracking-widest">AI PLATFORM</span>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const isActive = activeItem === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                isActive
                  ? 'bg-titan-cyan/10 text-titan-cyan'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-titan-cyan glow-cyan" />
              )}
              <Icon className={cn(
                'w-5 h-5 shrink-0 transition-colors',
                isActive ? 'text-titan-cyan' : 'text-white/40 group-hover:text-white/70'
              )} />
              {!collapsed && (
                <span className="font-mono-data text-xs tracking-wide truncate">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className={cn(
                  'ml-auto text-[10px] font-mono-data px-1.5 py-0.5 rounded-full',
                  isActive
                    ? 'bg-titan-cyan/20 text-titan-cyan'
                    : 'bg-white/[0.06] text-white/40'
                )}>
                  {item.badge}
                </span>
              )}
              {collapsed && item.badge && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-titan-cyan" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-2 py-3 border-t border-white/[0.06]">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all duration-200"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="font-mono-data text-[10px] tracking-wide">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
