import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import ClientHome from './ClientHome';
import ClientTasks from './ClientTasks';
import ClientBoost from './ClientBoost';
import ClientMessages from './ClientMessages';
import ClientBilling from './ClientBilling';
import {
  Home,
  ClipboardList,
  Rocket,
  MessageCircle,
  CreditCard,
  LogOut,
} from 'lucide-react';

type ClientTab = 'home' | 'tasks' | 'boost' | 'messages' | 'billing';

const tabs: { id: ClientTab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'boost', label: 'Boost', icon: Rocket },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function ClientDashboard() {
  const [activeTab, setActiveTab] = useState<ClientTab>('home');
  const { user, logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const unreadMessages = 3;
  const pendingTasks = 2;

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
            {activeTab === 'home' && <ClientHome onRefresh={handleRefresh} />}
            {activeTab === 'tasks' && <ClientTasks />}
            {activeTab === 'boost' && <ClientBoost />}
            {activeTab === 'messages' && <ClientMessages />}
            {activeTab === 'billing' && <ClientBilling />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="shrink-0 border-t border-white/[0.06] bg-titan-bg/95 backdrop-blur-xl">
        <div className="flex items-center justify-around px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const badge =
              tab.id === 'messages' ? unreadMessages :
              tab.id === 'tasks' ? pendingTasks : 0;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 active:scale-[0.92] ${
                  isActive ? 'text-titan-cyan' : 'text-white/30'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-titan-cyan"
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
                <span className={`text-[10px] font-mono transition-all duration-200 ${isActive ? 'font-semibold' : ''}`}>
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
