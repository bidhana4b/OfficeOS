import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  Plus,
  Search,
  TrendingUp,
  DollarSign,
  Target,
  Zap,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Trash2,
  BarChart3,
  Eye,
  MousePointerClick,
  Edit3,
  Users,
  Calendar,
  RefreshCw,
  Filter,
  MoreVertical,
  X,
  Save,
  Wallet,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  getCampaigns,
  createCampaign,
  updateCampaignStatus,
  updateCampaignSpend,
  deleteCampaign,
  getClientListForSelect,
  subscribeToTable,
  getCampaignsForExport,
} from '@/lib/data-service';
import { exportCSV, campaignExportColumns } from '@/lib/export-utils';
import { DataSourceIndicator } from '@/components/ui/data-source-indicator';
import { supabase } from '@/lib/supabase';

interface Campaign {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  platform: string;
  budget: number;
  spent: number;
  goal: string | null;
  target_audience: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  performance: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
  clients?: { business_name: string };
}

interface ClientOption {
  id: string;
  business_name: string;
}

interface WalletInfo {
  client_id: string;
  balance: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; bgColor: string; borderColor: string }> = {
  draft: { label: 'Draft', color: 'text-white/50', icon: Clock, bgColor: 'bg-white/[0.06]', borderColor: 'border-white/[0.1]' },
  requested: { label: 'Requested', color: 'text-titan-amber', icon: Clock, bgColor: 'bg-titan-amber/10', borderColor: 'border-titan-amber/20' },
  approved: { label: 'Approved', color: 'text-titan-cyan', icon: CheckCircle2, bgColor: 'bg-titan-cyan/10', borderColor: 'border-titan-cyan/20' },
  active: { label: 'Active', color: 'text-titan-lime', icon: Play, bgColor: 'bg-titan-lime/10', borderColor: 'border-titan-lime/20' },
  live: { label: 'Live', color: 'text-titan-lime', icon: Zap, bgColor: 'bg-titan-lime/10', borderColor: 'border-titan-lime/20' },
  paused: { label: 'Paused', color: 'text-titan-cyan', icon: Pause, bgColor: 'bg-titan-cyan/10', borderColor: 'border-titan-cyan/20' },
  completed: { label: 'Completed', color: 'text-titan-purple', icon: CheckCircle2, bgColor: 'bg-titan-purple/10', borderColor: 'border-titan-purple/20' },
  cancelled: { label: 'Cancelled', color: 'text-white/30', icon: XCircle, bgColor: 'bg-white/[0.04]', borderColor: 'border-white/[0.08]' },
  rejected: { label: 'Rejected', color: 'text-titan-magenta', icon: XCircle, bgColor: 'bg-titan-magenta/10', borderColor: 'border-titan-magenta/20' },
};

const platformConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  facebook: { icon: '📘', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  instagram: { icon: '📸', color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
  google: { icon: '🔍', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  tiktok: { icon: '🎵', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  youtube: { icon: '📺', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  linkedin: { icon: '💼', color: 'text-blue-300', bgColor: 'bg-blue-400/10' },
  twitter: { icon: '🐦', color: 'text-sky-400', bgColor: 'bg-sky-500/10' },
};

function getMockPerformance(campaign: Campaign) {
  const perf = campaign.performance as Record<string, number> | null;
  if (perf && perf.impressions) return perf;
  const hash = campaign.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const impressions = Math.floor(((hash % 100) + 20) * 1000);
  const clicks = Math.floor(impressions * (0.02 + (hash % 5) * 0.005));
  const conversions = Math.floor(clicks * (0.05 + (hash % 3) * 0.02));
  const ctr = clicks / impressions * 100;
  const cpc = campaign.spent > 0 ? campaign.spent / clicks : 0;
  const cpa = conversions > 0 ? campaign.spent / conversions : 0;
  return { impressions, clicks, conversions, ctr, cpc, cpa };
}

export default function CampaignManagement() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSpend, setEditingSpend] = useState(false);
  const [spendAmount, setSpendAmount] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showPerformance, setShowPerformance] = useState(false);

  const [createForm, setCreateForm] = useState({
    client_id: '',
    name: '',
    description: '',
    platform: 'facebook',
    budget: 0,
    goal: '',
    target_audience: '',
    start_date: '',
    end_date: '',
  });

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCampaigns({ status: activeFilter });
      setCampaigns(data as Campaign[]);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  const fetchClients = useCallback(async () => {
    try {
      const data = await getClientListForSelect();
      setClients(data as ClientOption[]);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  }, []);

  const fetchWallets = useCallback(async () => {
    try {
      const sb = supabase;
      if (!sb) return;
      const { data } = await sb.from('client_wallets').select('client_id, balance');
      if (data) setWallets(data as WalletInfo[]);
    } catch (err) {
      console.error('Failed to fetch wallets:', err);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchClients();
    fetchWallets();
  }, [fetchCampaigns, fetchClients, fetchWallets]);

  useEffect(() => {
    const unsub = subscribeToTable('campaigns', () => fetchCampaigns());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCampaigns]);

  const filteredCampaigns = campaigns.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.clients?.business_name?.toLowerCase().includes(q) ||
        c.platform?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((s, c) => s + (c.spent || 0), 0);
  const activeCampaigns = campaigns.filter((c) => c.status === 'active' || c.status === 'live').length;
  const completedCampaigns = campaigns.filter((c) => c.status === 'completed').length;

  const handleCreate = async () => {
    if (!createForm.client_id || !createForm.name || createForm.budget <= 0) {
      setError('Please fill in required fields (Name, Client, Budget)');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createCampaign({
        client_id: createForm.client_id,
        name: createForm.name,
        platform: createForm.platform,
        budget: createForm.budget,
        goal: createForm.goal || undefined,
        target_audience: createForm.target_audience || undefined,
        start_date: createForm.start_date || undefined,
        end_date: createForm.end_date || undefined,
      });
      setShowCreateDialog(false);
      setCreateForm({ client_id: '', name: '', description: '', platform: 'facebook', budget: 0, goal: '', target_audience: '', start_date: '', end_date: '' });
      fetchCampaigns();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateCampaignStatus(id, status);
      fetchCampaigns();
      if (selectedCampaign?.id === id) {
        setSelectedCampaign({ ...selectedCampaign, status });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleSpendUpdate = async () => {
    if (!selectedCampaign || spendAmount < 0) return;
    try {
      await updateCampaignSpend(selectedCampaign.id, spendAmount);
      setEditingSpend(false);
      fetchCampaigns();
      setSelectedCampaign({ ...selectedCampaign, spent: spendAmount });
    } catch (err) {
      console.error('Failed to update spend:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign(id);
      fetchCampaigns();
      setShowDetailDialog(false);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const getClientWallet = (clientId: string) => wallets.find(w => w.client_id === clientId);

  const filterTabs = [
    { id: 'all', label: 'All', count: campaigns.length },
    { id: 'requested', label: 'Requested', count: campaigns.filter((c) => c.status === 'requested').length },
    { id: 'active', label: 'Active', count: campaigns.filter((c) => c.status === 'active' || c.status === 'live').length },
    { id: 'paused', label: 'Paused', count: campaigns.filter((c) => c.status === 'paused').length },
    { id: 'completed', label: 'Completed', count: campaigns.filter((c) => c.status === 'completed').length },
    { id: 'cancelled', label: 'Cancelled', count: campaigns.filter((c) => c.status === 'cancelled').length },
  ];

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-extrabold text-xl text-white flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-titan-purple/10 border border-titan-purple/20">
                <Megaphone className="w-5 h-5 text-titan-purple" />
              </div>
              Campaign Manager
            </h2>
            <div className="flex items-center gap-2 mt-1.5 ml-[42px]">
              <p className="font-mono text-xs text-white/30">
                Manage media buying campaigns, boost requests & ad spend tracking
              </p>
              <DataSourceIndicator isRealData={campaigns.length > 0} size="xs" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchCampaigns()} className="border-white/[0.08] text-white/40 hover:bg-white/[0.04] hover:text-white/60 gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const data = await getCampaignsForExport();
                  exportCSV(data, campaignExportColumns, 'titan_campaigns');
                } catch (err) {
                  console.error('Export failed:', err);
                }
              }}
              className="border-white/[0.08] text-white/40 hover:bg-white/[0.04] hover:text-white/60 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-titan-purple/15 border border-titan-purple/30 text-titan-purple hover:bg-titan-purple/25 font-display font-bold text-sm gap-2">
              <Plus className="w-4 h-4" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Budget', value: `৳${totalBudget.toLocaleString()}`, icon: DollarSign, color: 'text-white/80', border: 'border-white/[0.08]', bg: 'bg-white/[0.02]' },
            { label: 'Total Spent', value: `৳${totalSpent.toLocaleString()}`, sub: totalBudget > 0 ? `${Math.round(totalSpent / totalBudget * 100)}% of budget` : '0%', icon: TrendingUp, color: 'text-titan-magenta', border: 'border-titan-magenta/20', bg: 'bg-titan-magenta/[0.03]' },
            { label: 'Active Campaigns', value: String(activeCampaigns), sub: `${completedCampaigns} completed`, icon: Zap, color: 'text-titan-lime', border: 'border-titan-lime/20', bg: 'bg-titan-lime/[0.03]' },
            { label: 'Remaining Budget', value: `৳${(totalBudget - totalSpent).toLocaleString()}`, sub: totalBudget > 0 ? `${Math.round((totalBudget - totalSpent) / totalBudget * 100)}% available` : 'N/A', icon: Target, color: 'text-titan-cyan', border: 'border-titan-cyan/20', bg: 'bg-titan-cyan/[0.03]' },
          ].map((stat) => (
            <div key={stat.label} className={cn('rounded-xl border p-4 flex items-center gap-3 transition-all hover:scale-[1.01]', stat.border, stat.bg)}>
              <div className={cn('p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]', stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider">{stat.label}</p>
                <p className={cn('font-display font-extrabold text-lg leading-tight', stat.color)}>{stat.value}</p>
                {stat.sub && <p className="font-mono text-[9px] text-white/25 mt-0.5">{stat.sub}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs + Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {filterTabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveFilter(tab.id)} className={cn('px-3 py-1.5 rounded-lg font-mono text-xs transition-all whitespace-nowrap', activeFilter === tab.id ? 'bg-titan-purple/10 text-titan-purple border border-titan-purple/20' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]')}>
                {tab.label}
                {tab.count > 0 && <span className="ml-1.5 text-[10px] opacity-60">{tab.count}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search campaigns..." className="pl-9 bg-white/[0.04] border-white/[0.08] text-sm h-8 text-white/80 placeholder:text-white/30 font-mono" />
            </div>
            <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={cn('p-1.5 transition-all', viewMode === 'grid' ? 'bg-titan-purple/10 text-titan-purple' : 'text-white/30 hover:text-white/50')}>
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('list')} className={cn('p-1.5 transition-all', viewMode === 'list' ? 'bg-titan-purple/10 text-titan-purple' : 'text-white/30 hover:text-white/50')}>
                <Filter className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Grid / List */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {loading ? (
            <div className={cn('gap-4', viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'flex flex-col')}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.04]" />
              ))}
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4">
                <Megaphone className="w-10 h-10 text-white/10" />
              </div>
              <p className="font-display font-bold text-sm text-white/40">No campaigns found</p>
              <p className="font-mono text-xs text-white/20 mt-1 mb-4">Create your first campaign to get started</p>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-titan-purple/15 border border-titan-purple/30 text-titan-purple hover:bg-titan-purple/25 font-display font-bold text-sm gap-2">
                <Plus className="w-4 h-4" />
                New Campaign
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredCampaigns.map((campaign, i) => {
                  const config = statusConfig[campaign.status] || statusConfig.draft;
                  const StatusIcon = config.icon;
                  const spentPercent = campaign.budget > 0 ? Math.min(100, Math.round((campaign.spent / campaign.budget) * 100)) : 0;
                  const perf = getMockPerformance(campaign);
                  const platform = platformConfig[campaign.platform.toLowerCase()];

                  return (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => { setSelectedCampaign(campaign); setSpendAmount(campaign.spent || 0); setShowDetailDialog(true); }}
                      className="group rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] cursor-pointer transition-all p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn('p-1.5 rounded-lg shrink-0', platform?.bgColor || 'bg-white/[0.04]')}>
                            <span className="text-base">{platform?.icon || '🌐'}</span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-display font-bold text-sm text-white/90 line-clamp-1">{campaign.name}</h3>
                            <p className="font-mono text-[10px] text-white/40 line-clamp-1">{campaign.clients?.business_name || 'Unknown Client'} · {campaign.platform}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border shrink-0', config.borderColor, config.bgColor, config.color)}>
                          <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                          {config.label}
                        </Badge>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between mb-1">
                          <span className="font-mono text-[10px] text-white/40">Budget Utilization</span>
                          <span className="font-mono text-[10px] text-white/60">৳{(campaign.spent || 0).toLocaleString()} / ৳{(campaign.budget || 0).toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', spentPercent > 90 ? 'bg-titan-magenta' : spentPercent > 60 ? 'bg-titan-amber' : 'bg-titan-cyan')} style={{ width: `${spentPercent}%` }} />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="px-2 py-1.5 rounded-lg bg-white/[0.03]">
                          <p className="font-mono text-[8px] text-white/30 uppercase">Impr.</p>
                          <p className="font-display font-bold text-xs text-white/70">{((perf.impressions as number) / 1000).toFixed(1)}K</p>
                        </div>
                        <div className="px-2 py-1.5 rounded-lg bg-white/[0.03]">
                          <p className="font-mono text-[8px] text-white/30 uppercase">Clicks</p>
                          <p className="font-display font-bold text-xs text-white/70">{(perf.clicks as number).toLocaleString()}</p>
                        </div>
                        <div className="px-2 py-1.5 rounded-lg bg-white/[0.03]">
                          <p className="font-mono text-[8px] text-white/30 uppercase">CTR</p>
                          <p className="font-display font-bold text-xs text-titan-cyan">{(perf.ctr as number).toFixed(2)}%</p>
                        </div>
                      </div>

                      {campaign.goal && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Target className="w-3 h-3 text-white/30" />
                          <span className="font-mono text-[10px] text-white/40 line-clamp-1">{campaign.goal}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06]">
                        <span className="font-mono text-[10px] text-white/30">
                          {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No dates'}
                          {campaign.end_date ? ` → ${new Date(campaign.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {(() => { const w = getClientWallet(campaign.client_id); return w ? <span className="font-mono text-[9px] text-titan-cyan/40 flex items-center gap-0.5"><Wallet className="w-2.5 h-2.5" />৳{w.balance.toLocaleString()}</span> : null; })()}
                          <span className={cn('font-display font-extrabold text-xs', spentPercent > 90 ? 'text-titan-magenta/80' : 'text-white/50')}>{spentPercent}%</span>
                        </div>
                      </div>

                      {(campaign.status === 'active' || campaign.status === 'live') && (
                        <div className="mt-2 pt-2 border-t border-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                          <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(campaign.id, 'paused'); }} className="flex-1 px-2 py-1 rounded-md bg-titan-cyan/10 text-titan-cyan font-mono text-[10px] hover:bg-titan-cyan/20 transition-all flex items-center justify-center gap-1">
                            <Pause className="w-2.5 h-2.5" /> Pause
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(campaign.id, 'completed'); }} className="flex-1 px-2 py-1 rounded-md bg-titan-purple/10 text-titan-purple font-mono text-[10px] hover:bg-titan-purple/20 transition-all flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Complete
                          </button>
                        </div>
                      )}
                      {campaign.status === 'paused' && (
                        <div className="mt-2 pt-2 border-t border-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(campaign.id, 'active'); }} className="w-full px-2 py-1 rounded-md bg-titan-lime/10 text-titan-lime font-mono text-[10px] hover:bg-titan-lime/20 transition-all flex items-center justify-center gap-1">
                            <Play className="w-2.5 h-2.5" /> Resume
                          </button>
                        </div>
                      )}
                      {(campaign.status === 'requested' || campaign.status === 'draft') && (
                        <div className="mt-2 pt-2 border-t border-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(campaign.id, 'active'); }} className="w-full px-2 py-1 rounded-md bg-titan-lime/10 text-titan-lime font-mono text-[10px] hover:bg-titan-lime/20 transition-all flex items-center justify-center gap-1">
                            <Play className="w-2.5 h-2.5" /> Activate
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            /* List View */
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-3 px-4 py-2 font-mono text-[10px] text-white/30 uppercase tracking-wider">
                <div className="col-span-3">Campaign</div>
                <div className="col-span-2">Client</div>
                <div className="col-span-1">Platform</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2">Budget / Spent</div>
                <div className="col-span-2">Progress</div>
                <div className="col-span-1">Actions</div>
              </div>
              <AnimatePresence mode="popLayout">
                {filteredCampaigns.map((campaign, i) => {
                  const config = statusConfig[campaign.status] || statusConfig.draft;
                  const spentPercent = campaign.budget > 0 ? Math.min(100, Math.round((campaign.spent / campaign.budget) * 100)) : 0;
                  return (
                    <motion.div key={campaign.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ delay: i * 0.02 }} onClick={() => { setSelectedCampaign(campaign); setSpendAmount(campaign.spent || 0); setShowDetailDialog(true); }} className="grid grid-cols-12 gap-3 items-center px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] cursor-pointer transition-all">
                      <div className="col-span-3 flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{platformConfig[campaign.platform.toLowerCase()]?.icon || '🌐'}</span>
                        <span className="font-display font-bold text-sm text-white/90 truncate">{campaign.name}</span>
                      </div>
                      <div className="col-span-2 font-mono text-xs text-white/50 truncate">{campaign.clients?.business_name || '—'}</div>
                      <div className="col-span-1 font-mono text-xs text-white/40 capitalize">{campaign.platform}</div>
                      <div className="col-span-1">
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border-0', config.bgColor, config.color)}>{config.label}</Badge>
                      </div>
                      <div className="col-span-2 font-mono text-xs">
                        <span className="text-white/60">৳{(campaign.spent || 0).toLocaleString()}</span>
                        <span className="text-white/20"> / </span>
                        <span className="text-white/40">৳{(campaign.budget || 0).toLocaleString()}</span>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', spentPercent > 90 ? 'bg-titan-magenta' : spentPercent > 60 ? 'bg-titan-amber' : 'bg-titan-cyan')} style={{ width: `${spentPercent}%` }} />
                          </div>
                          <span className="font-mono text-[10px] text-white/40 w-8 text-right">{spentPercent}%</span>
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-end"><MoreVertical className="w-4 h-4 text-white/20" /></div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#0D1029] border border-white/[0.08] text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-white flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-titan-purple/10 border border-titan-purple/20"><Plus className="w-4 h-4 text-titan-purple" /></div>
              Create New Campaign
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <div className="p-3 rounded-lg bg-titan-magenta/10 border border-titan-magenta/20 font-mono text-xs text-titan-magenta flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            <div>
              <Label className="text-xs text-white/50 font-mono">Campaign Name *</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="e.g. Ramadan Facebook Ads" className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm" />
            </div>

            <div>
              <Label className="text-xs text-white/50 font-mono">Description</Label>
              <Textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Campaign description..." className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm min-h-[60px] resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-white/50 font-mono">Client *</Label>
                <select value={createForm.client_id} onChange={(e) => setCreateForm({ ...createForm, client_id: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono focus:border-titan-purple/40 focus:outline-none">
                  <option value="">Select Client</option>
                  {clients.map((c) => (<option key={c.id} value={c.id} className="bg-[#0D1029]">{c.business_name}</option>))}
                </select>
                {createForm.client_id && (() => { const w = getClientWallet(createForm.client_id); return w ? <div className="flex items-center gap-1.5 mt-1.5"><Wallet className="w-3 h-3 text-titan-cyan/60" /><span className="font-mono text-[10px] text-titan-cyan/60">Wallet: ৳{w.balance.toLocaleString()}</span></div> : null; })()}
              </div>
              <div>
                <Label className="text-xs text-white/50 font-mono">Platform *</Label>
                <select value={createForm.platform} onChange={(e) => setCreateForm({ ...createForm, platform: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono focus:border-titan-purple/40 focus:outline-none">
                  {['Facebook', 'Instagram', 'Google', 'TikTok', 'YouTube', 'LinkedIn', 'Twitter'].map((p) => (
                    <option key={p} value={p.toLowerCase()} className="bg-[#0D1029]">{platformConfig[p.toLowerCase()]?.icon || '🌐'} {p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-white/50 font-mono">Budget (৳) *</Label>
                <Input type="number" value={createForm.budget || ''} onChange={(e) => setCreateForm({ ...createForm, budget: parseFloat(e.target.value) || 0 })} placeholder="50000" className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs text-white/50 font-mono">Goal</Label>
                <Input value={createForm.goal} onChange={(e) => setCreateForm({ ...createForm, goal: e.target.value })} placeholder="e.g. 1000 leads" className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-white/50 font-mono">Target Audience</Label>
              <Input value={createForm.target_audience} onChange={(e) => setCreateForm({ ...createForm, target_audience: e.target.value })} placeholder="e.g. 18-35, Dhaka, Male & Female" className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-white/50 font-mono">Start Date</Label>
                <Input type="date" value={createForm.start_date} onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })} className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs text-white/50 font-mono">End Date</Label>
                <Input type="date" value={createForm.end_date} onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })} className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-white/[0.08] text-white/60 hover:bg-white/[0.04]">Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-titan-purple/15 border border-titan-purple/30 text-titan-purple hover:bg-titan-purple/25 font-display font-bold">
              {creating ? 'Creating...' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={(open) => { setShowDetailDialog(open); if (!open) { setEditingSpend(false); setShowPerformance(false); } }}>
        <DialogContent className="bg-[#0D1029] border border-white/[0.08] text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-white flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-titan-purple/10 border border-titan-purple/20"><Megaphone className="w-4 h-4 text-titan-purple" /></div>
              {selectedCampaign?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedCampaign && (() => {
            const config = statusConfig[selectedCampaign.status] || statusConfig.draft;
            const spentPercent = selectedCampaign.budget > 0 ? Math.min(100, Math.round((selectedCampaign.spent / selectedCampaign.budget) * 100)) : 0;
            const wallet = getClientWallet(selectedCampaign.client_id);
            const perf = getMockPerformance(selectedCampaign);

            return (
              <div className="space-y-5 py-2">
                {/* Info Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1">Client</p>
                    <p className="font-display font-bold text-sm text-white/90">{selectedCampaign.clients?.business_name || '—'}</p>
                    {wallet && <div className="flex items-center gap-1 mt-1"><Wallet className="w-3 h-3 text-titan-cyan/50" /><span className="font-mono text-[10px] text-titan-cyan/50">৳{wallet.balance.toLocaleString()}</span></div>}
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1">Platform</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{platformConfig[selectedCampaign.platform?.toLowerCase()]?.icon || '🌐'}</span>
                      <span className="font-mono text-sm text-white/90 capitalize">{selectedCampaign.platform}</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1">Status</p>
                    <Badge variant="outline" className={cn('text-xs border', config.borderColor, config.bgColor, config.color)}>
                      <config.icon className="w-3 h-3 mr-1" />{config.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1">Duration</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-white/30" />
                      <span className="font-mono text-xs text-white/60">
                        {selectedCampaign.start_date ? new Date(selectedCampaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not set'}
                        {selectedCampaign.end_date ? ` → ${new Date(selectedCampaign.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Budget & Spend Card */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-display font-bold text-sm text-white/80 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-titan-amber" />Budget & Spend
                    </h4>
                    {!editingSpend && (
                      <Button variant="outline" size="sm" onClick={() => { setEditingSpend(true); setSpendAmount(selectedCampaign.spent || 0); }} className="h-7 text-[10px] border-white/[0.08] text-white/40 hover:bg-white/[0.04] hover:text-white/60 gap-1">
                        <Edit3 className="w-3 h-3" />Update Spend
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <p className="font-mono text-[10px] text-white/40 uppercase">Budget</p>
                      <p className="font-display font-extrabold text-lg text-white mt-0.5">৳{(selectedCampaign.budget || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-titan-magenta/[0.04] border border-titan-magenta/10">
                      <p className="font-mono text-[10px] text-titan-magenta/60 uppercase">Spent</p>
                      <p className="font-display font-extrabold text-lg text-titan-magenta mt-0.5">৳{(selectedCampaign.spent || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-titan-lime/[0.04] border border-titan-lime/10">
                      <p className="font-mono text-[10px] text-titan-lime/60 uppercase">Remaining</p>
                      <p className="font-display font-extrabold text-lg text-titan-lime mt-0.5">৳{((selectedCampaign.budget || 0) - (selectedCampaign.spent || 0)).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-white/40">Budget Utilization</span>
                      <span className={cn('font-display font-extrabold text-xs', spentPercent > 90 ? 'text-titan-magenta' : spentPercent > 60 ? 'text-titan-amber' : 'text-titan-cyan')}>{spentPercent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${spentPercent}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className={cn('h-full rounded-full', spentPercent > 90 ? 'bg-gradient-to-r from-titan-magenta/80 to-titan-magenta' : spentPercent > 60 ? 'bg-gradient-to-r from-titan-amber/80 to-titan-amber' : 'bg-gradient-to-r from-titan-cyan/80 to-titan-cyan')} />
                    </div>
                  </div>

                  {editingSpend && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-white/[0.06]">
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <Label className="text-xs text-white/50 font-mono">Total Spent Amount (৳)</Label>
                          <Input type="number" value={spendAmount || ''} onChange={(e) => setSpendAmount(parseFloat(e.target.value) || 0)} className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm" />
                        </div>
                        <Button onClick={handleSpendUpdate} className="bg-titan-lime/15 border border-titan-lime/30 text-titan-lime hover:bg-titan-lime/25 font-display font-bold text-sm gap-1.5">
                          <Save className="w-3.5 h-3.5" />Save
                        </Button>
                        <Button variant="outline" onClick={() => setEditingSpend(false)} className="border-white/[0.08] text-white/40 hover:bg-white/[0.04]">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Performance Metrics */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <button onClick={() => setShowPerformance(!showPerformance)} className="w-full flex items-center justify-between">
                    <h4 className="font-display font-bold text-sm text-white/80 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-titan-cyan" />Performance Metrics
                    </h4>
                    <motion.div animate={{ rotate: showPerformance ? 180 : 0 }}>
                      <TrendingUp className="w-4 h-4 text-white/30" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {showPerformance && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <div className="flex items-center gap-1.5 mb-1"><Eye className="w-3 h-3 text-titan-cyan/60" /><span className="font-mono text-[10px] text-white/40 uppercase">Impressions</span></div>
                            <p className="font-display font-extrabold text-lg text-white/90">{(perf.impressions as number).toLocaleString()}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <div className="flex items-center gap-1.5 mb-1"><MousePointerClick className="w-3 h-3 text-titan-purple/60" /><span className="font-mono text-[10px] text-white/40 uppercase">Clicks</span></div>
                            <p className="font-display font-extrabold text-lg text-white/90">{(perf.clicks as number).toLocaleString()}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <div className="flex items-center gap-1.5 mb-1"><Target className="w-3 h-3 text-titan-lime/60" /><span className="font-mono text-[10px] text-white/40 uppercase">Conversions</span></div>
                            <p className="font-display font-extrabold text-lg text-white/90">{(perf.conversions as number).toLocaleString()}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <div className="flex items-center gap-1.5 mb-1"><TrendingUp className="w-3 h-3 text-titan-amber/60" /><span className="font-mono text-[10px] text-white/40 uppercase">CTR</span></div>
                            <p className="font-display font-extrabold text-lg text-titan-amber">{(perf.ctr as number).toFixed(2)}%</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <div className="flex items-center gap-1.5 mb-1"><DollarSign className="w-3 h-3 text-titan-magenta/60" /><span className="font-mono text-[10px] text-white/40 uppercase">CPC</span></div>
                            <p className="font-display font-extrabold text-lg text-white/90">৳{(perf.cpc as number).toFixed(2)}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <div className="flex items-center gap-1.5 mb-1"><Users className="w-3 h-3 text-titan-cyan/60" /><span className="font-mono text-[10px] text-white/40 uppercase">CPA</span></div>
                            <p className="font-display font-extrabold text-lg text-white/90">৳{(perf.cpa as number).toFixed(2)}</p>
                          </div>
                        </div>
                        <p className="font-mono text-[9px] text-white/20 mt-2 text-center">* Performance data shown is estimated. Connect ad platform for real metrics.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Goal & Audience */}
                {(selectedCampaign.goal || selectedCampaign.target_audience) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedCampaign.goal && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                        <Target className="w-4 h-4 text-titan-lime/60 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-mono text-[10px] text-white/40 uppercase">Goal</p>
                          <p className="font-mono text-xs text-white/70 mt-0.5">{selectedCampaign.goal}</p>
                        </div>
                      </div>
                    )}
                    {selectedCampaign.target_audience && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                        <Globe className="w-4 h-4 text-titan-purple/60 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-mono text-[10px] text-white/40 uppercase">Audience</p>
                          <p className="font-mono text-xs text-white/70 mt-0.5">{selectedCampaign.target_audience}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.06]">
                  {(selectedCampaign.status === 'requested' || selectedCampaign.status === 'approved' || selectedCampaign.status === 'draft') && (
                    <Button onClick={() => handleStatusUpdate(selectedCampaign.id, 'active')} className="flex-1 min-w-[120px] bg-titan-lime/15 border border-titan-lime/30 text-titan-lime hover:bg-titan-lime/25 font-display font-bold text-sm gap-2">
                      <Play className="w-3.5 h-3.5" /> Activate
                    </Button>
                  )}
                  {(selectedCampaign.status === 'active' || selectedCampaign.status === 'live') && (
                    <>
                      <Button onClick={() => handleStatusUpdate(selectedCampaign.id, 'paused')} className="flex-1 min-w-[120px] bg-titan-cyan/15 border border-titan-cyan/30 text-titan-cyan hover:bg-titan-cyan/25 font-display font-bold text-sm gap-2">
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </Button>
                      <Button onClick={() => handleStatusUpdate(selectedCampaign.id, 'completed')} className="flex-1 min-w-[120px] bg-titan-purple/15 border border-titan-purple/30 text-titan-purple hover:bg-titan-purple/25 font-display font-bold text-sm gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                      </Button>
                    </>
                  )}
                  {selectedCampaign.status === 'paused' && (
                    <>
                      <Button onClick={() => handleStatusUpdate(selectedCampaign.id, 'active')} className="flex-1 min-w-[120px] bg-titan-lime/15 border border-titan-lime/30 text-titan-lime hover:bg-titan-lime/25 font-display font-bold text-sm gap-2">
                        <Play className="w-3.5 h-3.5" /> Resume
                      </Button>
                      <Button onClick={() => handleStatusUpdate(selectedCampaign.id, 'completed')} className="flex-1 min-w-[120px] bg-titan-purple/15 border border-titan-purple/30 text-titan-purple hover:bg-titan-purple/25 font-display font-bold text-sm gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                      </Button>
                    </>
                  )}
                  <Button onClick={() => handleDelete(selectedCampaign.id)} variant="outline" className="border-titan-magenta/20 text-titan-magenta/60 hover:bg-titan-magenta/10 hover:text-titan-magenta text-sm gap-2">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>

                <p className="font-mono text-[10px] text-white/20 text-center">
                  Created: {new Date(selectedCampaign.created_at).toLocaleString()}
                  {selectedCampaign.updated_at && ` · Updated: ${new Date(selectedCampaign.updated_at).toLocaleString()}`}
                </p>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
