import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Shield,
  Users,
  UserCheck,
  Package,
  MessageSquare,
  Megaphone,
  DollarSign,
  Brain,
  Paintbrush,
  Activity,
  ShieldAlert,
  Save,
  History,
  Crown,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SettingsSection } from './types';
import { changeLog as mockChangeLog } from './mock-data';
import { useChangeLog } from '@/hooks/useSettings';
import OrganizationControl from './OrganizationControl';
import UsersRolesControl from './UsersRolesControl';
import TeamControl from './TeamControl';
import ClientControl from './ClientControl';
import PackageControl from './PackageControl';
import MessagingControl from './MessagingControl';
import MediaBuyingControl from './MediaBuyingControl';
import FinanceControl from './FinanceControl';
import AIAutomationControl from './AIAutomationControl';
import AppearanceControl from './AppearanceControl';
import MonitoringControl from './MonitoringControl';
import SecurityControl from './SecurityControl';

const settingsSections: {
  id: SettingsSection;
  label: string;
  icon: any;
  description: string;
  color: string;
  badge?: string;
}[] = [
  { id: 'organization', label: 'Organization', icon: Building2, description: 'Company & branches', color: 'text-titan-cyan' },
  { id: 'users-roles', label: 'Users & Roles', icon: Shield, description: 'Permissions & access', color: 'text-titan-purple' },
  { id: 'teams', label: 'Teams', icon: Users, description: 'Team control engine', color: 'text-titan-lime' },
  { id: 'clients', label: 'Clients', icon: UserCheck, description: 'Client rules & health', color: 'text-titan-magenta' },
  { id: 'packages', label: 'Packages', icon: Package, description: 'Package engine', color: 'text-titan-cyan' },
  { id: 'messaging', label: 'Messaging', icon: MessageSquare, description: 'Channel & message rules', color: 'text-blue-400' },
  { id: 'media-buying', label: 'Media Buying', icon: Megaphone, description: 'Boost & wallet rules', color: 'text-orange-400' },
  { id: 'finance', label: 'Finance', icon: DollarSign, description: 'Invoices & ledger', color: 'text-titan-lime' },
  { id: 'ai-automation', label: 'AI & Automation', icon: Brain, description: 'AI model & automations', color: 'text-titan-purple' },
  { id: 'appearance', label: 'Appearance', icon: Paintbrush, description: 'Themes & layout', color: 'text-pink-400' },
  { id: 'monitoring', label: 'Monitoring', icon: Activity, description: 'System health & logs', color: 'text-titan-cyan', badge: '2' },
  { id: 'security', label: 'Security', icon: ShieldAlert, description: 'Backup & emergency', color: 'text-titan-magenta' },
];

export default function SettingsHub() {
  const changeLogQuery = useChangeLog();
  const changeLog = changeLogQuery.data.length > 0
    ? changeLogQuery.data.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        user: (r.user_name as string) || 'System',
        action: (r.action as string) || '',
        section: (r.section as string) || '',
        timestamp: (r.created_at as string) || '',
      }))
    : mockChangeLog;

  const [activeSection, setActiveSection] = useState<SettingsSection>('organization');
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = searchQuery
    ? settingsSections.filter(
        (s) =>
          s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : settingsSections;

  const renderSection = () => {
    switch (activeSection) {
      case 'organization': return <OrganizationControl />;
      case 'users-roles': return <UsersRolesControl />;
      case 'teams': return <TeamControl />;
      case 'clients': return <ClientControl />;
      case 'packages': return <PackageControl />;
      case 'messaging': return <MessagingControl />;
      case 'media-buying': return <MediaBuyingControl />;
      case 'finance': return <FinanceControl />;
      case 'ai-automation': return <AIAutomationControl />;
      case 'appearance': return <AppearanceControl />;
      case 'monitoring': return <MonitoringControl />;
      case 'security': return <SecurityControl />;
      default: return null;
    }
  };

  return (
    <div className="h-full flex bg-transparent">
      {/* Settings Sidebar */}
      <div className="w-[260px] shrink-0 border-r border-white/[0.06] flex flex-col bg-white/[0.01]">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-titan-cyan/20 to-titan-magenta/20 border border-white/10 flex items-center justify-center">
              <Crown className="w-4 h-4 text-titan-cyan" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-sm text-white tracking-wide">CONTROL CENTER</h1>
              <p className="font-mono text-[9px] text-titan-cyan/50 tracking-widest">SUPER ADMIN</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono placeholder:text-white/20 focus:border-titan-cyan/30 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto scrollbar-hide">
          {filteredSections.map((section) => {
            const isActive = activeSection === section.id;
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                  isActive
                    ? 'bg-white/[0.06] border border-white/[0.1]'
                    : 'border border-transparent hover:bg-white/[0.03]'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-titan-cyan" />
                )}
                <Icon className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? section.color : 'text-white/30 group-hover:text-white/50'
                )} />
                <div className="flex-1 text-left min-w-0">
                  <p className={cn(
                    'font-mono text-[11px] tracking-wide truncate',
                    isActive ? 'text-white/90' : 'text-white/50 group-hover:text-white/70'
                  )}>
                    {section.label}
                  </p>
                  <p className="font-mono text-[9px] text-white/20 truncate">{section.description}</p>
                </div>
                {section.badge && (
                  <span className="px-1.5 py-0.5 rounded-full bg-titan-magenta/20 text-[8px] font-mono text-titan-magenta">
                    {section.badge}
                  </span>
                )}
                <ChevronRight className={cn(
                  'w-3 h-3 shrink-0 transition-all',
                  isActive ? 'text-white/30' : 'text-white/10 group-hover:text-white/20'
                )} />
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-white/[0.06] space-y-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/30 hover:text-white/50 hover:bg-white/[0.03] font-mono text-[10px] transition-all"
          >
            <History className="w-3.5 h-3.5" />
            Change History
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Action Bar */}
        <div className="h-14 px-6 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-sm text-white/70">
              {settingsSections.find((s) => s.id === activeSection)?.label}
            </span>
            <span className="font-mono text-[10px] text-white/20">
              {settingsSections.find((s) => s.id === activeSection)?.description}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-titan-cyan/10 border border-titan-cyan/20"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-titan-cyan animate-pulse" />
              <span className="font-mono text-[9px] text-titan-cyan">Use each section's Save button</span>
            </motion.div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Section Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Change History Rail */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0 border-l border-white/[0.06] bg-white/[0.01] overflow-hidden"
              >
                <div className="w-[280px] h-full flex flex-col">
                  <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                    <h3 className="font-display font-bold text-xs text-white/70 flex items-center gap-2">
                      <History className="w-3.5 h-3.5 text-titan-cyan/50" />
                      Change History
                    </h3>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/50"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {changeLog.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-titan-cyan/10 text-titan-cyan/60 border border-titan-cyan/20 uppercase">
                            {entry.section}
                          </span>
                          <span className="font-mono text-[9px] text-white/20">{entry.timestamp}</span>
                        </div>
                        <p className="font-mono text-[10px] text-white/50 mt-1">
                          <span className="text-white/30">{entry.field}:</span>{' '}
                          <span className="text-titan-magenta/60 line-through">{entry.oldValue}</span>{' '}
                          <span className="text-white/20">→</span>{' '}
                          <span className="text-titan-lime/70">{entry.newValue}</span>
                        </p>
                        <p className="font-mono text-[9px] text-white/20 mt-1">by {entry.changedBy}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
