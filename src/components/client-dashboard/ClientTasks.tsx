import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import { updateDeliverableStatus } from '@/lib/data-service';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Image,
  Video,
  PenTool,
  Users,
  Calendar,
  ChevronRight,
  X,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

type TaskStatus = 'pending' | 'in_progress' | 'waiting_approval' | 'completed';

interface Task {
  id: string;
  title: string;
  type: string;
  status: TaskStatus;
  dueDate: string;
  assignedTeam: string;
  preview?: string;
  description: string;
}

const fallbackTasks: Task[] = [
  {
    id: '1',
    title: 'Customer Frame Design — Royal Enfield Classic',
    type: 'photo_graphics',
    status: 'waiting_approval',
    dueDate: '2024-01-18',
    assignedTeam: 'Creative Team',
    preview: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300&q=60',
    description: 'Custom frame design featuring the Royal Enfield Classic 350 with brand overlay.',
  },
  {
    id: '2',
    title: 'Review Video — Yamaha MT-15 Showroom Tour',
    type: 'video_edit',
    status: 'in_progress',
    dueDate: '2024-01-20',
    assignedTeam: 'Video Production',
    preview: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=300&q=60',
    description: 'Cinematic showroom walkthrough video with narration and branding.',
  },
  {
    id: '3',
    title: 'Social Media Post — New Year Sale',
    type: 'copywriting',
    status: 'pending',
    dueDate: '2024-01-22',
    assignedTeam: 'Content & Copy',
    description: 'Instagram & Facebook post copy for the New Year motorcycle sale event.',
  },
  {
    id: '4',
    title: 'Banner Design — Festive Collection',
    type: 'photo_graphics',
    status: 'completed',
    dueDate: '2024-01-15',
    assignedTeam: 'Creative Team',
    preview: 'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=300&q=60',
    description: 'Website hero banner and social media banner set for festive season.',
  },
  {
    id: '5',
    title: 'Ad Copywriting — Meta Campaign',
    type: 'copywriting',
    status: 'completed',
    dueDate: '2024-01-14',
    assignedTeam: 'Content & Copy',
    description: 'Ad copy variations for Meta Ads campaign targeting test ride bookings.',
  },
  {
    id: '6',
    title: 'Product Photography Edit — Honda CB350',
    type: 'photo_graphics',
    status: 'pending',
    dueDate: '2024-01-25',
    assignedTeam: 'Creative Team',
    preview: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=300&q=60',
    description: 'Photo retouching and branding overlay for Honda CB350 product shots.',
  },
];

// Map DB status to UI status
function mapDeliverableStatus(dbStatus: string): TaskStatus {
  const map: Record<string, TaskStatus> = {
    pending: 'pending',
    'in-progress': 'in_progress',
    review: 'waiting_approval',
    approved: 'completed',
    delivered: 'completed',
    cancelled: 'completed',
  };
  return map[dbStatus] || 'pending';
}

// Map deliverable type to team name
function getTeamName(type: string): string {
  const map: Record<string, string> = {
    photo_graphics: 'Creative Team',
    video_edit: 'Video Production',
    motion_graphics: 'Video Production',
    reels: 'Video Production',
    copywriting: 'Content & Copy',
    customer_frames: 'Creative Team',
    service_frames: 'Creative Team',
    boost_campaign: 'Media Buying',
    ads_management: 'Media Buying',
    seo: 'Strategy & Research',
    social_media_posts: 'Content & Copy',
  };
  return map[type] || 'Team';
}

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: typeof Clock; bg: string }> = {
  pending: { label: 'Pending', color: '#FFB800', icon: Clock, bg: 'rgba(255,184,0,0.1)' },
  in_progress: { label: 'In Progress', color: '#00D9FF', icon: AlertCircle, bg: 'rgba(0,217,255,0.1)' },
  waiting_approval: { label: 'Waiting Approval', color: '#7B61FF', icon: Eye, bg: 'rgba(123,97,255,0.1)' },
  completed: { label: 'Completed', color: '#39FF14', icon: CheckCircle2, bg: 'rgba(57,255,20,0.1)' },
};

const typeIcons: Record<string, typeof Image> = {
  photo_graphics: Image,
  video_edit: Video,
  copywriting: PenTool,
};

const statusOrder: TaskStatus[] = ['waiting_approval', 'pending', 'in_progress', 'completed'];

