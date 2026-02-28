import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth, getRoleLabel } from '@/lib/auth';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';
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
import DashboardCustomization from './DashboardCustomization';
import AgencyCommandCenter from './AgencyCommandCenter';
import { MessagingHub } from '@/components/messaging';
import { TeamHub, TeamWorkloadDashboard } from '@/components/team';
import { ClientHub } from '@/components/clients';
import { PackageHub } from '@/components/packages';
import { SettingsHub } from '@/components/settings';
import { ClientAssignmentCenter } from '@/components/assignments';
import { InvoiceManagement, CampaignManagement, WalletAdmin } from '@/components/finance';
import { ProjectsView } from '@/components/projects';
import { AIInsightsView } from '@/components/ai';
import { DeliverableFeed } from '@/components/deliverable-posts';
import { BulkImportTool } from '@/components/imports';
import {
  DesignerDashboard,
  MediaBuyerDashboard,
  AccountManagerDashboard,
  FinanceDashboard,
} from './role-dashboards';
import {
  useDashboardMetrics,
  useDashboardActivity,
  useDashboardProjects,
  useDashboardAIInsights,
  useDashboardNotifications,
  useRevenueChartData,
} from '@/hooks/useDashboard';
import { getDashboardLayout, type DashboardWidget } from '@/lib/data-service';
import DebugPanel from '@/components/debug/DebugPanel';
import SystemStatusBanner from './SystemStatusBanner';
import { useDataSource } from '@/hooks/useDataSource';
import { SystemModeBanner } from '@/components/ui/data-source-indicator';

