import { useEffect, useMemo } from 'react';
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
  Menu,
  X,
  LogOut,
  Shield,
  FileImage,
  BarChart3,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, getRoleLabel, type UserRole } from '@/lib/auth';
import { useSidebarBadges, type SidebarBadges } from '@/hooks/useSidebarBadges';

interface SidebarNavProps {
  collapsed: boolean;
  onToggle: () => void;
  activeItem: string;
  onNavigate: (id: string) => void;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  badgeKey?: keyof SidebarBadges; // dynamic badge from hook
  roles?: UserRole[]; // if undefined, show for all roles
}

const allNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'command-center', label: 'Command Center', icon: Shield, roles: ['super_admin'] },
  { id: 'messaging', label: 'Messaging', icon: MessageSquare, badgeKey: 'messaging' },
  { id: 'clients', label: 'Clients', icon: Users, badgeKey: 'clients', roles: ['super_admin', 'account_manager'] },
  { id: 'assignments', label: 'Assignments', icon: UserPlus, roles: ['super_admin', 'account_manager'] },
  { id: 'packages', label: 'Packages', icon: Package, badgeKey: 'packages', roles: ['super_admin', 'account_manager', 'finance'] },
  { id: 'projects', label: 'Projects', icon: FolderKanban, badgeKey: 'projects', roles: ['super_admin', 'designer', 'account_manager'] },
  { id: 'deliverables-feed', label: 'Deliverables', icon: FileImage, roles: ['super_admin', 'designer', 'account_manager'] },
  { id: 'finance', label: 'Invoices', icon: Receipt, badgeKey: 'finance', roles: ['super_admin', 'finance', 'account_manager'] },
  { id: 'wallet', label: 'Wallet', icon: Wallet, roles: ['super_admin', 'finance'] },
  { id: 'media', label: 'Campaigns', icon: Megaphone, badgeKey: 'media', roles: ['super_admin', 'media_buyer'] },
  { id: 'team', label: 'Team', icon: UserCog, badgeKey: 'team', roles: ['super_admin', 'account_manager'] },
  { id: 'team-workload', label: 'Workload', icon: BarChart3, roles: ['super_admin', 'account_manager'] },
  { id: 'bulk-import', label: 'Import Data', icon: Upload, roles: ['super_admin'] },
  { id: 'ai-insights', label: 'AI Insights', icon: Brain, roles: ['super_admin'] },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['super_admin'] },
  { id: 'debug', label: 'Debug Panel', icon: Zap, roles: ['super_admin'] },
];

export default function SidebarNav({ collapsed, onToggle, activeItem, onNavigate, mobileOpen, onMobileToggle }: SidebarNavProps) {
  const { user, logout, isDemoMode } = useAuth();
  const userRole = user?.role || 'super_admin';
  const { badges } = useSidebarBadges();

  // Filter nav items based on user role and attach dynamic badge counts
  const navItems = useMemo(() =>
    allNavItems
      .filter(item => {
        if (!item.roles) return true;
        return item.roles.includes(userRole);
      })
      .map(item => ({
        ...item,
        badge: item.badgeKey ? (badges[item.badgeKey] || undefined) : undefined,
      })),
    [userRole, badges]
  );

  // Close mobile sidebar on navigation
  const handleNavClick = (id: string) => {
    onNavigate(id);
    if (mobileOpen && onMobileToggle) {
      onMobileToggle();
    }
  };

  // Close mobile sidebar on escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen && onMobileToggle) {
        onMobileToggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileOpen, onMobileToggle]);

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen z-50 flex flex-col transition-all duration-300 ease-out',
          'bg-[#0D1029]/95 backdrop-blur-xl border-r border-white/[0.06]',
          // Desktop: normal behavior
          'hidden lg:flex',
          collapsed ? 'lg:w-[68px]' : 'lg:w-[240px]',
          // Mobile: slide in/out
          mobileOpen && '!flex w-[280px]',
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center h-14 lg:h-16 px-4 border-b border-white/[0.06]',
          collapsed && !mobileOpen ? 'justify-center' : 'gap-3'
        )}>
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-titan-cyan/20 to-titan-purple/20 border border-titan-cyan/30 shrink-0">
            <Zap className="w-5 h-5 text-titan-cyan" />
            <div className="absolute inset-0 rounded-lg animate-glow-pulse opacity-40" />
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="flex flex-col animate-fade-in-up flex-1 min-w-0">
              <span className="font-display font-extrabold text-sm text-white tracking-wider">TITAN DEV</span>
              <span className="font-mono-data text-[10px] text-titan-cyan/70 tracking-widest">AI PLATFORM</span>
            </div>
          )}
          {/* Mobile close button */}
          {mobileOpen && (
            <button
              onClick={onMobileToggle}
              className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 lg:py-4 px-2 space-y-0.5 lg:space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = activeItem === item.id;
            const Icon = item.icon;
            const showLabel = !collapsed || mobileOpen;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
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
                {showLabel && (
                  <span className="font-mono-data text-xs tracking-wide truncate">{item.label}</span>
                )}
                {showLabel && item.badge && (
                  <span className={cn(
                    'ml-auto text-[10px] font-mono-data px-1.5 py-0.5 rounded-full',
                    isActive
                      ? 'bg-titan-cyan/20 text-titan-cyan'
                      : 'bg-white/[0.06] text-white/40'
                  )}>
                    {item.badge}
                  </span>
                )}
                {!showLabel && item.badge && (
                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-titan-cyan" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className={cn(
          'px-2 py-3 border-t border-white/[0.06]',
          collapsed && !mobileOpen ? 'flex flex-col items-center gap-2' : ''
        )}>
          {/* Demo Mode Indicator */}
          {isDemoMode && (!collapsed || mobileOpen) && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 mb-2 rounded-md bg-amber-500/10 border border-amber-500/20">
              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-mono-data text-[10px] text-amber-400/90 tracking-wide">DEMO MODE</span>
            </div>
          )}
          {isDemoMode && collapsed && !mobileOpen && (
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-1" title="Demo Mode">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
            </div>
          )}

          {/* User Info */}
          {user && (
            <div className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg',
              collapsed && !mobileOpen ? 'justify-center px-0' : ''
            )}>
              <div className="relative shrink-0">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.display_name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-white/10"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-titan-cyan/30 to-titan-purple/30 flex items-center justify-center ring-2 ring-white/10">
                    <span className="text-xs font-bold text-white/80">
                      {user.display_name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0D1029]" />
              </div>
              {(!collapsed || mobileOpen) && (
                <div className="flex-1 min-w-0">
                  <p className="font-mono-data text-xs text-white/80 truncate">{user.display_name}</p>
                  <p className="font-mono-data text-[10px] text-titan-cyan/60 truncate">{getRoleLabel(user.role)}</p>
                </div>
              )}
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={() => logout()}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/30 hover:text-red-400/80 hover:bg-red-500/[0.06] transition-all duration-200 group',
              collapsed && !mobileOpen ? 'justify-center' : ''
            )}
            title="Sign out"
          >
            <LogOut className="w-4 h-4 shrink-0 group-hover:text-red-400/80 transition-colors" />
            {(!collapsed || mobileOpen) && (
              <span className="font-mono-data text-[10px] tracking-wide">Sign Out</span>
            )}
          </button>
        </div>

        {/* Collapse Toggle — desktop only */}
        <div className="hidden lg:block px-2 py-2 border-t border-white/[0.06]">
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
    </>
  );
}

export { Menu };
