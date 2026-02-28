import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import ClientHome from './ClientHome';
import ClientDeliverableFeed from './ClientDeliverableFeed';
import ClientBoost from './ClientBoost';
import ClientMessages from './ClientMessages';
import ClientBilling from './ClientBilling';
import ClientMore from './ClientMore';
import ClientProfilePage from './ClientProfile';
import ClientNotifications from './ClientNotifications';
import DeliverableRequestForm from './DeliverableRequestForm';
import ClientFiles from './ClientFiles';
import ClientSettings from './ClientSettings';
import ClientPackageDetails from './ClientPackageDetails';
import ClientPaymentHistory from './ClientPaymentHistory';
import ClientSupport from './ClientSupport';
import ClientAnalytics from './ClientAnalytics';
import ClientContentCalendar from './ClientContentCalendar';
import ClientBrandKit from './ClientBrandKit';
import ClientTeamManagement from './ClientTeamManagement';
import {
  Home,
  ClipboardList,
  MessageCircle,
  CreditCard,
  MoreHorizontal,
} from 'lucide-react';

type ClientTab = 'home' | 'tasks' | 'messages' | 'billing' | 'more';
type OverlayPage = 'profile' | 'notifications' | 'boost' | 'request_form' | 'files' | 'settings' | 'package_details' | 'payment_history' | 'support' | 'analytics' | 'calendar' | 'brand_kit' | 'team_management' | null;

const tabs: { id: ClientTab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const overlayVariants = {
  initial: { opacity: 0, x: '100%' },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: '100%' },
};

