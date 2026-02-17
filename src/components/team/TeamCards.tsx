import { motion } from 'framer-motion';
import {
  Palette,
  Video,
  Megaphone,
  PenTool,
  Users,
  Target,
  Briefcase,
  Calculator,
  Brain,
  Code,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamInfo, TeamCategory } from './types';

const iconMap: Record<string, typeof Palette> = {
  palette: Palette,
  video: Video,
  megaphone: Megaphone,
  'pen-tool': PenTool,
  users: Users,
  target: Target,
  briefcase: Briefcase,
  calculator: Calculator,
  brain: Brain,
  code: Code,
};

const colorConfig = {
  cyan: {
    bg: 'from-titan-cyan/10 to-transparent',
    border: 'border-titan-cyan/15 hover:border-titan-cyan/40',
    glow: 'hover:shadow-[0_0_30px_rgba(0,217,255,0.12)]',
    iconBg: 'bg-titan-cyan/10',
    iconText: 'text-titan-cyan',
    scoreBg: 'bg-titan-cyan/10',
    scoreText: 'text-titan-cyan',
    bar: 'bg-titan-cyan',
  },
  purple: {
    bg: 'from-titan-purple/10 to-transparent',
    border: 'border-titan-purple/15 hover:border-titan-purple/40',
    glow: 'hover:shadow-[0_0_30px_rgba(123,97,255,0.12)]',
    iconBg: 'bg-titan-purple/10',
    iconText: 'text-titan-purple',
    scoreBg: 'bg-titan-purple/10',
    scoreText: 'text-titan-purple',
    bar: 'bg-titan-purple',
  },
  magenta: {
    bg: 'from-titan-magenta/10 to-transparent',
    border: 'border-titan-magenta/15 hover:border-titan-magenta/40',
    glow: 'hover:shadow-[0_0_30px_rgba(255,0,110,0.12)]',
    iconBg: 'bg-titan-magenta/10',
    iconText: 'text-titan-magenta',
    scoreBg: 'bg-titan-magenta/10',
    scoreText: 'text-titan-magenta',
    bar: 'bg-titan-magenta',
  },
  lime: {
    bg: 'from-titan-lime/10 to-transparent',
    border: 'border-titan-lime/15 hover:border-titan-lime/40',
    glow: 'hover:shadow-[0_0_30px_rgba(57,255,20,0.12)]',
    iconBg: 'bg-titan-lime/10',
    iconText: 'text-titan-lime',
    scoreBg: 'bg-titan-lime/10',
    scoreText: 'text-titan-lime',
    bar: 'bg-titan-lime',
  },
};

interface TeamCardsProps {
  teams: TeamInfo[];
  onSelectTeam: (category: TeamCategory) => void;
  selectedTeam: TeamCategory | null;
}

export default function TeamCards({ teams, onSelectTeam, selectedTeam }: TeamCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {teams.map((team, index) => {
        const Icon = iconMap[team.icon] || Users;
        const colors = colorConfig[team.color];
        const isSelected = selectedTeam === team.category;

        return (
          <motion.button
            key={team.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.35 }}
            onClick={() => onSelectTeam(team.category)}
            className={cn(
              'relative text-left p-4 rounded-xl border backdrop-blur-[24px] transition-all duration-300 group',
              'bg-gradient-to-br active:scale-[0.98]',
              colors.bg,
              isSelected
                ? cn(colors.border.replace('hover:', ''), 'ring-1', 
                    team.color === 'cyan' ? 'ring-titan-cyan/30' :
                    team.color === 'purple' ? 'ring-titan-purple/30' :
                    team.color === 'magenta' ? 'ring-titan-magenta/30' :
                    'ring-titan-lime/30')
                : colors.border,
              colors.glow
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg', colors.iconBg)}>
                <Icon className={cn('w-4.5 h-4.5', colors.iconText)} />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors" />
            </div>

            {/* Team Name */}
            <h3 className="font-display font-bold text-sm text-white mb-0.5 truncate">{team.name}</h3>
            <p className="font-mono-data text-[10px] text-white/30 mb-3 truncate">{team.description}</p>

            {/* Stats Row */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-white/30" />
                <span className="font-mono-data text-[10px] text-white/50">{team.totalMembers}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-mono-data text-[10px] text-white/30">Tasks:</span>
                <span className="font-mono-data text-[10px] text-white/50">{team.activeTasks}</span>
              </div>
            </div>

            {/* Overloaded Warning */}
            {team.overloadedMembers > 0 && (
              <div className="flex items-center gap-1.5 mb-3 px-2 py-1 rounded-md bg-titan-magenta/10 border border-titan-magenta/15">
                <AlertTriangle className="w-3 h-3 text-titan-magenta" />
                <span className="font-mono-data text-[9px] text-titan-magenta">
                  {team.overloadedMembers} overloaded
                </span>
              </div>
            )}

            {/* Efficiency Score */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono-data text-[9px] text-white/30">Efficiency</span>
              <span className={cn('font-mono-data text-[10px] font-bold', colors.scoreText)}>
                {team.efficiencyScore}%
              </span>
            </div>
            <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${team.efficiencyScore}%` }}
                transition={{ delay: index * 0.05 + 0.3, duration: 0.6, ease: 'easeOut' }}
                className={cn('h-full rounded-full', colors.bar)}
              />
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
