import React, { useEffect, useState } from 'react';
import { Brain, AlertTriangle, TrendingUp, Lightbulb, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIInsight } from './types';
import { getAIApiKeys, generateDashboardInsights } from '@/lib/ai-service';

interface AIInsightsWidgetProps {
  data?: AIInsight[];
  loading?: boolean;
  dashboardData?: Record<string, unknown>;
}

const typeConfig = {
  warning: {
    icon: AlertTriangle,
    color: 'text-titan-magenta',
    bg: 'bg-titan-magenta/10',
    borderColor: 'border-titan-magenta/20',
    gradient: 'from-titan-magenta/10 via-transparent to-transparent',
  },
  prediction: {
    icon: TrendingUp,
    color: 'text-titan-cyan',
    bg: 'bg-titan-cyan/10',
    borderColor: 'border-titan-cyan/20',
    gradient: 'from-titan-cyan/10 via-transparent to-transparent',
  },
  opportunity: {
    icon: Lightbulb,
    color: 'text-titan-lime',
    bg: 'bg-titan-lime/10',
    borderColor: 'border-titan-lime/20',
    gradient: 'from-titan-lime/10 via-transparent to-transparent',
  },
};

export default function AIInsightsWidget({ data, loading, dashboardData }: AIInsightsWidgetProps) {
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isAIPowered, setIsAIPowered] = useState(false);

  const aiInsightsData = aiInsights.length > 0 ? aiInsights : (data || []);

  useEffect(() => {
    let cancelled = false;
    async function fetchAIInsights() {
      try {
        const keys = await getAIApiKeys();
        if (!keys.enabled || !keys.gemini_api_key || cancelled) return;

        setIsAILoading(true);
        const response = await generateDashboardInsights(dashboardData || {});
        if (cancelled) return;

        try {
          const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleanResponse);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const formatted: AIInsight[] = parsed.map((item: any, idx: number) => ({
              id: `ai-${idx}`,
              type: (['warning', 'prediction', 'opportunity'].includes(item.type) ? item.type : 'opportunity') as AIInsight['type'],
              title: item.title || 'AI Insight',
              description: item.description || '',
              confidence: Math.min(100, Math.max(0, item.confidence || 75)),
              action: 'View Details',
            }));
            setAiInsights(formatted);
            setIsAIPowered(true);
          }
        } catch {
          // JSON parsing failed, keep mock
        }
      } catch {
        // AI not available
      } finally {
        if (!cancelled) setIsAILoading(false);
      }
    }

    fetchAIInsights();
    return () => { cancelled = true; };
  }, [dashboardData]);
  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-r from-titan-cyan/40 via-titan-purple/30 to-titan-magenta/40">
        <div className="w-full h-full rounded-xl bg-titan-card" />
      </div>
      
      <div className="relative z-10 p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-titan-purple/20 to-titan-cyan/10 border border-titan-purple/20">
            <Brain className="w-4 h-4 text-titan-purple" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-white">AI Insights</h3>
            <p className="font-mono-data text-[9px] text-white/30">
              {isAIPowered ? 'Powered by Google Gemini' : 'Powered by TITAN Intelligence'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-titan-purple animate-pulse" />
            <span className="font-mono-data text-[9px] text-titan-purple/60">
              {isAILoading ? (
                <span className="flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" /> Generating...</span>
              ) : loading ? 'Loading...' : `${aiInsightsData.length} new`}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {aiInsightsData.length === 0 && !isAILoading && !loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Brain className="w-8 h-8 text-white/10 mb-3" />
              <p className="font-mono-data text-[11px] text-white/30">No AI insights available</p>
              <p className="font-mono-data text-[10px] text-white/15 mt-1">Insights will appear as data is collected</p>
            </div>
          ) : (
            aiInsightsData.map((insight) => {
              const config = typeConfig[insight.type];
              const Icon = config.icon;

              return (
                <div
                  key={insight.id}
                  className={cn(
                    'relative p-4 rounded-lg border backdrop-blur-sm transition-all duration-300 cursor-pointer group',
                    'bg-gradient-to-r',
                    config.gradient,
                    config.borderColor,
                    'hover:bg-white/[0.03]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('flex items-center justify-center w-7 h-7 rounded-md shrink-0', config.bg)}>
                      <Icon className={cn('w-3.5 h-3.5', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-mono-data text-xs text-white/80 font-medium">{insight.title}</h4>
                        <span className={cn('font-mono-data text-[9px] px-1.5 py-0.5 rounded-full', config.bg, config.color)}>
                          {insight.confidence}% confidence
                        </span>
                      </div>
                      <p className="font-mono-data text-[10px] text-white/35 leading-relaxed line-clamp-2">
                        {insight.description}
                      </p>
                      <button
                        className={cn(
                          'mt-2.5 flex items-center gap-1.5 font-accent font-bold text-[10px] tracking-wider uppercase transition-all duration-200',
                          config.color,
                          'opacity-70 group-hover:opacity-100'
                        )}
                      >
                        {insight.action}
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