export default function ClientDashboard() {
  const [activeTab, setActiveTab] = useState<ClientTab>('home');
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [overlayPage, setOverlayPage] = useState<OverlayPage>(null);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Quick Action handler from ClientHome
  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'request_design':
        setOverlayPage('request_form');
        break;
      case 'new_campaign':
        setOverlayPage('boost');
        break;
      case 'view_invoices':
        setActiveTab('billing');
        break;
      case 'upgrade_package':
        setOverlayPage('package_details');
        break;
      case 'view_analytics':
        setOverlayPage('analytics');
        break;
    }
  }, []);

  // More menu navigation
  const handleMoreNavigate = useCallback((page: string) => {
    if (page === 'boost') {
      setOverlayPage('boost');
    } else if (
      page === 'profile' || page === 'notifications' || page === 'files' || 
      page === 'settings' || page === 'package_details' || page === 'payment_history' ||
      page === 'support' || page === 'analytics' || page === 'calendar' || page === 'brand_kit' ||
      page === 'team_management'
    ) {
      setOverlayPage(page as OverlayPage);
    }
  }, []);

  // Fetch real badge counts
  useEffect(() => {
    async function fetchCounts() {
      const clientId = user?.client_id;
      if (!clientId) return;

      try {
        // Unread messages
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('channels(unread_count)')
          .eq('client_id', clientId)
          .single();

        if (workspace) {
          const chs = (workspace.channels as Record<string, unknown>[]) || [];
          const totalUnread = chs.reduce((sum, ch) => sum + (Number(ch.unread_count) || 0), 0);
          setUnreadMessages(totalUnread);
        }
      } catch {
        // Workspace/channels may not exist for this client
      }

      try {
        // Pending tasks (from new deliverable_posts system)
        const { count } = await supabase
          .from('deliverable_posts')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('tenant_id', DEMO_TENANT_ID)
          .in('status', ['in_progress', 'client_review', 'internal_review', 'revision', 'draft']);

        setPendingTasks(count || 0);
      } catch {
        // Deliverables query failed
      }

      try {
        // Unread notifications
        const { count: notifCount } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', DEMO_TENANT_ID)
          .eq('read', false)
          .or(`target_client_id.eq.${clientId},target_client_id.is.null`);

        setUnreadNotifications(notifCount || 0);
      } catch {
        // Notifications query failed
      }
    }
    fetchCounts();
  }, [user?.client_id, activeTab, refreshKey]);

  return (
    <div className="h-screen bg-titan-bg flex flex-col overflow-hidden relative">
      {/* Status Bar Spacer (mobile) */}
      <div className="h-[env(safe-area-inset-top)] bg-titan-bg" />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + refreshKey}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="h-full"
          >
            {activeTab === 'home' && (
              <ClientHome onRefresh={handleRefresh} onQuickAction={handleQuickAction} />
            )}
            {activeTab === 'tasks' && (
              <ClientDeliverableFeed onNewRequest={() => setOverlayPage('request_form')} />
            )}
            {activeTab === 'messages' && <ClientMessages />}
            {activeTab === 'billing' && <ClientBilling />}
            {activeTab === 'more' && (
              <ClientMore
                onNavigate={handleMoreNavigate}
                notificationCount={unreadNotifications}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Overlay Pages (slide-in from right) */}
        <AnimatePresence>
          {overlayPage && (
            <motion.div
              key={overlayPage}
              variants={overlayVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-0 z-40 bg-titan-bg"
            >
              {overlayPage === 'profile' && (
                <ClientProfilePage onBack={() => setOverlayPage(null)} />
              )}
              {overlayPage === 'notifications' && (
                <ClientNotifications onBack={() => setOverlayPage(null)} />
              )}
              {overlayPage === 'request_form' && (
                <DeliverableRequestForm
                  onBack={() => setOverlayPage(null)}
                  onSuccess={handleRefresh}
                />
              )}
              {overlayPage === 'boost' && (
                <div className="h-full relative">
                  <ClientBoost />
                  <button
                    onClick={() => setOverlayPage(null)}
                    className="absolute top-4 left-4 z-50 w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <span className="text-white/50 text-lg">←</span>
                  </button>
                </div>
              )}
              {overlayPage === 'files' && (
                <ClientFiles onBack={() => setOverlayPage(null)} />
              )}
              {overlayPage === 'settings' && (
                <ClientSettings onBack={() => setOverlayPage(null)} />
              )}
              {overlayPage === 'package_details' && (
                <ClientPackageDetails onBack={() => setOverlayPage(null)} />
              )}
              {overlayPage === 'payment_history' && (
                <ClientPaymentHistory onBack={() => setOverlayPage(null)} />
              )}
              {overlayPage === 'support' && (
                <ClientSupport onBack={() => setOverlayPage(null)} />
              )}
              {overlayPage === 'analytics' && (
                <ClientAnalytics onBack={() => setOverlayPage(null)} />
              )}
              {overlayPage === 'calendar' && (
                <ClientContentCalendar onBack={() => setOverlayPage(null)} />
              )}
              {overlayPage === 'brand_kit' && (
                <ClientBrandKit onBack={() => setOverlayPage(null)} />
              )}
              {overlayPage === 'team_management' && (
                <ClientTeamManagement onBack={() => setOverlayPage(null)} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="shrink-0 border-t border-white/[0.06] bg-titan-bg/95 backdrop-blur-xl safe-bottom">
        <div className="flex items-center justify-around px-1 sm:px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && !overlayPage;
            const badge =
              tab.id === 'messages' ? unreadMessages :
              tab.id === 'tasks' ? pendingTasks :
              tab.id === 'more' ? unreadNotifications : 0;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setOverlayPage(null);
                  setActiveTab(tab.id);
                }}
                className={`relative flex flex-col items-center gap-0.5 px-2 sm:px-3 py-1.5 rounded-xl transition-all duration-200 active:scale-[0.92] ${
                  isActive ? 'text-titan-cyan' : 'text-white/30'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 sm:w-6 h-0.5 rounded-full bg-titan-cyan"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'drop-shadow-[0_0_8px_rgba(0,217,255,0.5)]' : ''}`} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-titan-magenta text-white text-[9px] font-mono font-bold flex items-center justify-center px-1">
                      {badge}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] sm:text-[10px] font-mono transition-all duration-200 ${isActive ? 'font-semibold' : ''}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
