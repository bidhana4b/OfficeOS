import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import {
  getClientPackageDetails,
  getAvailablePackagesForUpgrade,
  requestPackageChange,
  getPackageChangeRequests,
} from '@/lib/data-service';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import {
  Package,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Calendar,
  Clock,
  ArrowUpRight,
  AlertCircle,
  Zap,
  Star,
  Image,
  Video,
  PenTool,
  Rocket,
  Send,
  X,
  RefreshCw,
} from 'lucide-react';

interface PackageInfo {
  id: string;
  name: string;
  description: string;
  monthly_fee: number;
  currency: string;
  deliverables: Record<string, number>;
}

interface UsageItem {
  deliverable_type: string;
  used: number;
  total: number;
}

interface ChangeRequest {
  id: string;
  request_type: string;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  requested_package: { name: string; monthly_fee: number } | null;
}

const typeIcons: Record<string, typeof Image> = {
  photo_graphics: Image,
  video_edit: Video,
  motion_graphics: Video,
  reels: Video,
  copywriting: PenTool,
  boost_campaign: Rocket,
};

const typeColors: Record<string, string> = {
  photo_graphics: '#00D9FF',
  video_edit: '#7B61FF',
  motion_graphics: '#FF006E',
  reels: '#FFB800',
  copywriting: '#39FF14',
  boost_campaign: '#FF006E',
};

function formatCurrency(amount: number, currency = 'BDT') {
  return currency === 'BDT' ? `৳${amount.toLocaleString()}` : `$${amount.toLocaleString()}`;
}

