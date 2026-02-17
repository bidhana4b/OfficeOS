import { FileText, Rocket, UserPlus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  {
    id: 'invoice',
    label: 'Create Invoice',
    icon: FileText,
    color: 'from-titan-cyan/20 to-titan-cyan/5',
    border: 'border-titan-cyan/20 hover:border-titan-cyan/40',
    iconColor: 'text-titan-cyan',
    glow: 'hover:shadow-[0_0_20px_rgba(0,217,255,0.15)]',
  },
  {
    id: 'campaign',
    label: 'Launch Campaign',
    icon: Rocket,
    color: 'from-titan-purple/20 to-titan-purple/5',
    border: 'border-titan-purple/20 hover:border-titan-purple/40',
    iconColor: 'text-titan-purple',
    glow: 'hover:shadow-[0_0_20px_rgba(123,97,255,0.15)]',
  },
  {
    id: 'client',
    label: 'Add Client',
    icon: UserPlus,
    color: 'from-titan-lime/20 to-titan-lime/5',
    border: 'border-titan-lime/20 hover:border-titan-lime/40',
    iconColor: 'text-titan-lime',
    glow: 'hover:shadow-[0_0_20px_rgba(57,255,20,0.15)]',
  },
  {
    id: 'report',
    label: 'AI Report',
    icon: Sparkles,
    color: 'from-titan-magenta/20 to-titan-magenta/5',
    border: 'border-titan-magenta/20 hover:border-titan-magenta/40',
    iconColor: 'text-titan-magenta',
    glow: 'hover:shadow-[0_0_20px_rgba(255,0,110,0.15)]',
  },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            className={cn(
              'flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border backdrop-blur-[24px] transition-all duration-200',
              'bg-gradient-to-br active:scale-[0.96]',
              action.color,
              action.border,
              action.glow,
              'group'
            )}
          >
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] transition-all duration-200',
              'group-hover:bg-white/[0.08]'
            )}>
              <Icon className={cn('w-5 h-5 transition-transform duration-200 group-hover:scale-110', action.iconColor)} />
            </div>
            <span className="font-mono-data text-[10px] text-white/60 group-hover:text-white/80 transition-colors tracking-wide">
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
