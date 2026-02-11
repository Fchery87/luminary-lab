# Quick Dashboard Visual Fixes

Here are the fastest wins to remove cheesy effects from dashboard:

## 1. Replace TextShimmer (Line 174)

**Change:**
```tsx
<TextShimmer shimmerColor="#30e3ca">My Projects</TextShimmer>
```

**To:**
```tsx
<span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent">
  My Projects
</span>
```

## 2. Remove Neon Shadow from "Open" Button (Line 77)

**Change:**
```tsx
<Button size="sm" className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm text-xs uppercase tracking-wide font-medium shadow-[0_0_15px_rgba(48,227,202,0.4)]" asChild>
```

**To:**
```tsx
<Button size="sm" className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm text-xs uppercase tracking-wide font-medium transition-all duration-200" asChild>
```

## 3. Remove Scale Transform from Image (project-card.tsx Line 68)

**Change:**
```tsx
<Image className="object-cover opacity-95 transition-opacity duration-200 group-hover:opacity-100 scale-100 group-hover:scale-105 transition-transform duration-700" />
```

**To:**
```tsx
<Image className="object-cover opacity-95 transition-all duration-400 group-hover:opacity-100 group-hover:translate-y-[-2px] group-hover:shadow-[0_8px_24px_-2px_rgba(0,0,0,0.08)]" />
```

## 4. Refine Status Colors (project-card.tsx Lines 38-44)

**Change:**
```tsx
const statusColors = {
  completed: 'text-primary border-primary/20 bg-primary/10',
  processing: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10',
  failed: 'text-destructive border-destructive/20 bg-destructive/10',
  queued: 'text-muted-foreground border-border bg-secondary',
  pending: 'text-muted-foreground border-border bg-secondary',
};
```

**To:**
```tsx
const statusColors = {
  completed: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  processing: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
  failed: 'text-rose-400 border-rose-500/20 bg-rose-500/10',
  queued: 'text-muted-foreground border-border/20 bg-secondary',
  pending: 'text-muted-foreground border-border/20 bg-secondary',
};
```

## 5. Remove Spinning Icon (project-card.tsx Line 48)

**Change:**
```tsx
processing: <Clock className="w-3 h-3 mr-1 animate-spin" />
```

**To:**
```tsx
processing: <Clock className="w-3 h-3 mr-1 animate-pulse text-foreground/60" />
```

## 6. Improve Empty State (dashboard page Lines 302-326)

**Change:**
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  className="text-center py-20 bg-card rounded-sm border border-border"
>
  <div className="bg-secondary p-4 rounded-sm inline-flex mb-4 border border-border">
    <ImageIcon className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 className="text-xl font-semibold mb-2">No projects found</h3>
  ...
</motion.div>
```

**To:**
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
  className="flex flex-col items-center justify-center py-20 text-center"
>
  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-secondary/50 to-secondary/20 flex items-center justify-center mb-6 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.04)]">
    <ImageIcon className="w-10 h-10 text-muted-foreground/60" />
  </div>
  <h3 className="text-xl font-semibold text-foreground mb-2">
    No projects yet
  </h3>
  <p className="text-muted-foreground max-w-sm mx-auto mb-6">
    Start by creating your first project. Upload RAW images and let our AI enhance them.
  </p>
  <Button onClick={handleCreateProject} disabled={createProjectMutation.isPending} size="lg">
    {createProjectMutation.isPending ? 'Creating...' : 'Create First Project'}
  </Button>
</motion.div>
```

## Summary of Changes

| File | Line | What Changed | Time to Apply |
|-------|--------|--------------|----------------|
| dashboard/page.tsx | 174 | Remove TextShimmer | 30 seconds |
| dashboard/page.tsx | 77 | Remove neon shadow | 15 seconds |
| project-card.tsx | 68 | Remove scale transform | 20 seconds |
| project-card.tsx | 38-44 | Refine status colors | 15 seconds |
| project-card.tsx | 48 | Remove spin animation | 10 seconds |
| dashboard/page.tsx | 302-326 | Improve empty state | 2 minutes |

**Total time: ~4 minutes**

All changes are simple find-and-replace. No new files needed.

---

## Full Modern Dashboard Header Example

Replace lines 167-191 in `dashboard/page.tsx`:

```tsx
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden: { opacity: 0, y: -15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.15,
      },
    },
  }}
>
  <motion.div
    variants={{
      hidden: { opacity: 0, y: -10 },
      visible: { opacity: 1, y: 0 },
    }}
    transition={{ duration: 0.4, ease: [0.4, 0, 0.2] }}
    className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
  >
    <div>
      <h1 className="text-4xl font-bold tracking-tight">
        <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
          My Projects
        </span>
      </h1>
      <p className="text-muted-foreground mt-2 text-lg">
        Manage and view your AI-enhanced photos
      </p>
    </div>

    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCreateProject}
      disabled={createProjectMutation.isPending}
      size="lg"
      className="uppercase tracking-wider rounded-sm transition-all duration-200 relative overflow-hidden"
    >
      {createProjectMutation.isPending ? (
        <span className="flex items-center gap-2">
          <LoadingSkeleton className="h-4 w-4" />
          Creating...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          New Project
        </span>
      )}
    </motion.button>
  </motion.div>
</motion.div>
```

---

## Full Modern Project Card Example

Replace entire `project-card.tsx` with this:

```tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { MoreHorizontal, Play, Edit2, Trash2, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
}

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function ModernProjectCard({ project, onDelete, isDeleting }: ProjectCardProps) {
  const statusConfig = {
    completed: {
      icon: <CheckCircle2 className="w-3 h-3" />,
      badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    },
    processing: {
      icon: <Clock className="w-3 h-3 animate-pulse" />,
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
        className="
          bg-card/50 backdrop-blur-sm border border-white/5 rounded-lg
          transition-all duration-400
          flex flex-col
        "
      >
        {/* Image Container */}
        <div className="relative aspect-[3/2] overflow-hidden bg-secondary">
          <Image
            src={project.thumbnailUrl || project.originalImageUrl || '/placeholder.jpg'}
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
                className="h-10 w-10 rounded-full bg-background/90 flex items-center justify-center border border-white/10 hover:border-white/20"
              >
                <Edit2 className="w-4 h-4 text-foreground" />
              </motion.button>
            </Link>

            <Link href={`/compare/${project.id}`}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="h-10 w-10 rounded-full bg-background/90 flex items-center justify-center border border-white/10 hover:border-white/20"
              >
                <Play className="w-4 h-4 text-foreground" />
              </motion.button>
            </Link>
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium backdrop-blur-md ${statusConfig[project.status as keyof typeof statusConfig].badge}`}>
            {statusConfig[project.status as keyof typeof statusConfig].icon}
            <span className="capitalize">{project.status}</span>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4">
          <div className="mb-2">
            <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary/80 transition-colors" title={project.name}>
              {project.name}
            </h3>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-mono">{project.id.substring(0, 8)}</span>
            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 flex justify-between items-center text-xs text-muted-foreground border-t border-white/5">
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
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/edit/${project.id}`} className="cursor-pointer">
                  Edit Project
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
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
```

Use this to replace the existing `ProjectCard` component.
