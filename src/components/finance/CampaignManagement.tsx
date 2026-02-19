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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  getCampaigns,
  createCampaign,
  updateCampaignStatus,
  updateCampaignSpend,
  deleteCampaign,
  getClientListForSelect,
  subscribeToTable,
} from '@/lib/data-service';

interface Campaign {
  id: string;
  client_id: string;
  name: string;
  platform: string;
  budget: number;
  spent: number;
  goal: string | null;
  target_audience: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  clients?: { business_name: string };
}

interface ClientOption {
  id: string;
  business_name: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; bgColor: string }> = {
  requested: { label: 'Requested', color: 'text-titan-amber', icon: Clock, bgColor: 'bg-titan-amber/10' },
  active: { label: 'Active', color: 'text-titan-lime', icon: Play, bgColor: 'bg-titan-lime/10' },
  paused: { label: 'Paused', color: 'text-titan-cyan', icon: Pause, bgColor: 'bg-titan-cyan/10' },
  completed: { label: 'Completed', color: 'text-titan-purple', icon: CheckCircle2, bgColor: 'bg-titan-purple/10' },
  cancelled: { label: 'Cancelled', color: 'text-white/30', icon: XCircle, bgColor: 'bg-white/[0.04]' },
};

const platformIcons: Record<string, string> = {
  facebook: '📘',
  instagram: '📸',
  google: '🔍',
  tiktok: '🎵',
  youtube: '📺',
  linkedin: '💼',
  twitter: '🐦',
};

