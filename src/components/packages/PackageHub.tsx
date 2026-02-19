import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Plus,
  BarChart3,
  GitCompare,
  Pencil,
  Trash2,
  Loader2,
  Settings2,
  Crown,
  Sparkles,
  Zap,
  Eye,
} from 'lucide-react';
import { PackageBuilder, type PackageBuilderData } from './PackageBuilder';
import { PackageComparison } from './PackageComparison';
import { CategoryManager } from './CategoryManager';
import { DeliverableTypeManager } from './DeliverableTypeManager';
import { usePackages, useAllClientPackages, type PackageRow } from '@/hooks/usePackages';

const tierIcons: Record<string, React.ReactNode> = {
  Starter: <Zap className="w-4 h-4" />,
  Growth: <Sparkles className="w-4 h-4" />,
  Advanced: <Crown className="w-4 h-4" />,
  Premium: <Crown className="w-5 h-5" />,
};

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  Starter: { bg: 'bg-blue-400/10', text: 'text-blue-400', border: 'border-blue-400/30' },
  Growth: { bg: 'bg-[#7B61FF]/10', text: 'text-[#7B61FF]', border: 'border-[#7B61FF]/30' },
  Advanced: { bg: 'bg-[#00D9FF]/10', text: 'text-[#00D9FF]', border: 'border-[#00D9FF]/30' },
  Premium: { bg: 'bg-amber-400/10', text: 'text-amber-400', border: 'border-amber-400/30' },
};