export default function ClientPackageDetails({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pkgDetails, setPkgDetails] = useState<any>(null);
  const [usage, setUsage] = useState<UsageItem[]>([]);
  const [availablePackages, setAvailablePackages] = useState<PackageInfo[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [showUpgradePanel, setShowUpgradePanel] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [upgradeNotes, setUpgradeNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const clientId = user?.client_id;
    if (!clientId) { setLoading(false); return; }

    try {
      const [pkgData, packages, requests] = await Promise.all([
        getClientPackageDetails(clientId),
        getAvailablePackagesForUpgrade(),
        getPackageChangeRequests(clientId),
      ]);

      setPkgDetails(pkgData);
      setAvailablePackages(packages as PackageInfo[]);
      setChangeRequests(requests as ChangeRequest[]);

      if (pkgData) {
        const { data: usageData } = await supabase
          .from('package_usage')
          .select('*')
          .eq('client_package_id', pkgData.id);

        if (usageData) {
          setUsage(usageData.map((u: any) => ({
            deliverable_type: u.deliverable_type,
            used: u.used,
            total: u.total,
          })));
        }
      }
    } catch (e) {
      console.error('Failed to fetch package details:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.client_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpgradeRequest = async () => {
    if (!selectedPackage || !user?.client_id) return;
    setSubmitting(true);
    setError(null);

    try {
      const currentPkgId = pkgDetails?.package?.id;
      const reqPkg = availablePackages.find(p => p.id === selectedPackage);
      const currentFee = pkgDetails?.package?.monthly_fee || 0;
      const reqType = reqPkg && reqPkg.monthly_fee > currentFee ? 'upgrade' : 'downgrade';

      await requestPackageChange({
        clientId: user.client_id,
        currentPackageId: currentPkgId,
        requestedPackageId: selectedPackage,
        requestType: reqType,
        notes: upgradeNotes || undefined,
      });

      setSubmitted(true);
      setTimeout(() => {
        setShowUpgradePanel(false);
        setSubmitted(false);
        setSelectedPackage(null);
        setUpgradeNotes('');
        fetchData();
      }, 2000);
    } catch (e) {
      setError('Failed to submit request. Please try again.');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const pkg = pkgDetails?.package;
  const renewalDate = pkgDetails?.renewal_date;
  const daysLeft = renewalDate
    ? Math.max(0, Math.ceil((new Date(renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-titan-cyan/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-white/50" />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-extrabold text-lg text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-titan-cyan" />
            Package Details
          </h1>
          <p className="font-mono text-[10px] text-white/30 mt-0.5">{pkg?.name || 'No package'}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 space-y-4">
        {!pkg ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-white/40 text-sm font-medium">No active package</p>
            <p className="text-white/20 text-xs mt-1">Contact your agency to assign a package</p>
          </div>
        ) : (
          <>
            {/* Package Overview Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl border border-white/[0.08]"
              style={{
                background: 'linear-gradient(135deg, rgba(0,217,255,0.08) 0%, rgba(123,97,255,0.08) 50%, rgba(255,0,110,0.05) 100%)',
              }}
            >
              <div className="absolute inset-0 backdrop-blur-xl" />
              <div className="relative p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-lg text-white">{pkg.name}</p>
                    <p className="font-mono text-[10px] text-white/40">{pkg.description || 'Premium agency package'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-extrabold text-xl text-titan-cyan">
                      {formatCurrency(pkgDetails.custom_monthly_fee || pkg.monthly_fee, pkg.currency)}
                    </p>
                    <p className="font-mono text-[9px] text-white/30">/month</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 glass-card p-2.5 text-center">
                    <Calendar className="w-3.5 h-3.5 text-titan-cyan mx-auto mb-1" />
                    <p className="font-mono text-[9px] text-white/30">Renewal</p>
                    <p className="font-display font-bold text-xs text-white">
                      {renewalDate ? new Date(renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                  <div className="flex-1 glass-card p-2.5 text-center">
                    <Clock className="w-3.5 h-3.5 text-titan-lime mx-auto mb-1" />
                    <p className="font-mono text-[9px] text-white/30">Days Left</p>
                    <p className="font-display font-bold text-xs text-white">{daysLeft}</p>
                  </div>
                  <div className="flex-1 glass-card p-2.5 text-center">
                    <TrendingUp className="w-3.5 h-3.5 text-titan-purple mx-auto mb-1" />
                    <p className="font-mono text-[9px] text-white/30">Status</p>
                    <p className="font-display font-bold text-xs text-titan-lime capitalize">{pkgDetails.status}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Deliverable Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="font-display font-bold text-sm text-white/80 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-titan-cyan" />
                Included Deliverables
              </h3>
              <div className="space-y-2">
                {usage.length > 0 ? usage.map((item, i) => {
                  const percent = Math.round((item.used / item.total) * 100);
                  const color = typeColors[item.deliverable_type] || '#ffffff40';
                  const Icon = typeIcons[item.deliverable_type] || Package;
                  const isHigh = percent > 80;

                  return (
                    <motion.div
                      key={item.deliverable_type}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      className="glass-card p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ background: `${color}10`, border: `1px solid ${color}20` }}
                        >
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-display font-semibold text-xs text-white truncate">
                              {item.deliverable_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </p>
                            <span
                              className="font-mono text-[10px] font-bold"
                              style={{ color: isHigh ? '#FF006E' : color }}
                            >
                              {item.used}/{item.total}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/[0.06] mt-1.5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percent}%` }}
                              transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                              className="h-full rounded-full"
                              style={{ background: isHigh ? '#FF006E' : color }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }) : (
                  <div className="text-center py-8">
                    <p className="font-mono text-xs text-white/30">No usage data available</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Upgrade/Downgrade Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => setShowUpgradePanel(true)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-titan-cyan/15 to-titan-purple/15 border border-titan-cyan/20 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            >
              <ArrowUpRight className="w-4 h-4 text-titan-cyan" />
              <span className="font-display font-bold text-xs text-white">Request Package Change</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/20" />
            </motion.button>

            {/* Previous Change Requests */}
            {changeRequests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <h3 className="font-display font-bold text-sm text-white/80 mb-3 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-titan-yellow" />
                  Change Requests
                </h3>
                <div className="space-y-2">
                  {changeRequests.map((req) => {
                    const statusColors: Record<string, string> = {
                      pending: '#FFB800',
                      approved: '#39FF14',
                      rejected: '#FF006E',
                      completed: '#00D9FF',
                    };
                    const color = statusColors[req.status] || '#ffffff40';
                    return (
                      <div key={req.id} className="glass-card p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-display font-semibold text-xs text-white capitalize">
                              {req.request_type} → {(req.requested_package as any)?.name || 'Package'}
                            </p>
                            <p className="font-mono text-[9px] text-white/25 mt-0.5">
                              {new Date(req.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold capitalize"
                            style={{ background: `${color}15`, color }}
                          >
                            {req.status}
                          </span>
                        </div>
                        {req.admin_notes && (
                          <p className="font-mono text-[10px] text-white/40 mt-2 pl-2 border-l-2" style={{ borderColor: `${color}30` }}>
                            {req.admin_notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Upgrade Panel (Slide-up) */}
      <AnimatePresence>
        {showUpgradePanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowUpgradePanel(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-titan-bg border-t border-white/10 rounded-t-3xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3" />

              <div className="p-5 space-y-4">
                {submitted ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-titan-lime mx-auto mb-3" />
                    <h3 className="font-display font-bold text-lg text-white">Request Submitted!</h3>
                    <p className="font-mono text-xs text-white/40">Your agency will review and respond.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold text-base text-white">Choose Package</h3>
                      <button onClick={() => setShowUpgradePanel(false)}>
                        <X className="w-5 h-5 text-white/30" />
                      </button>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-titan-magenta/10 border border-titan-magenta/20">
                        <AlertCircle className="w-4 h-4 text-titan-magenta" />
                        <span className="font-mono text-[11px] text-titan-magenta">{error}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      {availablePackages.map((p) => {
                        const isCurrent = p.id === pkg?.id;
                        const isSelected = selectedPackage === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => !isCurrent && setSelectedPackage(p.id)}
                            disabled={isCurrent}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${
                              isSelected ? 'border-titan-cyan/40 bg-titan-cyan/10' :
                              isCurrent ? 'border-white/10 bg-white/[0.02] opacity-50' :
                              'border-white/[0.06] active:scale-[0.98]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-display font-bold text-xs text-white flex items-center gap-1.5">
                                  {p.name}
                                  {isCurrent && (
                                    <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full bg-titan-lime/10 text-titan-lime">Current</span>
                                  )}
                                </p>
                                {p.description && (
                                  <p className="font-mono text-[9px] text-white/25 mt-0.5">{p.description}</p>
                                )}
                              </div>
                              <p className="font-display font-bold text-sm text-titan-cyan">
                                {formatCurrency(p.monthly_fee, p.currency)}
                              </p>
                            </div>
                            {isSelected && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-2 pt-2 border-t border-titan-cyan/10"
                              >
                                <CheckCircle2 className="w-4 h-4 text-titan-cyan inline mr-1" />
                                <span className="font-mono text-[10px] text-titan-cyan">Selected</span>
                              </motion.div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div>
                      <label className="font-mono text-[10px] text-white/40 block mb-1.5">Notes (optional)</label>
                      <textarea
                        value={upgradeNotes}
                        onChange={(e) => setUpgradeNotes(e.target.value)}
                        placeholder="Any specific requirements or questions..."
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none resize-none"
                      />
                    </div>

                    <button
                      onClick={handleUpgradeRequest}
                      disabled={!selectedPackage || submitting}
                      className="w-full py-3 rounded-xl bg-titan-cyan/15 border border-titan-cyan/30 font-display font-bold text-sm text-titan-cyan active:scale-[0.97] transition-transform disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Submit Request
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
