"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useState, useRef } from "react";
import {
  MoreHorizontal,
  Play,
  Edit2,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Local Project type definition
export interface Project {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "failed" | "queued";
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
  viewMode?: "grid" | "list";
  isPriority?: boolean;
}

export function ProjectCard({
  project,
  onDelete,
  isDeleting,
  viewMode = "grid",
  isPriority = false,
}: ProjectCardProps) {
  const [imageAspectRatio, setImageAspectRatio] = useState<number | string>("auto");
  const [showActions, setShowActions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const statusConfig = {
    completed: {
      icon: CheckCircle2,
      label: "Done",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    processing: {
      icon: Clock,
      label: "Processing",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    failed: {
      icon: AlertCircle,
      label: "Failed",
      className: "bg-red-500/10 text-red-400 border-red-500/20",
    },
    queued: {
      icon: Clock,
      label: "Queued",
      className: "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]",
    },
    pending: {
      icon: Clock,
      label: "Pending",
      className: "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]",
    },
  };

  const status = statusConfig[project.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group relative bg-black/40 backdrop-blur-md border border-white/5 overflow-hidden transition-all duration-300 hover:border-white/20 hover:bg-black/60 shadow-xl",
        viewMode === "list" ? "flex flex-row rounded-r-xl" : "flex flex-col rounded-xl"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Top Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold-light))] to-transparent opacity-50" />

      {/* Image Container */}
      <div
        className={cn(
          "relative overflow-hidden bg-black",
          viewMode === "list" ? "w-48 h-32 flex-shrink-0" : "w-full aspect-[4/3]"
        )}
      >
        <Image
          src={project.thumbnailUrl || project.originalImageUrl || "/placeholder.svg"}
          alt={project.name}
          fill
          priority={isPriority}
          sizes={viewMode === "list" ? "200px" : "(max-width: 768px) 100vw, 400px"}
          className="object-contain transition-transform duration-500 group-hover:scale-105"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              const ratio = img.naturalWidth / img.naturalHeight;
              setImageAspectRatio(Math.max(0.3, Math.min(3.33, ratio)));
            }
          }}
        />

        {/* Hover Overlay */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center gap-3 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          showActions ? "opacity-100" : "opacity-0"
        )}>
          <Link href={`/edit/${project.id}`}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all text-white"
            >
              <Edit2 className="w-4 h-4" />
            </motion.button>
          </Link>

          <Link href={`/compare/${project.id}`}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all text-white"
            >
              <Play className="w-4 h-4 ml-0.5" />
            </motion.button>
          </Link>
        </div>

        {/* Modern Status Indicator */}
        <div className="absolute top-3 right-3">
          <div
            className={cn(
              "group/status relative flex items-center gap-2 px-2 py-1 rounded-full backdrop-blur-md transition-all",
              project.status === "completed" && "bg-emerald-500/10",
              project.status === "processing" && "bg-amber-500/10",
              project.status === "failed" && "bg-red-500/10",
              (project.status === "pending" || project.status === "queued") && "bg-white/5"
            )}
          >
            {/* Status Dot with Glow */}
            <span
              className={cn(
                "relative flex h-2 w-2 rounded-full",
                project.status === "completed" && "bg-emerald-400",
                project.status === "processing" && "bg-amber-400 animate-pulse",
                project.status === "failed" && "bg-red-400",
                (project.status === "pending" || project.status === "queued") && "bg-[hsl(var(--muted-foreground))]"
              )}
            >
              {/* Glow Effect for Completed */}
              {project.status === "completed" && (
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20" />
              )}
              {/* Pulse Ring for Processing */}
              {project.status === "processing" && (
                <span className="absolute -inset-1 rounded-full bg-amber-400/30 animate-pulse" />
              )}
            </span>

            {/* Label - Hidden by default, shows on group hover */}
            <span
              className={cn(
                "text-[9px] font-medium uppercase tracking-wider overflow-hidden transition-all duration-200",
                "max-w-0 group-hover/status:max-w-16 group-hover/status:mr-0.5",
                project.status === "completed" && "text-emerald-400",
                project.status === "processing" && "text-amber-400",
                project.status === "failed" && "text-red-400",
                (project.status === "pending" || project.status === "queued") && "text-[hsl(var(--muted-foreground))]"
              )}
            >
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        "flex flex-col",
        viewMode === "list" ? "flex-1 p-4 justify-center" : "p-4"
      )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link href={`/edit/${project.id}`}>
              <h3 className="font-display font-semibold text-sm truncate group-hover:text-[hsl(var(--gold))] transition-colors">
                {project.name}
              </h3>
            </Link>
            
            <div className="flex items-center gap-3 mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              <span className="font-mono">{project.id.substring(0, 8)}</span>
              <span>•</span>
              <span>{new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Quick Actions Menu */}
          <div className="relative" onMouseLeave={() => setShowMenu(false)}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-sm hover:bg-[hsl(var(--secondary))] transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            </button>

            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 bottom-full mb-1 w-40 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-sm shadow-lg z-50"
              >
                <Link
                  href={`/edit/${project.id}`}
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-[hsl(var(--secondary))] transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Project
                </Link>

                <Link
                  href={`/compare/${project.id}`}
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-[hsl(var(--secondary))] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Results
                </Link>

                <button
                  onClick={() => {
                    onDelete(project.id);
                    setShowMenu(false);
                  }}
                  disabled={isDeleting}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Style Info */}
        {project.styleName && (
          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--gold))]">
              {project.styleName}
            </span>
            {project.intensity !== undefined && (
              <span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
                {project.intensity}%
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {project.tags.slice(0, viewMode === "list" ? 5 : 3).map((tag) => (
              <span
                key={tag.name}
                className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] rounded-sm"
              >
                {tag.name}
              </span>
            ))}
            {project.tags.length > (viewMode === "list" ? 5 : 3) && (
              <span className="px-1.5 py-0.5 text-[9px] text-[hsl(var(--muted-foreground))]">
                +{project.tags.length - (viewMode === "list" ? 5 : 3)}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
