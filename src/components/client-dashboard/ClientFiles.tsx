import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import {
  getClientSharedFiles,
  getApprovedDeliverables,
} from '@/lib/data-service';
import {
  FolderOpen,
  Image,
  Video,
  FileText,
  File,
  Download,
  Eye,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  X,
  ExternalLink,
} from 'lucide-react';

interface SharedFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  category: string;
  description: string | null;
  created_at: string;
}

interface ApprovedDeliverable {
  id: string;
  title: string;
  deliverable_type: string;
  status: string;
  final_file_url: string | null;
  final_file_name: string | null;
  created_at: string;
  updated_at: string;
}

type FileTab = 'shared' | 'approved' | 'documents';

const categoryFilters = [
  { id: 'all', label: 'All' },
  { id: 'brand_assets', label: 'Brand Assets' },
  { id: 'designs', label: 'Designs' },
  { id: 'documents', label: 'Documents' },
  { id: 'reference', label: 'References' },
  { id: 'general', label: 'General' },
];

const fileTypeIcons: Record<string, typeof File> = {
  image: Image,
  video: Video,
  pdf: FileText,
  document: File,
};

const fileTypeColors: Record<string, string> = {
  image: '#00D9FF',
  video: '#7B61FF',
  pdf: '#FF006E',
  document: '#FFB800',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ClientFiles({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FileTab>('shared');
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [approvedDeliverables, setApprovedDeliverables] = useState<ApprovedDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [previewFile, setPreviewFile] = useState<SharedFile | null>(null);

  const fetchFiles = useCallback(async () => {
    const clientId = user?.client_id;
    if (!clientId) { setLoading(false); return; }

    try {
      const [files, deliverables] = await Promise.all([
        getClientSharedFiles(clientId, categoryFilter),
        getApprovedDeliverables(clientId),
      ]);
      setSharedFiles(files as SharedFile[]);
      setApprovedDeliverables(deliverables as ApprovedDeliverable[]);
    } catch (e) {
      console.error('Failed to fetch files:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.client_id, categoryFilter]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const filteredShared = sharedFiles.filter((f) =>
    !search || f.file_name.toLowerCase().includes(search.toLowerCase()) ||
    (f.description && f.description.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredApproved = approvedDeliverables.filter((d) =>
    !search || d.title.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { id: FileTab; label: string; count: number }[] = [
    { id: 'shared', label: 'Shared Files', count: filteredShared.length },
    { id: 'approved', label: 'Approved Work', count: filteredApproved.length },
  ];

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
            <FolderOpen className="w-5 h-5 text-titan-cyan" />
            Files & Assets
          </h1>
          <p className="font-mono text-[10px] text-white/30 mt-0.5">
            {sharedFiles.length + approvedDeliverables.length} total files
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchFiles(); }}
          className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
        >
          <RefreshCw className={`w-4 h-4 text-white/40 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3 flex gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2 rounded-xl font-mono text-[11px] border transition-all active:scale-95"
              style={{
                background: isActive ? 'rgba(0,217,255,0.1)' : 'transparent',
                borderColor: isActive ? 'rgba(0,217,255,0.3)' : 'rgba(255,255,255,0.06)',
                color: isActive ? '#00D9FF' : 'rgba(255,255,255,0.4)',
              }}
            >
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-9 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-white/30" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter (for shared files tab) */}
      {activeTab === 'shared' && (
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categoryFilters.map((cat) => {
              const isActive = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className="flex-none px-3 py-1.5 rounded-full font-mono text-[10px] border transition-all active:scale-95"
                  style={{
                    background: isActive ? 'rgba(123,97,255,0.15)' : 'transparent',
                    borderColor: isActive ? 'rgba(123,97,255,0.4)' : 'rgba(255,255,255,0.06)',
                    color: isActive ? '#7B61FF' : 'rgba(255,255,255,0.35)',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-titan-cyan/40 animate-spin" />
          </div>
        ) : activeTab === 'shared' ? (
          filteredShared.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No shared files"
              description="Files shared by your agency will appear here"
            />
          ) : (
            <div className="space-y-2">
              {filteredShared.map((file, i) => {
                const FileIcon = fileTypeIcons[file.file_type] || File;
                const color = fileTypeColors[file.file_type] || '#ffffff40';
                return (
                  <motion.button
                    key={file.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => file.file_type === 'image' ? setPreviewFile(file) : window.open(file.file_url, '_blank')}
                    className="w-full text-left glass-card p-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${color}10`, border: `1px solid ${color}20` }}
                    >
                      <FileIcon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-xs text-white truncate">{file.file_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[9px] text-white/25">{formatFileSize(file.file_size)}</span>
                        <span className="text-white/10">•</span>
                        <span className="font-mono text-[9px] text-white/25">{formatDate(file.created_at)}</span>
                        {file.category !== 'general' && (
                          <>
                            <span className="text-white/10">•</span>
                            <span
                              className="font-mono text-[9px] px-1.5 py-0.5 rounded-md"
                              style={{ background: `${color}10`, color }}
                            >
                              {file.category.replace(/_/g, ' ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-white/15 shrink-0" />
                  </motion.button>
                );
              })}
            </div>
          )
        ) : (
          filteredApproved.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No approved deliverables"
              description="Approved designs and content will appear here"
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredApproved.map((item, i) => {
                const color = item.deliverable_type.includes('video') ? '#7B61FF' : '#00D9FF';
                const TypeIcon = item.deliverable_type.includes('video') ? Video : Image;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card overflow-hidden"
                  >
                    {item.final_file_url ? (
                      <div className="w-full h-24 relative">
                        <img
                          src={item.final_file_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <span
                          className="absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center"
                          style={{ background: 'rgba(57,255,20,0.2)' }}
                        >
                          <CheckCircle2 className="w-3 h-3 text-titan-lime" />
                        </span>
                      </div>
                    ) : (
                      <div
                        className="w-full h-24 flex items-center justify-center"
                        style={{ background: `${color}08` }}
                      >
                        <TypeIcon className="w-8 h-8" style={{ color: `${color}40` }} />
                      </div>
                    )}
                    <div className="p-2.5">
                      <p className="font-display font-semibold text-[11px] text-white truncate">{item.title}</p>
                      <p className="font-mono text-[9px] text-white/25 mt-0.5">{formatDate(item.updated_at)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-full max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewFile.file_url}
                alt={previewFile.file_name}
                className="max-w-full max-h-[80vh] rounded-xl object-contain"
              />
              <button
                onClick={() => setPreviewFile(null)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 rounded-b-xl">
                <p className="font-display font-semibold text-xs text-white">{previewFile.file_name}</p>
                <p className="font-mono text-[9px] text-white/40">{formatFileSize(previewFile.file_size)}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof File; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-10 h-10 text-white/10 mb-3" />
      <p className="text-white/40 text-sm font-medium">{title}</p>
      <p className="text-white/20 text-xs mt-1">{description}</p>
    </div>
  );
}
