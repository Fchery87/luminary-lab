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
}

export function ProjectCard({
  project,
  onDelete,
  isDeleting,
  viewMode = "grid",
}: ProjectCardProps) {
  const [imageAspectRatio, setImageAspectRatio] = useState<number | string>("auto");
  const [showActions, setShowActions] = useState(false);

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
        "group relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-hidden transition-all duration-300 hover:border-[hsl(var(--gold))]/50",
        viewMode === "list" ? "flex flex-row" : "flex flex-col"
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
              className="w-10 h-10 rounded-sm bg-[hsl(var(--card))] flex items-center justify-center border border-[hsl(var(--border))] hover:border-[hsl(var(--gold))] transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </motion.button>
          </Link>

          <Link href={`/compare/${project.id}`}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-sm bg-[hsl(var(--gold))] flex items-center justify-center text-[hsl(var(--charcoal))]"
            >
              <Play className="w-4 h-4" />
            </motion.button>
          </Link>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium border rounded-sm",
            status.className
          )}
          >
            <StatusIcon className={cn("w-3 h-3", project.status === "processing" && "animate-pulse")} />
            <span className="uppercase tracking-wider">{status.label}</span>
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
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1.5 rounded-sm hover:bg-[hsl(var(--secondary))] transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            </button>

            {showActions && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-1 w-40 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-sm shadow-lg z-20"
              >
                <Link
                  href={`/edit/${project.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-[hsl(var(--secondary))] transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Project
                </Link>
                
                <Link
                  href={`/compare/${project.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-[hsl(var(--secondary))] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Results
                </Link>
                
                <button
                  onClick={() => {
                    onDelete(project.id);
                    setShowActions(false);
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
