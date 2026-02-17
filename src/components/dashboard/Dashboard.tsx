import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth, getRoleLabel } from '@/lib/auth';
import SidebarNav from './SidebarNav';
import TopCommandBar from './TopCommandBar';
import HeroMetrics from './HeroMetrics';
import ActivityFeed from './ActivityFeed';
import QuickActions from './QuickActions';
import AIInsightsWidget from './AIInsightsWidget';
import ProjectsKanban from './ProjectsKanban';
import FinancialPulseChart from './FinancialPulseChart';
import CommandPalette from './CommandPalette';
import AIAssistant from './AIAssistant';
import { MessagingHub } from '@/components/messaging';
import { TeamHub } from '@/components/team';
import { ClientHub } from '@/components/clients';
import { PackageHub } from '@/components/packages';
import { SettingsHub } from '@/components/settings';
import { ClientAssignmentCenter } from '@/components/assignments';
import {
  useDashboardMetrics,
  useDashboardActivity,
  useDashboardProjects,
  useDashboardAIInsights,
  useDashboardNotifications,
  useRevenueChartData,
} from '@/hooks/useDashboard';
import { subscribeToTable } from '@/lib/data-service';
import DebugPanel from '@/components/debug/DebugPanel';

export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [commandOpen, setCommandOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const { user } = useAuth();

  // Supabase data hooks
  const metrics = useDashboardMetrics();
  const activity = useDashboardActivity();
  const projects = useDashboardProjects();
  const aiInsights = useDashboardAIInsights();
  const notifications = useDashboardNotifications();
  const revenueChart = useRevenueChartData();

  // Real-time subscriptions for dashboard auto-refresh
  useEffect(() => {
    const unsubActivities = subscribeToTable('activities', () => {
      activity.refetch();
    });
    const unsubNotifications = subscribeToTable('notifications', () => {
      notifications.refetch();
    });
    const unsubDeliverables = subscribeToTable('deliverables', () => {
      projects.refetch();
    });
    const unsubUsage = subscribeToTable('package_usage', () => {
      metrics.refetch();
    });
    const unsubAssignments = subscribeToTable('client_assignments', () => {
      activity.refetch();
      notifications.refetch();
    });

    return () => {
      unsubActivities();
      unsubNotifications();
      unsubDeliverables();
      unsubUsage();
      unsubAssignments();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.refetch, notifications.refetch, projects.refetch, metrics.refetch]);

  // ⌘K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="h-screen bg-titan-bg relative overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      
      {/* Background mesh gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-titan-cyan/[0.03] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-titan-purple/[0.04] blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-titan-magenta/[0.02] blur-[100px]" />
      </div>

      {/* Sidebar */}
      <SidebarNav
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeItem={activeNav}
        onNavigate={setActiveNav}
      />

      {/* Main Content */}
      <div
        className={cn(
          'relative z-10 transition-all duration-300 h-screen flex flex-col',
          sidebarCollapsed ? 'ml-[68px]' : 'ml-[240px]'
        )}
      >
        {/* Top Bar */}
        <TopCommandBar
          onSearchOpen={() => setCommandOpen(true)}
          onAIToggle={() => setAiOpen(!aiOpen)}
          notifications={notifications.data}
          notificationsLoading={notifications.loading}
        />

        {/* Dashboard Content */}
        {activeNav === 'messaging' ? (
          <div className="flex-1 overflow-hidden">
            <MessagingHub />
          </div>
        ) : activeNav === 'team' ? (
          <div className="flex-1 overflow-hidden">
            <TeamHub />
          </div>
        ) : activeNav === 'clients' ? (
          <div className="flex-1 overflow-hidden">
            <ClientHub />
          </div>
        ) : activeNav === 'assignments' ? (
          <div className="flex-1 overflow-hidden">
            <ClientAssignmentCenter />
          </div>
        ) : activeNav === 'packages' ? (
          <div className="flex-1 overflow-hidden">
            <PackageHub />
          </div>
        ) : activeNav === 'settings' ? (
          <div className="flex-1 overflow-hidden">
            <SettingsHub />
          </div>
        ) : activeNav === 'debug' ? (
          <div className="flex-1 overflow-auto">
            <DebugPanel />
          </div>
        ) : (
        <div className="flex-1 flex">
          {/* Main Area */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Welcome Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-between"
            >
              <div>
                <h1 className="font-display font-extrabold text-2xl text-white">
                  Welcome back, <span className="text-gradient-cyan">{user?.display_name?.split(' ')[0] || 'User'}</span>
                </h1>
                <p className="font-mono-data text-xs text-white/30 mt-1">
                  {user ? `${getRoleLabel(user.role)} Dashboard` : "Here's what's happening with your agency today"}
                </p>
              </div>
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-titan-lime animate-pulse" />
                <span className="font-mono-data text-[10px] text-white/30">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </motion.div>

            {/* Hero Metrics */}
            <HeroMetrics data={metrics.data} loading={metrics.loading} />

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <QuickActions />
            </motion.div>

            {/* Financial Chart + AI Insights Row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="grid grid-cols-1 xl:grid-cols-5 gap-6"
            >
              <div className="xl:col-span-3">
                <FinancialPulseChart data={revenueChart.data} loading={revenueChart.loading} />
              </div>
              <div className="xl:col-span-2">
                <AIInsightsWidget data={aiInsights.data} loading={aiInsights.loading} />
              </div>
            </motion.div>

            {/* Kanban */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <ProjectsKanban data={projects.data} loading={projects.loading} />
            </motion.div>
          </div>

          {/* Right Rail - Activity Feed */}
          <div className="hidden xl:block w-[320px] border-l border-white/[0.06] shrink-0">
            <ActivityFeed data={activity.data} loading={activity.loading} />
          </div>
        </div>
        )}
      </div>

      {/* Command Palette */}
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />

      {/* AI Assistant */}
      <AIAssistant open={aiOpen} onClose={() => setAiOpen(false)} />

      {/* AI Floating Orb (when assistant is closed) */}
      {!aiOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-titan-purple/40 to-titan-cyan/20 border border-titan-purple/30 flex items-center justify-center shadow-lg shadow-titan-purple/20 hover:shadow-titan-purple/30 transition-all duration-300 group"
          onClick={() => setAiOpen(true)}
        >
          <div className="absolute inset-0 rounded-full animate-glow-pulse opacity-50" />
          <svg className="w-6 h-6 text-titan-purple group-hover:text-titan-cyan transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-titan-lime border-2 border-titan-bg animate-pulse" />
        </motion.button>
      )}
    </div>
  );
}
