import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import {
  Package,
  Calendar,
  TrendingUp,
  Image,
  Video,
  PenTool,
  Rocket,
  BarChart3,
  Zap,
  ChevronRight,
  RefreshCw,
  ArrowUpRight,
  Clock,
  LogOut,
} from 'lucide-react';

interface PackageUsageItem {
  type: string;
  label: string;
  icon: string;
  used: number;
  total: number;
}

interface ClientData {
  businessName: string;
  packageName: string;
  renewalDate: string;
  daysLeft: number;
  walletBalance: number;
  usage: PackageUsageItem[];
  stats: {
    postsPublished: number;
    activeCampaigns: number;
    adSpend: number;
    leadsGenerated: number;
  };
}

const iconMap: Record<string, typeof Image> = {
  photo_graphics: Image,
  video_edit: Video,
  copywriting: PenTool,
  boost_campaign: Rocket,
};

function CircularProgress({ percent, color, size = 52, strokeWidth = 4 }: { percent: number; color: string; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
      />
    </svg>
  );
}

export default function ClientHome({ onRefresh, onQuickAction }: { onRefresh: () => void; onQuickAction?: (action: string) => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchClientData();
  }, []);

  async function fetchClientData() {
    setLoading(true);
    try {
      const clientId = user?.client_id;
      if (!clientId) { setLoading(false); return; }

      // Try using the RPC for a single optimized call
      const { data: portalData, error: rpcError } = await supabase.rpc('get_client_portal_data', {
        p_client_id: clientId,
      });

      if (!rpcError && portalData && !portalData.error) {
        const client = portalData.client;
        const wallet = portalData.wallet;
        const pkg = portalData.package;
        const usageArr = portalData.usage || [];
        const stats = portalData.stats || {};

        const usage: PackageUsageItem[] = usageArr.map((u: any) => ({
          type: u.deliverable_type,
          label: u.label || u.deliverable_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          icon: u.icon || u.deliverable_type,
          used: u.used || 0,
          total: u.total || 0,
        }));

        const renewalDate = pkg?.renewal_date || '';
        const daysLeft = renewalDate
          ? Math.max(0, Math.ceil((new Date(renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0;

        setClientData({
          businessName: client?.business_name || user?.display_name || 'Your Business',
          packageName: pkg?.package_name || '',
          renewalDate,
          daysLeft,
          walletBalance: wallet?.balance || 0,
          usage,
          stats: {
            postsPublished: stats.posts_published || 0,
            activeCampaigns: stats.active_campaigns || 0,
            adSpend: stats.ad_spend || 0,
            leadsGenerated: stats.leads_generated || 0,
          },
        });
        return;
      }

      // Fallback: individual queries if RPC not available
      const [clientRes, walletRes, pkgRes] = await Promise.allSettled([
        supabase.from('clients').select('*').eq('id', clientId).single(),
        supabase.from('client_wallets').select('*').eq('client_id', clientId).single(),
        supabase
          .from('client_packages')
          .select('*, package:packages(*)')
          .eq('client_id', clientId)
          .eq('status', 'active')
          .single(),
      ]);

      const client = clientRes.status === 'fulfilled' ? clientRes.value.data : null;
      const wallet = walletRes.status === 'fulfilled' ? walletRes.value.data : null;
      const pkg = pkgRes.status === 'fulfilled' ? pkgRes.value.data : null;

      let usage: PackageUsageItem[] = [];
      if (pkg) {
        const usageRes = await supabase
          .from('package_usage')
          .select('*')
          .eq('client_package_id', pkg.id);

        if (usageRes.data && usageRes.data.length > 0) {
          usage = usageRes.data.map((u: any) => ({
            type: u.deliverable_type,
            label: u.deliverable_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            icon: u.deliverable_type,
            used: u.used,
            total: u.total,
          }));
        }
      }

      // Get real stats
      const [campaignCountRes, deliveredCountRes] = await Promise.allSettled([
        supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('client_id', clientId).in('status', ['active', 'live']),
        supabase.from('deliverable_posts').select('id', { count: 'exact', head: true }).eq('client_id', clientId).in('status', ['approved', 'delivered']),
      ]);

      const campaignCount = campaignCountRes.status === 'fulfilled' ? campaignCountRes.value.count : 0;
      const deliveredCount = deliveredCountRes.status === 'fulfilled' ? deliveredCountRes.value.count : 0;

      const renewalDate = pkg?.renewal_date || '';
      const daysLeft = renewalDate
        ? Math.max(0, Math.ceil((new Date(renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

      setClientData({
        businessName: client?.business_name || user?.display_name || 'Your Business',
        packageName: (pkg?.package as any)?.name || '',
        renewalDate,
        daysLeft,
        walletBalance: wallet?.balance || 0,
        usage,
        stats: {
          postsPublished: deliveredCount || 0,
          activeCampaigns: campaignCount || 0,
          adSpend: 0,
          leadsGenerated: 0,
        },
      });
    } catch (err) {
      console.error('Failed to fetch client data:', err);
      // Show error state, no mock fallback
      setClientData({
        businessName: user?.display_name || 'Your Business',
        packageName: '',
        renewalDate: '',
        daysLeft: 0,
        walletBalance: 0,
        usage: [],
        stats: { postsPublished: 0, activeCampaigns: 0, adSpend: 0, leadsGenerated: 0 },
      });
    } finally {
      setLoading(false);
    }
  }

  const handlePullRefresh = async () => {
    setRefreshing(true);
    await fetchClientData();
    setRefreshing(false);
    onRefresh();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-titan-cyan/30 border-t-titan-cyan rounded-full animate-spin" />
          <p className="font-mono text-xs text-white/30">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <Package className="w-12 h-12 text-white/10" />
          <div>
            <h3 className="font-display font-bold text-white/60 text-lg">No Client Data</h3>
            <p className="font-mono text-xs text-white/30 mt-1">
              {user?.client_id ? 'Unable to load your data. Please try refreshing.' : 'No client account linked to this user.'}
            </p>
          </div>
          <button
            onClick={fetchClientData}
            className="px-4 py-2 rounded-lg bg-titan-cyan/10 text-titan-cyan font-mono text-xs hover:bg-titan-cyan/20 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const data = clientData;
  const overallUsage = data.usage.length > 0
    ? Math.round(data.usage.reduce((sum, u) => sum + (u.total > 0 ? (u.used / u.total) * 100 : 0), 0) / data.usage.length)
    : 0;
  const isLowUsage = data.usage.some((u) => u.total > 0 && (u.used / u.total) * 100 > 80);

  return (
    <div className="h-full overflow-y-auto scrollbar-hide">
      {/* Pull to Refresh Indicator */}
      {refreshing && (
        <div className="flex items-center justify-center py-3">
          <RefreshCw className="w-4 h-4 text-titan-cyan animate-spin" />
        </div>
      )}

      <div className="px-4 pt-4 pb-6 space-y-5">
        {/* Header with Logout */}
        <div className="flex items-center justify-between">
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-mono text-[10px] text-white/30 uppercase tracking-wider"
            >
              Welcome back
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display font-extrabold text-xl text-white mt-0.5"
            >
              {data.businessName}
            </motion.h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePullRefresh}
              className="w-9 h-9 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
            >
              <RefreshCw className={`w-4 h-4 text-white/40 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="w-9 h-9 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
            >
              <LogOut className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </div>

        {/* Package Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative overflow-hidden rounded-2xl border border-white/[0.08]"
          style={{
            background: 'linear-gradient(135deg, rgba(0,217,255,0.08) 0%, rgba(123,97,255,0.08) 50%, rgba(255,0,110,0.05) 100%)',
          }}
        >
          <div className="absolute inset-0 backdrop-blur-xl" />
          <div className="relative p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-titan-cyan/15 border border-titan-cyan/25 flex items-center justify-center">
                  <Package className="w-5 h-5 text-titan-cyan" />
                </div>
                <div>
                  {data.packageName ? (
                    <>
                      <p className="font-display font-bold text-sm text-white">{data.packageName}</p>
                      {data.daysLeft > 0 && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-white/30" />
                          <p className="font-mono text-[10px] text-white/40">
                            Renews in <span className="text-titan-cyan">{data.daysLeft} days</span>
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-display font-bold text-sm text-white/40">No Package Assigned</p>
                      <p className="font-mono text-[10px] text-white/25 mt-0.5">Contact your agency to get started</p>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] text-white/30">Wallet</p>
                <p className="font-display font-bold text-lg text-titan-lime">
                  ৳{data.walletBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Package Usage */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-sm text-white/80 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-titan-cyan" />
              Package Usage
            </h2>
            <span className="font-mono text-[10px] text-white/30">{data.usage.length > 0 ? `${overallUsage}% overall` : 'No data'}</span>
          </div>

          {data.usage.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {data.usage.map((item, i) => {
                  const percent = item.total > 0 ? Math.round((item.used / item.total) * 100) : 0;
                  const isHigh = percent > 80;
                  const color = isHigh ? '#FF006E' : percent > 50 ? '#FFB800' : '#00D9FF';
                  const Icon = iconMap[item.type] || Package;

                  return (
                    <motion.div
                      key={item.type}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      className="glass-card p-3 relative overflow-hidden"
                    >
                      {isHigh && (
                        <div className="absolute inset-0 bg-titan-magenta/[0.04] animate-pulse" />
                      )}
                      <div className="relative flex items-center gap-3">
                        <div className="relative">
                          <CircularProgress percent={percent} color={color} size={48} strokeWidth={3.5} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Icon className="w-4 h-4" style={{ color }} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-[10px] text-white/50 truncate">{item.label}</p>
                          <p className="font-display font-bold text-sm text-white">
                            {item.used}<span className="text-white/30 font-normal">/{item.total}</span>
                          </p>
                          <div className="w-full h-1 rounded-full bg-white/[0.06] mt-1.5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percent}%` }}
                              transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
                              className="h-full rounded-full"
                              style={{ background: color }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {isLowUsage && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  onClick={() => onQuickAction?.('upgrade_package')}
                  className="w-full mt-3 py-2.5 rounded-xl bg-titan-magenta/10 border border-titan-magenta/25 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                >
                  <Zap className="w-4 h-4 text-titan-magenta" />
                  <span className="font-display font-bold text-xs text-titan-magenta">
                    Running low — Upgrade Package
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-titan-magenta" />
                </motion.button>
              )}
            </>
          ) : (
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
              <Package className="w-8 h-8 text-white/10 mb-2" />
              <p className="font-mono text-xs text-white/30">No package usage data available</p>
              <p className="font-mono text-[10px] text-white/20 mt-1">Usage will appear once a package is assigned</p>
            </div>
          )}
        </motion.div>

        {/* Performance Snapshot */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-titan-lime" />
            Performance Snapshot
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Posts Published', value: data.stats.postsPublished.toString(), icon: Image, color: '#00D9FF' },
              { label: 'Active Campaigns', value: data.stats.activeCampaigns.toString(), icon: Rocket, color: '#7B61FF' },
              { label: 'Ad Spend', value: data.stats.adSpend > 0 ? `৳${(data.stats.adSpend / 1000).toFixed(0)}K` : '৳0', icon: BarChart3, color: '#FF006E' },
              { label: 'Leads Generated', value: data.stats.leadsGenerated.toString(), icon: TrendingUp, color: '#39FF14' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 + i * 0.06 }}
                  className="glass-card p-3 active:scale-[0.97] transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: `${stat.color}12`, border: `1px solid ${stat.color}25` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                    </div>
                  </div>
                  <p className="font-display font-extrabold text-lg text-white">{stat.value}</p>
                  <p className="font-mono text-[10px] text-white/35 mt-0.5">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="font-display font-bold text-sm text-white/80 mb-3">Quick Actions</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {[
              { label: 'Request Design', icon: Image, color: '#00D9FF', action: 'request_design' },
              { label: 'New Campaign', icon: Rocket, color: '#7B61FF', action: 'new_campaign' },
              { label: 'View Invoices', icon: Calendar, color: '#FFB800', action: 'view_invoices' },
              { label: 'Analytics', icon: BarChart3, color: '#39FF14', action: 'view_analytics' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => onQuickAction?.(action.action)}
                  className="flex-none flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all active:scale-[0.95]"
                  style={{
                    background: `${action.color}08`,
                    borderColor: `${action.color}20`,
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: action.color }} />
                  <span className="font-mono text-xs text-white/70 whitespace-nowrap">{action.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
