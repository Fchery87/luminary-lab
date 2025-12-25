'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { MoreHorizontal, Play, Edit2, Trash2, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectTags } from '@/components/ui/tag-badge';

// Local Project type definition
export interface Project {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'queued';
  thumbnailUrl?: string;
  styleName?: string;
  intensity?: number;
  createdAt: string;
  originalImageUrl?: string;
  processedImageUrl?: string;
  tags?: Array<{ name: string; type: string }>;
  metadata?: any;
}

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
  viewMode?: 'grid' | 'list';
}

export function ProjectCard({ project, onDelete, isDeleting, viewMode = 'grid' }: ProjectCardProps) {
  const statusConfig = {
    completed: {
      icon: <CheckCircle2 className="w-3 h-3" />,
      badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    },
    processing: {
      icon: <Clock className="w-3 h-3 animate-pulse text-foreground/60" />,
      badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    },
    failed: {
      icon: <AlertCircle className="w-3 h-3" />,
      badge: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    },
    queued: {
      icon: <Clock className="w-3 h-3 opacity-60" />,
      badge: 'bg-secondary border-border/20 text-muted-foreground',
    },
    pending: {
      icon: <Clock className="w-3 h-3 opacity-60" />,
      badge: 'bg-secondary border-border/20 text-muted-foreground',
    },
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="group relative overflow-hidden"
    >
      <motion.div
        whileHover={{
          borderColor: "rgba(255, 255, 255, 0.08)",
          boxShadow: "0 0 24px rgba(0, 0, 0, 0.06)",
        }}
        className={`
          bg-card/50 backdrop-blur-sm border border-white/5 rounded-lg
          transition-all duration-400
          ${viewMode === 'list' ? 'flex flex-row gap-4' : 'flex flex-col'}
        `}
      >
        {/* Image Container */}
        <div className={`relative overflow-hidden bg-secondary ${viewMode === 'list' ? 'w-48 h-32 flex-shrink-0' : 'aspect-[3/2]'}`}>
          <Image
            src={project.thumbnailUrl || project.originalImageUrl || '/placeholder.svg'}
            alt={project.name}
            fill
            className="object-cover opacity-95 transition-all duration-400 group-hover:opacity-100 group-hover:translate-y-[-2px]"
          />

          {/* Hover Overlay */}
          <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 backdrop-blur-sm">
            <Link href={`/edit/${project.id}`}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="h-10 w-10 rounded-full bg-background/90 flex items-center justify-center border border-white/10 hover:border-white/20 transition-all"
              >
                <Edit2 className="w-4 h-4 text-foreground" />
              </motion.button>
            </Link>

            <Link href={`/compare/${project.id}`}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="h-10 w-10 rounded-full bg-background/90 flex items-center justify-center border border-white/10 hover:border-white/20 transition-all"
              >
                <Play className="w-4 h-4 text-foreground" />
              </motion.button>
            </Link>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`absolute top-3 ${viewMode === 'list' ? 'right-auto left-3' : 'right-3'}`}>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium backdrop-blur-md ${statusConfig[project.status as keyof typeof statusConfig].badge}`}>
            {statusConfig[project.status as keyof typeof statusConfig].icon}
            <span className="capitalize">{project.status}</span>
          </div>
        </div>

        {/* Content */}
        <CardContent className={`p-4 ${viewMode === 'list' ? 'flex-1 flex flex-col justify-center min-w-0' : ''}`}>
          <div className="mb-2">
            <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary/80 transition-colors" title={project.name}>
              {project.name}
            </h3>
          </div>

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div className="mb-3">
              <ProjectTags tags={project.tags} maxTags={viewMode === 'list' ? 5 : 3} />
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-mono">{project.id.substring(0, 8)}</span>
            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
            {viewMode === 'list' && (
              <>
                <span>Style: {project.styleName || 'None'}</span>
                <span>Intensity: {project.intensity || 100}%</span>
              </>
            )}
          </div>
        </CardContent>

        <CardFooter className={`p-4 pt-0 flex justify-between items-center text-xs text-muted-foreground border-t border-white/5 ${viewMode === 'list' ? 'border-t-0 flex-row items-center gap-4' : ''}`}>
          <div className="flex items-center">
            <span className="font-mono uppercase text-[10px] tracking-wider text-primary opacity-80">
              {project.styleName}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-white/5">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border rounded-sm">
              <DropdownMenuItem asChild>
                <Link href={`/edit/${project.id}`} className="cursor-pointer text-xs font-medium">
                  Edit Project
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer text-xs font-medium"
                onClick={() => onDelete(project.id)}
              >
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </motion.div>
    </motion.div>
  );
}