export default function ClientTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(fallbackTasks);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TaskStatus | 'all'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const clientId = user?.client_id;
      if (!clientId) { setLoading(false); return; }

      const { data: result, error: err } = await supabase
        .from('deliverables')
        .select('*, team_members:assigned_to(name)')
        .eq('client_id', clientId)
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('created_at', { ascending: false });

      if (err) throw err;

      if (result && result.length > 0) {
        const mapped: Task[] = result.map((r: Record<string, unknown>) => {
          const teamMember = r.team_members as Record<string, unknown> | null;
          const deadline = r.deadline ? new Date(r.deadline as string).toISOString().split('T')[0] : '';
          return {
            id: r.id as string,
            title: r.title as string,
            type: (r.deliverable_type as string) || 'photo_graphics',
            status: mapDeliverableStatus((r.status as string) || 'pending'),
            dueDate: deadline,
            assignedTeam: teamMember?.name as string || getTeamName((r.deliverable_type as string) || ''),
            description: (r.notes as string) || r.title as string,
          };
        });
        setTasks(mapped);
      }
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.client_id]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Real-time subscription for deliverables
  useEffect(() => {
    const clientId = user?.client_id;
    if (!clientId) return;

    const channel = supabase
      .channel(`client-tasks-${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deliverables',
        filter: `client_id=eq.${clientId}`,
      }, () => { fetchTasks(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.client_id, fetchTasks]);

  const handleApprove = useCallback(async (task: Task) => {
    setActionLoading(true);
    try {
      await updateDeliverableStatus(task.id, 'approved', user?.id);
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'completed' as TaskStatus } : t));
      setSelectedTask(null);
    } catch (e) {
      console.error('Failed to approve:', e);
    } finally {
      setActionLoading(false);
    }
  }, [user?.id]);

  const handleRequestRevision = useCallback(async (task: Task) => {
    setActionLoading(true);
    try {
      await updateDeliverableStatus(task.id, 'in-progress');
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'in_progress' as TaskStatus } : t));
      setSelectedTask(null);
    } catch (e) {
      console.error('Failed to request revision:', e);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const filtered = activeFilter === 'all' ? tasks : tasks.filter((t) => t.status === activeFilter);

  const grouped = statusOrder.reduce<Record<string, Task[]>>((acc, status) => {
    const items = filtered.filter((t) => t.status === status);
    if (items.length > 0) acc[status] = items;
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="font-display font-extrabold text-lg text-white flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-titan-cyan" />
          Tasks
          {loading && <Loader2 className="w-3.5 h-3.5 text-titan-cyan/40 animate-spin" />}
        </h1>
        <p className="font-mono text-[10px] text-white/30 mt-0.5">
          {tasks.length} deliverables • {tasks.filter((t) => t.status !== 'completed').length} active
        </p>
      </div>

      {/* Filter Pills */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {([{ id: 'all', label: 'All', color: '#ffffff' }, ...statusOrder.map((s) => ({ id: s, label: statusConfig[s].label, color: statusConfig[s].color }))] as { id: string; label: string; color: string }[]).map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id as TaskStatus | 'all')}
                className="flex-none px-3 py-1.5 rounded-full font-mono text-[10px] border transition-all active:scale-95 whitespace-nowrap"
                style={{
                  background: isActive ? `${filter.color}15` : 'transparent',
                  borderColor: isActive ? `${filter.color}40` : 'rgba(255,255,255,0.06)',
                  color: isActive ? filter.color : 'rgba(255,255,255,0.4)',
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 space-y-4">
        {Object.entries(grouped).map(([status, tasks]) => {
          const config = statusConfig[status as TaskStatus];
          const StatusIcon = config.icon;
          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon className="w-3.5 h-3.5" style={{ color: config.color }} />
                <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: config.color }}>
                  {config.label}
                </span>
                <span className="font-mono text-[10px] text-white/20">({tasks.length})</span>
              </div>
              <div className="space-y-2">
                {tasks.map((task, i) => {
                  const TypeIcon = typeIcons[task.type] || Image;
                  return (
                    <motion.button
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedTask(task)}
                      className="w-full text-left glass-card p-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
                    >
                      {task.preview ? (
                        <img
                          src={task.preview}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${config.color}10`, border: `1px solid ${config.color}20` }}
                        >
                          <TypeIcon className="w-5 h-5" style={{ color: config.color }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold text-xs text-white truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <Users className="w-2.5 h-2.5 text-white/25" />
                            <span className="font-mono text-[9px] text-white/30">{task.assignedTeam}</span>
                          </div>
                          <span className="text-white/10">•</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5 text-white/25" />
                            <span className="font-mono text-[9px] text-white/30">{task.dueDate}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/15 shrink-0" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Panel */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedTask(null)}
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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono mb-2"
                      style={{
                        background: statusConfig[selectedTask.status].bg,
                        color: statusConfig[selectedTask.status].color,
                      }}
                    >
                      {statusConfig[selectedTask.status].label}
                    </span>
                    <h2 className="font-display font-bold text-base text-white">{selectedTask.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="w-8 h-8 rounded-full glass-card flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>

                {selectedTask.preview && (
                  <img
                    src={selectedTask.preview}
                    alt=""
                    className="w-full h-48 rounded-xl object-cover"
                  />
                )}

                <p className="font-mono text-xs text-white/50 leading-relaxed">{selectedTask.description}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-card p-3">
                    <p className="font-mono text-[9px] text-white/30">Assigned Team</p>
                    <p className="font-display font-semibold text-xs text-white mt-0.5">{selectedTask.assignedTeam}</p>
                  </div>
                  <div className="glass-card p-3">
                    <p className="font-mono text-[9px] text-white/30">Due Date</p>
                    <p className="font-display font-semibold text-xs text-white mt-0.5">{selectedTask.dueDate}</p>
                  </div>
                </div>

                {selectedTask.status === 'waiting_approval' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(selectedTask)}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 rounded-xl bg-titan-lime/15 border border-titan-lime/30 font-display font-bold text-xs text-titan-lime active:scale-[0.97] transition-transform disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => handleRequestRevision(selectedTask)}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 rounded-xl bg-titan-magenta/15 border border-titan-magenta/30 font-display font-bold text-xs text-titan-magenta active:scale-[0.97] transition-transform disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '✕ Request Revision'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
