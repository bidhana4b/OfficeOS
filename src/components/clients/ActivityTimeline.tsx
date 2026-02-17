import { Activity } from './types';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Zap,
  FileCheck,
  DollarSign,
  MessageSquare,
  CheckCircle,
  Package,
  UserPlus
} from 'lucide-react';

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'deliverable_created':
        return <FileText className="w-4 h-4" />;
      case 'boost_launched':
        return <Zap className="w-4 h-4" />;
      case 'invoice_generated':
        return <FileCheck className="w-4 h-4" />;
      case 'payment_received':
        return <DollarSign className="w-4 h-4" />;
      case 'revision_requested':
        return <MessageSquare className="w-4 h-4" />;
      case 'approval_given':
        return <CheckCircle className="w-4 h-4" />;
      case 'package_renewed':
        return <Package className="w-4 h-4" />;
      case 'client_onboarded':
        return <UserPlus className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'deliverable_created':
        return 'text-[#00D9FF] bg-[#00D9FF]/10 border-[#00D9FF]/30';
      case 'boost_launched':
        return 'text-[#FF006E] bg-[#FF006E]/10 border-[#FF006E]/30';
      case 'invoice_generated':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'payment_received':
        return 'text-[#39FF14] bg-[#39FF14]/10 border-[#39FF14]/30';
      case 'revision_requested':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'approval_given':
        return 'text-[#39FF14] bg-[#39FF14]/10 border-[#39FF14]/30';
      case 'package_renewed':
        return 'text-[#00D9FF] bg-[#00D9FF]/10 border-[#00D9FF]/30';
      case 'client_onboarded':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-bold text-white mb-4">Activity Timeline</h4>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-[#00D9FF]/50 via-[#FF006E]/50 to-transparent" />

        <div className="space-y-4">
          {sortedActivities.map((activity) => (
            <div key={activity.id} className="relative pl-14">
              {/* Timeline dot */}
              <div
                className={`absolute left-0 top-1 w-12 h-12 rounded-lg border flex items-center justify-center ${getActivityColor(
                  activity.type
                )}`}
              >
                {getActivityIcon(activity.type)}
              </div>

              {/* Activity card */}
              <div className="bg-[#1A1D2E]/60 backdrop-blur-lg border border-white/10 rounded-lg p-4 hover:border-[#00D9FF]/30 transition-all duration-300">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="text-white font-semibold text-sm">{activity.title}</h5>
                  <span className="text-white/40 text-xs font-mono">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>

                <p className="text-white/60 text-sm mb-3">{activity.description}</p>

                {/* Metadata badges */}
                {activity.metadata && (
                  <div className="flex flex-wrap gap-2">
                    {activity.metadata.deliverableType && (
                      <Badge variant="outline" className="border-[#00D9FF]/30 text-[#00D9FF] text-xs">
                        {activity.metadata.deliverableType}
                      </Badge>
                    )}
                    {activity.metadata.platform && (
                      <Badge variant="outline" className="border-[#FF006E]/30 text-[#FF006E] text-xs">
                        {activity.metadata.platform}
                      </Badge>
                    )}
                    {activity.metadata.amount && (
                      <Badge variant="outline" className="border-[#39FF14]/30 text-[#39FF14] text-xs">
                        {activity.metadata.currency} {activity.metadata.amount.toLocaleString()}
                      </Badge>
                    )}
                    {activity.metadata.status && (
                      <Badge
                        variant="outline"
                        className={
                          activity.metadata.status === 'completed'
                            ? 'border-[#39FF14]/30 text-[#39FF14]'
                            : activity.metadata.status === 'pending'
                            ? 'border-yellow-500/30 text-yellow-400'
                            : 'border-white/20 text-white/60'
                        }
                      >
                        {activity.metadata.status}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {sortedActivities.length === 0 && (
        <div className="text-center py-12 text-white/40">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No activities yet</p>
        </div>
      )}
    </div>
  );
}