export default function CampaignManagement() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    client_id: '',
    name: '',
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

  useEffect(() => {
    fetchCampaigns();
    fetchClients();
  }, [fetchCampaigns, fetchClients]);

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
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const avgROI = totalSpent > 0 ? ((totalBudget - totalSpent) / totalSpent * 100) : 0;

  const handleCreate = async () => {
    if (!createForm.client_id || !createForm.name || createForm.budget <= 0) {
      setError('Please fill in required fields');
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
      setCreateForm({
        client_id: '',
        name: '',
        platform: 'facebook',
        budget: 0,
        goal: '',
        target_audience: '',
        start_date: '',
        end_date: '',
      });
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
    } catch (err) {
      console.error('Failed to update status:', err);
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

  const filterTabs = [
    { id: 'all', label: 'All', count: campaigns.length },
    { id: 'requested', label: 'Requested', count: campaigns.filter((c) => c.status === 'requested').length },
    { id: 'active', label: 'Active', count: campaigns.filter((c) => c.status === 'active').length },
    { id: 'paused', label: 'Paused', count: campaigns.filter((c) => c.status === 'paused').length },
    { id: 'completed', label: 'Completed', count: campaigns.filter((c) => c.status === 'completed').length },
  ];

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-extrabold text-xl text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-titan-purple" />
              Campaign Manager
            </h2>
            <p className="font-mono text-xs text-white/30 mt-1">
              Manage media buying campaigns and boost requests
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-titan-purple/15 border border-titan-purple/30 text-titan-purple hover:bg-titan-purple/25 font-display font-bold text-sm gap-2"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total Budget', value: `৳${totalBudget.toLocaleString()}`, icon: DollarSign, color: 'text-white/80', border: 'border-white/[0.08]' },
            { label: 'Total Spent', value: `৳${totalSpent.toLocaleString()}`, icon: TrendingUp, color: 'text-titan-magenta', border: 'border-titan-magenta/20' },
            { label: 'Active', value: String(activeCampaigns), icon: Zap, color: 'text-titan-lime', border: 'border-titan-lime/20' },
            { label: 'Remaining', value: `৳${(totalBudget - totalSpent).toLocaleString()}`, icon: Target, color: 'text-titan-cyan', border: 'border-titan-cyan/20' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn(
                'rounded-xl bg-white/[0.03] border p-3 flex items-center gap-3',
                stat.border
              )}
            >
              <div className={cn('p-2 rounded-lg bg-white/[0.04]', stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider">{stat.label}</p>
                <p className={cn('font-display font-extrabold text-lg', stat.color)}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs + Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-mono text-xs transition-all',
                  activeFilter === tab.id
                    ? 'bg-titan-purple/10 text-titan-purple border border-titan-purple/20'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-[10px] opacity-60">{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="pl-9 bg-white/[0.04] border-white/[0.08] text-sm h-8 text-white/80 placeholder:text-white/30 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Campaign Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Megaphone className="w-12 h-12 text-white/10 mb-3" />
              <p className="font-mono text-sm text-white/30">No campaigns found</p>
              <p className="font-mono text-xs text-white/20 mt-1">Create your first campaign to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredCampaigns.map((campaign, i) => {
                  const config = statusConfig[campaign.status] || statusConfig.requested;
                  const StatusIcon = config.icon;
                  const spentPercent = campaign.budget > 0
                    ? Math.min(100, Math.round((campaign.spent / campaign.budget) * 100))
                    : 0;

                  return (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setShowDetailDialog(true);
                      }}
                      className="group rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] cursor-pointer transition-all p-4"
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{platformIcons[campaign.platform.toLowerCase()] || '🌐'}</span>
                          <div>
                            <h3 className="font-display font-bold text-sm text-white/90 line-clamp-1">
                              {campaign.name}
                            </h3>
                            <p className="font-mono text-[10px] text-white/40">
                              {campaign.clients?.business_name} · {campaign.platform}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-1.5 py-0 border-0', config.bgColor, config.color)}
                        >
                          {config.label}
                        </Badge>
                      </div>

                      {/* Budget Progress */}
                      <div className="mb-3">
                        <div className="flex justify-between mb-1">
                          <span className="font-mono text-[10px] text-white/40">Spent</span>
                          <span className="font-mono text-[10px] text-white/60">
                            ৳{(campaign.spent || 0).toLocaleString()} / ৳{(campaign.budget || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              spentPercent > 90
                                ? 'bg-titan-magenta'
                                : spentPercent > 60
                                ? 'bg-titan-amber'
                                : 'bg-titan-cyan'
                            )}
                            style={{ width: `${spentPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Goal */}
                      {campaign.goal && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Target className="w-3 h-3 text-white/30" />
                          <span className="font-mono text-[10px] text-white/40 line-clamp-1">{campaign.goal}</span>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                        <span className="font-mono text-[10px] text-white/30">
                          {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'No dates'}
                          {campaign.end_date ? ` → ${new Date(campaign.end_date).toLocaleDateString()}` : ''}
                        </span>
                        <span className="font-display font-extrabold text-xs text-white/60">
                          {spentPercent}% used
                        </span>
                      </div>
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
        <DialogContent className="bg-[#0D1029] border border-white/[0.08] text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-white">
              Create New Campaign
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <div className="p-3 rounded-lg bg-titan-magenta/10 border border-titan-magenta/20 font-mono text-xs text-titan-magenta">
                {error}
              </div>
            )}

            <div>
              <Label className="text-xs text-white/50 font-mono">Campaign Name *</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Ramadan Facebook Ads"
                className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-white/50 font-mono">Client *</Label>
                <select
                  value={createForm.client_id}
                  onChange={(e) => setCreateForm({ ...createForm, client_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono focus:border-titan-purple/40 focus:outline-none"
                >
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#0D1029]">
                      {c.business_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-white/50 font-mono">Platform *</Label>
                <select
                  value={createForm.platform}
                  onChange={(e) => setCreateForm({ ...createForm, platform: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono focus:border-titan-purple/40 focus:outline-none"
                >
                  {['Facebook', 'Instagram', 'Google', 'TikTok', 'YouTube', 'LinkedIn', 'Twitter'].map((p) => (
                    <option key={p} value={p.toLowerCase()} className="bg-[#0D1029]">
                      {platformIcons[p.toLowerCase()] || '🌐'} {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-white/50 font-mono">Budget (৳) *</Label>
                <Input
                  type="number"
                  value={createForm.budget}
                  onChange={(e) => setCreateForm({ ...createForm, budget: parseFloat(e.target.value) || 0 })}
                  className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-white/50 font-mono">Goal</Label>
                <Input
                  value={createForm.goal}
                  onChange={(e) => setCreateForm({ ...createForm, goal: e.target.value })}
                  placeholder="e.g. 1000 leads"
                  className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-white/50 font-mono">Target Audience</Label>
              <Input
                value={createForm.target_audience}
                onChange={(e) => setCreateForm({ ...createForm, target_audience: e.target.value })}
                placeholder="e.g. 18-35, Dhaka, Male & Female"
                className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-white/50 font-mono">Start Date</Label>
                <Input
                  type="date"
                  value={createForm.start_date}
                  onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                  className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-white/50 font-mono">End Date</Label>
                <Input
                  type="date"
                  value={createForm.end_date}
                  onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                  className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="border-white/[0.08] text-white/60 hover:bg-white/[0.04]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-titan-purple/15 border border-titan-purple/30 text-titan-purple hover:bg-titan-purple/25 font-display font-bold"
            >
              {creating ? 'Creating...' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-[#0D1029] border border-white/[0.08] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-titan-purple" />
              {selectedCampaign?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedCampaign && (() => {
            const config = statusConfig[selectedCampaign.status] || statusConfig.requested;
            const spentPercent = selectedCampaign.budget > 0
              ? Math.min(100, Math.round((selectedCampaign.spent / selectedCampaign.budget) * 100))
              : 0;

            return (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-mono text-[10px] text-white/40 uppercase">Client</p>
                    <p className="font-display font-bold text-sm text-white/90">
                      {selectedCampaign.clients?.business_name}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-white/40 uppercase">Platform</p>
                    <p className="font-mono text-sm text-white/90">
                      {platformIcons[selectedCampaign.platform?.toLowerCase()] || '🌐'} {selectedCampaign.platform}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-white/40 uppercase">Status</p>
                    <Badge
                      variant="outline"
                      className={cn('text-xs border-0', config.bgColor, config.color)}
                    >
                      {config.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-white/40 uppercase">Budget</p>
                    <p className="font-display font-extrabold text-lg text-white">
                      ৳{(selectedCampaign.budget || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Spend Progress */}
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex justify-between mb-2">
                    <span className="font-mono text-xs text-white/50">Budget Utilization</span>
                    <span className="font-display font-extrabold text-sm text-white/80">{spentPercent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        spentPercent > 90 ? 'bg-titan-magenta' : spentPercent > 60 ? 'bg-titan-amber' : 'bg-titan-cyan'
                      )}
                      style={{ width: `${spentPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="font-mono text-[10px] text-white/30">
                      Spent: ৳{(selectedCampaign.spent || 0).toLocaleString()}
                    </span>
                    <span className="font-mono text-[10px] text-white/30">
                      Remaining: ৳{((selectedCampaign.budget || 0) - (selectedCampaign.spent || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {selectedCampaign.goal && (
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-white/30" />
                    <span className="font-mono text-xs text-white/60">Goal: {selectedCampaign.goal}</span>
                  </div>
                )}
                {selectedCampaign.target_audience && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-white/30" />
                    <span className="font-mono text-xs text-white/60">Audience: {selectedCampaign.target_audience}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
                  {selectedCampaign.status === 'requested' && (
                    <Button
                      onClick={() => handleStatusUpdate(selectedCampaign.id, 'active')}
                      className="flex-1 bg-titan-lime/15 border border-titan-lime/30 text-titan-lime hover:bg-titan-lime/25 font-display font-bold text-sm gap-2"
                    >
                      <Play className="w-3.5 h-3.5" /> Activate
                    </Button>
                  )}
                  {selectedCampaign.status === 'active' && (
                    <>
                      <Button
                        onClick={() => handleStatusUpdate(selectedCampaign.id, 'paused')}
                        className="flex-1 bg-titan-cyan/15 border border-titan-cyan/30 text-titan-cyan hover:bg-titan-cyan/25 font-display font-bold text-sm gap-2"
                      >
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </Button>
                      <Button
                        onClick={() => handleStatusUpdate(selectedCampaign.id, 'completed')}
                        className="flex-1 bg-titan-purple/15 border border-titan-purple/30 text-titan-purple hover:bg-titan-purple/25 font-display font-bold text-sm gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                      </Button>
                    </>
                  )}
                  {selectedCampaign.status === 'paused' && (
                    <Button
                      onClick={() => handleStatusUpdate(selectedCampaign.id, 'active')}
                      className="flex-1 bg-titan-lime/15 border border-titan-lime/30 text-titan-lime hover:bg-titan-lime/25 font-display font-bold text-sm gap-2"
                    >
                      <Play className="w-3.5 h-3.5" /> Resume
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDelete(selectedCampaign.id)}
                    variant="outline"
                    className="border-titan-magenta/20 text-titan-magenta/60 hover:bg-titan-magenta/10 hover:text-titan-magenta text-sm gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
