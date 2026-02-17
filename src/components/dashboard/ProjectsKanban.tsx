import { useState } from 'react';
import { motion } from 'framer-motion';
import { FolderKanban, Clock, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectsData as mockProjectsData } from './mock-data';
import type { ProjectCard } from './types';

interface ProjectsKanbanProps {
  data?: ProjectCard[];
  loading?: boolean;
}

const columns = [
  { id: 'briefing', label: 'Briefing', color: 'titan-purple' },
  { id: 'in-progress', label: 'In Progress', color: 'titan-cyan' },
  { id: 'review', label: 'Review', color: 'titan-magenta' },
  { id: 'delivered', label: 'Delivered', color: 'titan-lime' },
];

const statusColors: Record<string, { dot: string; bg: string; text: string; progress: string }> = {
  briefing: { dot: 'bg-titan-purple', bg: 'bg-titan-purple/10', text: 'text-titan-purple', progress: 'bg-titan-purple' },
  'in-progress': { dot: 'bg-titan-cyan', bg: 'bg-titan-cyan/10', text: 'text-titan-cyan', progress: 'bg-titan-cyan' },
  review: { dot: 'bg-titan-magenta', bg: 'bg-titan-magenta/10', text: 'text-titan-magenta', progress: 'bg-titan-magenta' },
  delivered: { dot: 'bg-titan-lime', bg: 'bg-titan-lime/10', text: 'text-titan-lime', progress: 'bg-titan-lime' },
};

function ProjectCardItem({ project }: { project: ProjectCard }) {
  const colors = statusColors[project.status];
  
  return (
    <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-200 cursor-pointer group">
      <div className="flex items-center justify-between mb-2.5">
        <span className={cn('font-mono-data text-[9px] px-1.5 py-0.5 rounded-full', colors.bg, colors.text)}>
          {project.client}
        </span>
        <GripVertical className="w-3 h-3 text-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      <h4 className="font-display font-semibold text-xs text-white/90 mb-2">{project.title}</h4>
      
      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-white/[0.06] mb-2.5">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colors.progress)}
          style={{ width: `${project.progress}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between">
        {/* Team avatars */}
        <div className="flex -space-x-1.5">
          {project.team.slice(0, 3).map((member, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full bg-gradient-to-br from-white/10 to-white/5 border-2 border-titan-card flex items-center justify-center"
              title={member.name}
            >
              <span className="font-mono-data text-[7px] text-white/50">{member.avatar}</span>
            </div>
          ))}
          {project.team.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-white/[0.06] border-2 border-titan-card flex items-center justify-center">
              <span className="font-mono-data text-[7px] text-white/30">+{project.team.length - 3}</span>
            </div>
          )}
        </div>
        
        {/* Deadline */}
        <div className="flex items-center gap-1">
          <Clock className={cn('w-3 h-3', project.daysLeft <= 5 ? 'text-titan-magenta' : 'text-white/20')} />
          <span className={cn(
            'font-mono-data text-[9px]',
            project.daysLeft <= 5 ? 'text-titan-magenta' : 'text-white/30'
          )}>
            {project.daysLeft === 0 ? 'Delivered' : `${project.daysLeft}d left`}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsKanban({ data, loading }: ProjectsKanbanProps) {
  const projectsData = data && data.length > 0 ? data : mockProjectsData;
  const getProjectsByStatus = (status: string) => projectsData.filter(p => p.status === status);
  
  return (
    <div className="glass-card border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
        <FolderKanban className="w-4 h-4 text-titan-cyan/60" />
        <h3 className="font-display font-bold text-sm text-white">Active Projects</h3>
        <span className="font-mono-data text-[10px] text-white/30 ml-auto">{projectsData.length} projects</span>
      </div>
      
      <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory p-4 gap-4">
        {columns.map((column) => {
          const projects = getProjectsByStatus(column.id);
          const colColors = statusColors[column.id];
          
          return (
            <div key={column.id} className="flex-shrink-0 w-[260px] snap-start">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className={cn('w-2 h-2 rounded-full', colColors.dot)} />
                <span className="font-mono-data text-[11px] text-white/50 tracking-wide">{column.label}</span>
                <span className="font-mono-data text-[10px] text-white/20 ml-auto">{projects.length}</span>
              </div>
              
              <div className="space-y-2.5 min-h-[140px] p-2 rounded-lg bg-white/[0.01] border border-white/[0.03] border-dashed">
                {projects.map((project) => (
                  <ProjectCardItem key={project.id} project={project} />
                ))}
                {projects.length === 0 && (
                  <div className="flex items-center justify-center h-[100px] text-white/10 font-mono-data text-[10px]">
                    No projects
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
