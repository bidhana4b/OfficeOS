import { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import {
  Settings,
  Eye,
  EyeOff,
  RotateCcw,
  GripVertical,
  LayoutGrid,
  Bell,
  Clock,
  Moon,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import {
  getDashboardLayout,
  saveDashboardLayout,
  resetDashboardLayout,
  getNotificationPreferences,
  saveNotificationPreferences,
  type DashboardWidget,
  type NotificationPreferences,
} from '@/lib/data-service';

interface DashboardCustomizationProps {
  isOpen: boolean;
  onClose: () => void;
  onLayoutChange?: () => void;
}

const WIDGET_INFO = {
  'hero-metrics': {
    name: 'Hero Metrics',
    description: 'Key performance indicators at a glance',
  },
  'activity-feed': {
    name: 'Activity Feed',
    description: 'Recent activities and updates',
  },
  'quick-actions': {
    name: 'Quick Actions',
    description: 'Frequently used actions',
  },
  'ai-insights': {
    name: 'AI Insights',
    description: 'AI-powered recommendations',
  },
  'projects-kanban': {
    name: 'Projects Board',
    description: 'Kanban board for deliverables',
  },
  'financial-pulse': {
    name: 'Financial Pulse',
    description: 'Revenue and expense trends',
  },
};

export default function DashboardCustomization({
  isOpen,
  onClose,
  onLayoutChange,
}: DashboardCustomizationProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'layout' | 'notifications'>('layout');
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load current layout and preferences
  useEffect(() => {
    if (isOpen && user?.id) {
      loadData();
    }
  }, [isOpen, user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const [layout, prefs] = await Promise.all([
        getDashboardLayout(user.id),
        getNotificationPreferences(user.id),
      ]);

      if (layout) {
        setWidgets(layout.widgets);
      } else {
        // Default widgets
        setWidgets([
          { id: 'hero-metrics', visible: true, order: 0, size: 'large' },
          { id: 'activity-feed', visible: true, order: 1, size: 'medium' },
          { id: 'quick-actions', visible: true, order: 2, size: 'small' },
          { id: 'ai-insights', visible: true, order: 3, size: 'medium' },
          { id: 'projects-kanban', visible: true, order: 4, size: 'large' },
          { id: 'financial-pulse', visible: true, order: 5, size: 'medium' },
        ]);
      }

      if (prefs) {
        setNotifPrefs(prefs);
      } else {
        // Default preferences
        setNotifPrefs({
          id: '',
          user_profile_id: user.id,
          tenant_id: user.tenant_id || '',
          email_enabled: true,
          email_frequency: 'instant',
          push_enabled: true,
          categories: {
            client: true,
            team: true,
            financial: true,
            deliverable: true,
            system: true,
            assignment: true,
            message: true,
          },
          dnd_enabled: false,
          created_at: '',
          updated_at: '',
        });
      }
    } catch (error) {
      console.error('Failed to load customization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLayout = async () => {
    if (!user?.id || !user?.tenant_id) return;

    setSaving(true);
    try {
      // Update order based on current position
      const updatedWidgets = widgets.map((w, idx) => ({ ...w, order: idx }));
      await saveDashboardLayout(user.id, user.tenant_id, updatedWidgets);
      onLayoutChange?.();
      onClose();
    } catch (error) {
      console.error('Failed to save layout:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleResetLayout = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const layout = await resetDashboardLayout(user.id);
      setWidgets(layout.widgets);
      onLayoutChange?.();
    } catch (error) {
      console.error('Failed to reset layout:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWidget = (widgetId: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, visible: !w.visible } : w))
    );
  };

  const handleSaveNotifications = async () => {
    if (!user?.id || !user?.tenant_id || !notifPrefs) return;

    setSaving(true);
    try {
      await saveNotificationPreferences(user.id, user.tenant_id, {
        email_enabled: notifPrefs.email_enabled,
        email_frequency: notifPrefs.email_frequency,
        push_enabled: notifPrefs.push_enabled,
        categories: notifPrefs.categories,
        dnd_enabled: notifPrefs.dnd_enabled,
        dnd_start_time: notifPrefs.dnd_start_time,
        dnd_end_time: notifPrefs.dnd_end_time,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCategory = (category: keyof NotificationPreferences['categories']) => {
    if (!notifPrefs) return;
    setNotifPrefs({
      ...notifPrefs,
      categories: {
        ...notifPrefs.categories,
        [category]: !notifPrefs.categories[category],
      },
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-screen w-full max-w-2xl bg-black/90 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col"
      >
        {/* Header */}
        <div className="border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-titan-cyan to-titan-purple flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Dashboard Customization</h2>
                <p className="text-xs text-white/40">Personalize your workspace</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('layout')}
              className={cn(
                'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'layout'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              <LayoutGrid className="w-4 h-4 inline mr-2" />
              Widget Layout
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={cn(
                'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'notifications'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              <Bell className="w-4 h-4 inline mr-2" />
              Notifications
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-titan-cyan/30 border-t-titan-cyan rounded-full animate-spin" />
            </div>
          ) : activeTab === 'layout' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/60">
                  Drag to reorder, toggle visibility, or reset to defaults
                </p>
                <button
                  onClick={handleResetLayout}
                  disabled={saving}
                  className="text-xs text-titan-cyan hover:text-titan-cyan/80 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>

              <Reorder.Group axis="y" values={widgets} onReorder={setWidgets} className="space-y-2">
                {widgets.map((widget) => {
                  const info = WIDGET_INFO[widget.id as keyof typeof WIDGET_INFO];
                  return (
                    <Reorder.Item key={widget.id} value={widget}>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-colors cursor-move">
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-5 h-5 text-white/30" />
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-white">{info?.name}</h3>
                            <p className="text-xs text-white/40 mt-0.5">{info?.description}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleWidget(widget.id);
                            }}
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                              widget.visible
                                ? 'bg-titan-cyan/20 text-titan-cyan hover:bg-titan-cyan/30'
                                : 'bg-white/5 text-white/30 hover:bg-white/10'
                            )}
                          >
                            {widget.visible ? (
                              <Eye className="w-5 h-5" />
                            ) : (
                              <EyeOff className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>
          ) : notifPrefs ? (
            <div className="space-y-6">
              {/* Email Notifications */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Email Notifications
                </h3>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-white/80">Enable email notifications</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.email_enabled}
                      onChange={(e) =>
                        setNotifPrefs({ ...notifPrefs, email_enabled: e.target.checked })
                      }
                      className="w-5 h-5 rounded bg-white/5 border-white/10 text-titan-cyan focus:ring-titan-cyan"
                    />
                  </label>
                  {notifPrefs.email_enabled && (
                    <div>
                      <label className="text-xs text-white/60 mb-2 block">Frequency</label>
                      <select
                        value={notifPrefs.email_frequency}
                        onChange={(e) =>
                          setNotifPrefs({
                            ...notifPrefs,
                            email_frequency: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-titan-cyan"
                      >
                        <option value="instant">Instant</option>
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily Digest</option>
                        <option value="weekly">Weekly Summary</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Push Notifications */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Push Notifications
                </h3>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-white/80">Enable push notifications</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.push_enabled}
                      onChange={(e) =>
                        setNotifPrefs({ ...notifPrefs, push_enabled: e.target.checked })
                      }
                      className="w-5 h-5 rounded bg-white/5 border-white/10 text-titan-cyan focus:ring-titan-cyan"
                    />
                  </label>
                </div>
              </div>

              {/* Category Preferences */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Notification Categories</h3>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                  {Object.entries(notifPrefs.categories).map(([key, enabled]) => (
                    <label key={key} className="flex items-center justify-between cursor-pointer py-2">
                      <span className="text-sm text-white/80 capitalize">{key}</span>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => handleToggleCategory(key as any)}
                        className="w-5 h-5 rounded bg-white/5 border-white/10 text-titan-cyan focus:ring-titan-cyan"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Do Not Disturb */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Moon className="w-4 h-4" />
                  Do Not Disturb
                </h3>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-white/80">Enable DND mode</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.dnd_enabled}
                      onChange={(e) =>
                        setNotifPrefs({ ...notifPrefs, dnd_enabled: e.target.checked })
                      }
                      className="w-5 h-5 rounded bg-white/5 border-white/10 text-titan-cyan focus:ring-titan-cyan"
                    />
                  </label>
                  {notifPrefs.dnd_enabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-white/60 mb-2 block">Start Time</label>
                        <input
                          type="time"
                          value={notifPrefs.dnd_start_time || '22:00'}
                          onChange={(e) =>
                            setNotifPrefs({ ...notifPrefs, dnd_start_time: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-titan-cyan"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/60 mb-2 block">End Time</label>
                        <input
                          type="time"
                          value={notifPrefs.dnd_end_time || '08:00'}
                          onChange={(e) =>
                            setNotifPrefs({ ...notifPrefs, dnd_end_time: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-titan-cyan"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={activeTab === 'layout' ? handleSaveLayout : handleSaveNotifications}
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-titan-cyan to-titan-purple text-white hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