export function PackageHub() {
  const { data: packages, loading, createPackage, updatePackage, deletePackage } = usePackages();
  const { data: clientPackages, loading: cpLoading } = useAllClientPackages();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageRow | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageRow | null>(null);
  const [activeTab, setActiveTab] = useState('packages');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (data: PackageBuilderData) => {
    if (editingPackage) {
      await updatePackage(editingPackage.id, data);
    } else {
      await createPackage(data);
    }
    setEditingPackage(null);
  };

  const handleEdit = (pkg: PackageRow) => {
    setEditingPackage(pkg);
    setBuilderOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    await deletePackage(id);
    setDeleting(false);
    setDeleteConfirm(null);
    if (selectedPackage?.id === id) setSelectedPackage(null);
  };

  const handleCloseBuilder = () => {
    setBuilderOpen(false);
    setEditingPackage(null);
  };

  // Client count per package
  const clientCountMap = new Map<string, number>();
  clientPackages.forEach((cp) => {
    clientCountMap.set(cp.package_id, (clientCountMap.get(cp.package_id) || 0) + 1);
  });

  return (
    <div className="flex h-full bg-[#0A0E27]">
      {/* Left Sidebar - Package List */}
      <div className="w-80 border-r border-white/10 bg-[#0F1419]/80 backdrop-blur-xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#00D9FF]" />
              <h2 className="font-display font-bold text-white text-sm">Packages</h2>
            </div>
            <button
              onClick={() => { setEditingPackage(null); setBuilderOpen(true); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/20 hover:bg-[#00D9FF]/20 font-mono text-[10px] font-bold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-white/[0.04] text-center">
              <p className="font-display font-bold text-sm text-white">{packages.length}</p>
              <p className="font-mono text-[9px] text-white/30">Templates</p>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.04] text-center">
              <p className="font-display font-bold text-sm text-[#00D9FF]">
                {clientPackages.filter((cp) => cp.status === 'active').length}
              </p>
              <p className="font-mono text-[9px] text-white/30">Active</p>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.04] text-center">
              <p className="font-display font-bold text-sm text-[#39FF14]">
                {new Set(clientPackages.map((cp) => cp.client_id)).size}
              </p>
              <p className="font-mono text-[9px] text-white/30">Clients</p>
            </div>
          </div>
        </div>

        {/* Package List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-[#00D9FF] animate-spin" />
            </div>
          ) : packages.length === 0 ? (
            <div className="p-6 text-center">
              <Package className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="font-mono text-xs text-white/30">No packages yet</p>
              <button
                onClick={() => setBuilderOpen(true)}
                className="mt-3 px-3 py-1.5 rounded-lg bg-[#00D9FF]/10 text-[#00D9FF] font-mono text-[10px] hover:bg-[#00D9FF]/20"
              >
                Create First Package
              </button>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                const tc = tierColors[pkg.tier] || tierColors.Starter;
                const clientCount = clientCountMap.get(pkg.id) || 0;

                return (
                  <div key={pkg.id} className="relative group">
                    <button
                      onClick={() => setSelectedPackage(pkg)}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-[#00D9FF]/10 border border-[#00D9FF]/20'
                          : 'border border-transparent hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs text-white font-semibold truncate pr-2">{pkg.name}</span>
                        <div className={`flex items-center gap-1 ${tc.text}`}>
                          {tierIcons[pkg.tier]}
                          <span className="font-mono text-[9px]">{pkg.tier}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>
                          {pkg.plan_type}
                        </span>
                        {pkg.category && (
                          <span className="font-mono text-[9px] text-white/30">{pkg.category}</span>
                        )}
                        {pkg.recommended && (
                          <span className="font-mono text-[8px] px-1 py-0.5 rounded bg-[#39FF14]/10 text-[#39FF14]">★</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-sm text-white">
                          ৳{pkg.monthly_fee.toLocaleString()}
                        </span>
                        <span className="font-mono text-[9px] text-white/30">
                          {clientCount} client{clientCount !== 1 ? 's' : ''} · {pkg.package_features?.length || 0} deliverables
                        </span>
                      </div>
                    </button>

                    {/* Edit/Delete actions */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(pkg); }}
                        className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-[#00D9FF]/20 text-white/40 hover:text-[#00D9FF] transition-all"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(pkg.id); }}
                        className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-[#FF006E]/20 text-white/40 hover:text-[#FF006E] transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Delete confirmation */}
                    {deleteConfirm === pkg.id && (
                      <div
                        className="absolute inset-0 bg-[#0F1419]/95 backdrop-blur-xl rounded-xl border border-[#FF006E]/30 flex items-center justify-center gap-2 z-10"
                      >
                        <span className="font-mono text-[10px] text-white/60">Delete?</span>
                        <button
                          onClick={() => handleDelete(pkg.id)}
                          disabled={deleting}
                          className="px-3 py-1 rounded-lg bg-[#FF006E]/20 text-[#FF006E] font-mono text-[10px] font-bold hover:bg-[#FF006E]/30"
                        >
                          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1 rounded-lg bg-white/[0.06] text-white/40 font-mono text-[10px] hover:bg-white/[0.1]"
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs header */}
          <div className="h-14 border-b border-white/10 bg-[#0F1419]/80 backdrop-blur-xl flex items-center px-6 shrink-0">
            <TabsList className="bg-transparent rounded-none">
              <TabsTrigger value="packages" className="data-[state=active]:bg-[#00D9FF]/10 data-[state=active]:text-[#00D9FF] gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Package Details
              </TabsTrigger>
              <TabsTrigger value="comparison" className="data-[state=active]:bg-[#7B61FF]/10 data-[state=active]:text-[#7B61FF] gap-1.5">
                <GitCompare className="w-3.5 h-3.5" />
                Compare
              </TabsTrigger>
              <TabsTrigger value="categories" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] gap-1.5">
                <Settings2 className="w-3.5 h-3.5" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="deliverable-types" className="data-[state=active]:bg-amber-400/10 data-[state=active]:text-amber-400 gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Deliverable Types
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Package Details */}
          <TabsContent value="packages" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              {selectedPackage ? (
                <div className="p-6 space-y-6">
                  {/* Package Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00D9FF]/20 to-[#7B61FF]/20 border border-white/10 flex items-center justify-center">
                        <Package className="w-7 h-7 text-[#00D9FF]" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{selectedPackage.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${tierColors[selectedPackage.tier]?.bg} ${tierColors[selectedPackage.tier]?.text}`}>
                            {selectedPackage.tier}
                          </span>
                          <span className="font-mono text-[10px] text-white/30">{selectedPackage.plan_type}</span>
                          {selectedPackage.category && (
                            <span className="font-mono text-[10px] text-white/30">· {selectedPackage.category}</span>
                          )}
                          {selectedPackage.recommended && (
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#39FF14]/10 text-[#39FF14]">★ Recommended</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(selectedPackage)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/20 hover:bg-[#00D9FF]/20 font-mono text-xs transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="font-mono text-[10px] text-white/30 uppercase">Monthly Fee</p>
                      <p className="font-display font-bold text-2xl text-white mt-1">৳{selectedPackage.monthly_fee.toLocaleString()}</p>
                      <p className="font-mono text-[10px] text-white/30">{selectedPackage.currency}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="font-mono text-[10px] text-white/30 uppercase">Platforms</p>
                      <p className="font-display font-bold text-2xl text-[#00D9FF] mt-1">{selectedPackage.platform_count}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="font-mono text-[10px] text-white/30 uppercase">Corrections</p>
                      <p className="font-display font-bold text-2xl text-[#7B61FF] mt-1">{selectedPackage.correction_limit}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="font-mono text-[10px] text-white/30 uppercase">Active Clients</p>
                      <p className="font-display font-bold text-2xl text-[#39FF14] mt-1">{clientCountMap.get(selectedPackage.id) || 0}</p>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedPackage.description && (
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="font-mono text-[10px] text-white/30 uppercase mb-2">Description</p>
                      <p className="font-mono text-sm text-white/60">{selectedPackage.description}</p>
                    </div>
                  )}

                  {/* Features */}
                  {selectedPackage.features && selectedPackage.features.length > 0 && (
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="font-mono text-[10px] text-white/30 uppercase mb-3">Features</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedPackage.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] shrink-0" />
                            <span className="font-mono text-xs text-white/60">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deliverables */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="font-mono text-[10px] text-white/30 uppercase mb-3">Deliverables</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(selectedPackage.package_features || []).map((feat) => (
                        <div key={feat.id || feat.deliverable_type} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                          <div>
                            <span className="font-mono text-xs text-white/80">{feat.label}</span>
                            <span className="font-mono text-[9px] text-white/30 ml-2">{feat.unit_label}</span>
                          </div>
                          <span className="font-display font-bold text-sm text-[#00D9FF]">{feat.total_allocated}</span>
                        </div>
                      ))}
                    </div>
                    {(!selectedPackage.package_features || selectedPackage.package_features.length === 0) && (
                      <p className="font-mono text-xs text-white/30 text-center py-4">No deliverables configured</p>
                    )}
                  </div>

                  {/* Clients using this package */}
                  {clientPackages.filter((cp) => cp.package_id === selectedPackage.id).length > 0 && (
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="font-mono text-[10px] text-white/30 uppercase mb-3">Clients Using This Package</p>
                      <div className="space-y-2">
                        {clientPackages
                          .filter((cp) => cp.package_id === selectedPackage.id)
                          .map((cp) => (
                            <div key={cp.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
                              <div>
                                <span className="font-mono text-xs text-white/80">{(cp as { client_name?: string }).client_name}</span>
                                <span className="font-mono text-[9px] text-white/30 ml-2">since {new Date(cp.start_date).toLocaleDateString()}</span>
                              </div>
                              <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full ${
                                cp.status === 'active' ? 'bg-[#39FF14]/10 text-[#39FF14]' : cp.status === 'paused' ? 'bg-amber-400/10 text-amber-400' : 'bg-[#FF006E]/10 text-[#FF006E]'
                              }`}>
                                {cp.status}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center">
                    <div.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00D9FF]/10 to-[#7B61FF]/10 border border-[#00D9FF]/30 flex items-center justify-center mx-auto mb-4"
                    >
                      <Package className="w-10 h-10 text-[#00D9FF]" />
                    </div.div>
                    <h3 className="text-xl font-bold text-white mb-2">Select a Package</h3>
                    <p className="text-white/60 text-sm max-w-md mb-4">
                      Choose a package from the list to view details, edit deliverables, and manage clients
                    </p>
                    <button
                      onClick={() => setBuilderOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30 hover:bg-[#00D9FF]/30 font-mono text-xs font-bold transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Package
                    </button>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comparison" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-6">
                <PackageComparison />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="categories" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-6">
                <CategoryManager />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="deliverable-types" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-6">
                <DeliverableTypeManager />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Package Builder Modal */}
      <PackageBuilder
        open={builderOpen}
        onClose={handleCloseBuilder}
        onSave={handleSave}
        editingPackage={editingPackage}
      />
    </div>
  );
}