export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [commandOpen, setCommandOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [widgetLayout, setWidgetLayout] = useState<DashboardWidget[]>([]);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const { user } = useAuth();

  // Supabase data hooks
  const metrics = useDashboardMetrics();
  const activity = useDashboardActivity();
  const projects = useDashboardProjects();
  const aiInsights = useDashboardAIInsights();
  const notifications = useDashboardNotifications();
  const revenueChart = useRevenueChartData();
  const dataSource = useDataSource();

  // Load dashboard layout preferences
  useEffect(() => {
    if (user?.id && activeNav === 'dashboard') {
      loadDashboardLayout();
    }
  }, [user?.id, activeNav]);

  const loadDashboardLayout = async () => {
    if (!user?.id) return;
    
    try {
      const layout = await getDashboardLayout(user.id);
      if (layout) {
        setWidgetLayout(layout.widgets);
      } else {
        // Default layout
        setWidgetLayout([
          { id: 'hero-metrics', visible: true, order: 0, size: 'large' },
          { id: 'activity-feed', visible: true, order: 1, size: 'medium' },
          { id: 'quick-actions', visible: true, order: 2, size: 'small' },
          { id: 'ai-insights', visible: true, order: 3, size: 'medium' },
          { id: 'projects-kanban', visible: true, order: 4, size: 'large' },
          { id: 'financial-pulse', visible: true, order: 5, size: 'medium' },
        ]);
      }
    } catch (error) {
      console.error('Failed to load dashboard layout:', error);
      // Use default layout on error
      setWidgetLayout([
        { id: 'hero-metrics', visible: true, order: 0, size: 'large' },
        { id: 'activity-feed', visible: true, order: 1, size: 'medium' },
        { id: 'quick-actions', visible: true, order: 2, size: 'small' },
        { id: 'ai-insights', visible: true, order: 3, size: 'medium' },
        { id: 'projects-kanban', visible: true, order: 4, size: 'large' },
        { id: 'financial-pulse', visible: true, order: 5, size: 'medium' },
      ]);
    } finally {
      setLayoutLoaded(true);
    }
  };

  // Realtime subscriptions are now handled inside each hook (useDashboardActivity, etc.)
  // No need for manual subscribeToTable calls here.

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
    <div className="h-screen bg-background relative overflow-hidden">
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
        mobileOpen={mobileSidebarOpen}
        onMobileToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* Main Content */}
      <div
        className={cn(
          'relative z-10 transition-all duration-300 h-screen flex flex-col',
          // Mobile: no margin (sidebar is overlay)
          'ml-0',
          // Desktop: respect sidebar width
          sidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-[240px]'
        )}
      >
        {/* Top Bar */}
        <TopCommandBar
          onSearchOpen={() => setCommandOpen(true)}
          onAIToggle={() => setAiOpen(!aiOpen)}
          notifications={notifications.data}
          notificationsLoading={notifications.loading}
          onNotificationsRefresh={notifications.refetch}
          onNavigate={setActiveNav}
          onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        {/* System Status Banner */}
        <SystemStatusBanner />

        {/* Demo Mode Banner */}
        {!dataSource.loading && <SystemModeBanner isLive={dataSource.isLive} />}

        {/* Dashboard Content */}
        <ErrorBoundary>
        {activeNav === 'command-center' ? (
          <AgencyCommandCenter onNavigate={setActiveNav} />
        ) : activeNav === 'messaging' ? (
          <div className="flex-1 overflow-hidden">
            <MessagingHub />
          </div>
        ) : activeNav === 'team' ? (
          <div className="flex-1 overflow-hidden">
            <TeamHub />
          </div>
        ) : activeNav === 'team-workload' ? (
          <div className="flex-1 overflow-hidden">
            <TeamWorkloadDashboard />
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
        ) : activeNav === 'finance' ? (
          <div className="flex-1 overflow-hidden">
            <InvoiceManagement />
          </div>
        ) : activeNav === 'media' ? (
          <div className="flex-1 overflow-hidden">
            <CampaignManagement />
          </div>
        ) : activeNav === 'wallet' ? (
          <div className="flex-1 overflow-hidden">
            <WalletAdmin />
          </div>
        ) : activeNav === 'debug' ? (
          <div className="flex-1 overflow-auto">
            <DebugPanel />
          </div>
        ) : activeNav === 'projects' ? (
          <div className="flex-1 overflow-hidden">
            <ProjectsView />
          </div>
        ) : activeNav === 'deliverables-feed' ? (
          <div className="flex-1 overflow-hidden">
            <DeliverableFeed
              currentUserId={user?.id || 'unknown'}
              currentUserType="team"
              currentUserName={user?.display_name || 'Admin'}
              showCreateForm={true}
              title="Deliverable Posts"
            />
          </div>
        ) : activeNav === 'ai-insights' ? (
          <div className="flex-1 overflow-hidden">
            <AIInsightsView />
          </div>
        ) : activeNav === 'bulk-import' ? (
          <div className="flex-1 overflow-auto">
            <BulkImportTool />
          </div>
        ) : user?.role === 'designer' ? (
          <DesignerDashboard />
        ) : user?.role === 'media_buyer' ? (
          <MediaBuyerDashboard />
        ) : user?.role === 'account_manager' ? (
          <AccountManagerDashboard />
        ) : user?.role === 'finance' ? (
          <FinanceDashboard />
        ) : (
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Main Area */}
          <div className="flex-1 p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-6 overflow-y-auto">
            {/* Welcome Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div>
                <h1 className="font-display font-extrabold text-xl sm:text-2xl text-white">
                  Welcome back, <span className="text-gradient-cyan">{user?.display_name?.split(' ')[0] || 'User'}</span>
                </h1>
                <p className="font-mono-data text-xs text-white/30 mt-1">
                  {user ? `${getRoleLabel(user.role)} Dashboard` : "Here's what's happening with your agency today"}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-1.5 h-1.5 rounded-full bg-titan-lime animate-pulse" />
                  <span className="font-mono-data text-[10px] text-white/30">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <button
                  onClick={() => setCustomizeOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors text-xs font-medium flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Customize
                </button>
              </div>
            </motion.div>

            {/* Hero Metrics */}
            {(metrics.error || activity.error || projects.error) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-titan-magenta/5 border border-titan-magenta/20"
              >
                <AlertTriangle className="w-4 h-4 text-titan-magenta shrink-0" />
                <p className="font-mono-data text-[11px] text-titan-magenta/80 flex-1">
                  {metrics.error || activity.error || projects.error}
                </p>
                <button
                  onClick={() => {
                    metrics.refetch();
                    activity.refetch();
                    projects.refetch();
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-titan-magenta/10 hover:bg-titan-magenta/20 transition-colors"
                >
                  <RefreshCw className="w-3 h-3 text-titan-magenta" />
                  <span className="font-mono-data text-[10px] text-titan-magenta">Retry</span>
                </button>
              </motion.div>
            )}
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
              className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6"
            >
              <div className="lg:col-span-3">
                <FinancialPulseChart data={revenueChart.data} loading={revenueChart.loading} />
              </div>
              <div className="lg:col-span-2">
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

          {/* Right Rail - Activity Feed (visible on xl, hidden on smaller screens but content is also shown in main area) */}
          <div className="hidden xl:block w-[320px] border-l border-white/[0.06] shrink-0">
            <ActivityFeed data={activity.data} loading={activity.loading} />
          </div>
        </div>
        )}
        </ErrorBoundary>
      </div>

      {/* Command Palette */}
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />

      {/* AI Assistant */}
      <AIAssistant open={aiOpen} onClose={() => setAiOpen(false)} />

      {/* Dashboard Customization */}
      <AnimatePresence>
        {customizeOpen && (
          <DashboardCustomization
            isOpen={customizeOpen}
            onClose={() => setCustomizeOpen(false)}
            onLayoutChange={() => loadDashboardLayout()}
          />
        )}
      </AnimatePresence>

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
