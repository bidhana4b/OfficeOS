import { ClientPerformance } from './types';
import { Card } from '@/components/ui/card';
import {
  Image,
  Video,
  Frame,
  Star,
  DollarSign,
  Users,
  Bike,
  TrendingUp
} from 'lucide-react';

interface ClientPerformancePanelProps {
  performance: ClientPerformance;
}

export function ClientPerformancePanel({ performance }: ClientPerformancePanelProps) {
  const metrics = [
    {
      label: 'Posts Published',
      value: performance.postsPublished,
      icon: Image,
      color: 'text-[#00D9FF]',
      bgColor: 'bg-[#00D9FF]/10',
      borderColor: 'border-[#00D9FF]/30'
    },
    {
      label: 'Reels Published',
      value: performance.reelsPublished,
      icon: Video,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30'
    },
    {
      label: 'Customer Frames',
      value: performance.customerFramesDelivered,
      icon: Frame,
      color: 'text-[#FF006E]',
      bgColor: 'bg-[#FF006E]/10',
      borderColor: 'border-[#FF006E]/30'
    },
    {
      label: 'Review Videos',
      value: performance.reviewVideosDelivered,
      icon: Star,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30'
    },
    {
      label: 'Ad Spend',
      value: `BDT ${performance.adSpendThisMonth.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-[#39FF14]',
      bgColor: 'bg-[#39FF14]/10',
      borderColor: 'border-[#39FF14]/30'
    },
    {
      label: 'Leads Generated',
      value: performance.leadsGenerated,
      icon: Users,
      color: 'text-[#00D9FF]',
      bgColor: 'bg-[#00D9FF]/10',
      borderColor: 'border-[#00D9FF]/30'
    },
    {
      label: 'Test Ride Bookings',
      value: performance.testRideBookings,
      icon: Bike,
      color: 'text-[#FF006E]',
      bgColor: 'bg-[#FF006E]/10',
      borderColor: 'border-[#FF006E]/30'
    }
  ];

  const formatPeriod = () => {
    const start = new Date(performance.period.start);
    const end = new Date(performance.period.end);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#39FF14]" />
          <h4 className="text-lg font-bold text-white">Performance Metrics</h4>
        </div>
        <span className="text-xs text-white/40 font-mono">{formatPeriod()}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <Card
            key={metric.label}
            className={`bg-[#1A1D2E]/60 backdrop-blur-lg border ${metric.borderColor} p-4 hover:border-opacity-60 transition-all duration-300 hover:scale-[1.02]`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-white/60 text-xs mb-1">{metric.label}</div>
                <div className={`text-2xl font-bold font-mono ${metric.color}`}>
                  {metric.value}
                </div>
              </div>
              <div className={`w-10 h-10 rounded-lg ${metric.bgColor} border ${metric.borderColor} flex items-center justify-center`}>
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Performance Summary */}
      <Card className="bg-gradient-to-br from-[#1A1D2E]/80 to-[#0A0E27]/80 backdrop-blur-lg border border-[#00D9FF]/30 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#00D9FF]/10 border border-[#00D9FF]/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[#00D9FF]" />
          </div>
          <div>
            <div className="text-white font-semibold">Royal Dominance Impact</div>
            <div className="text-white/60 text-xs">Month-to-Date Performance</div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-white/10">
            <span className="text-white/60">Content Delivery Rate</span>
            <span className="text-[#39FF14] font-semibold">
              {performance.postsPublished + performance.reelsPublished} pieces
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/10">
            <span className="text-white/60">Creative Assets</span>
            <span className="text-[#00D9FF] font-semibold">
              {performance.customerFramesDelivered + performance.reviewVideosDelivered} total
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/10">
            <span className="text-white/60">Lead Conversion</span>
            <span className="text-purple-400 font-semibold">
              {((performance.testRideBookings / performance.leadsGenerated) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-white/60">Cost Per Lead</span>
            <span className="text-[#FF006E] font-semibold">
              BDT {Math.round(performance.adSpendThisMonth / performance.leadsGenerated)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
