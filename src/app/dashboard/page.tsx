'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Image as ImageIcon,
  Calendar,
  SortAsc,
  SortDesc,
  Grid,
  List,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

import { ProjectCard, type Project } from './project-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (res.status === 401) {
        router.push('/login');
        throw new Error('Unauthorized');
      }
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json() as Promise<Project[]>;
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/projects', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled Project' })
      });
      if (!res.ok) throw new Error('Failed to create project');
      return res.json();
    },
    onSuccess: (newProject) => {
      toast.success('New project created');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      window.location.href = `/edit/${newProject.id}`;
    },
    onError: () => {
      toast.error('Failed to create project');
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete project');
      return projectId;
    },
    onSuccess: () => {
      toast.success('Project deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => {
      toast.error('Failed to delete project');
    },
  });

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (project.styleName && project.styleName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterStatus === 'all' || project.status === filterStatus;
    
    const projectDate = new Date(project.createdAt);
    const now = new Date();
    let matchesDateRange = true;
    
    switch (dateRange) {
      case 'today':
        matchesDateRange = projectDate.toDateString() === now.toDateString();
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDateRange = projectDate >= weekAgo;
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDateRange = projectDate >= monthAgo;
        break;
    }
    
    return matchesSearch && matchesFilter && matchesDateRange;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'status':
        comparison = (a.status || '').localeCompare(b.status || '');
        break;
      case 'date':
      default:
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleDeleteProject = (projectId: string) => {
    if (window.confirm(`Are you sure you want to delete this project?`)) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const handleCreateProject = () => {
    createProjectMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
        <div className="flex flex-col items-center gap-4">
          <LoadingSkeleton className="h-10 w-10 rounded-sm" />
          <p className="font-body text-sm text-[hsl(var(--muted-foreground))]">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        {/* Texture overlays */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.02]">
          <div className="absolute inset-0 grid-pattern" />
        </div>

        <Header 
          variant="minimal"
          navigation={
            <Link 
              href="/pricing" 
              className="font-body text-sm font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors relative group"
            >
              Upgrade
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[hsl(var(--gold))] group-hover:w-full transition-all duration-300" />
            </Link>
          }
        />

        <main className="flex-1 relative z-10">
          <section className="w-full py-8 lg:py-12">
            <div className="container mx-auto px-4 md:px-6 max-w-7xl">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12"
              >
                <div className="relative">
                  <div className="absolute -top-3 -left-3 w-8 h-8 border-l-2 border-t-2 border-[hsl(var(--gold))]/30 rounded-tl-sm" />
                  <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-2">
                    My Projects
                  </h1>
                  <p className="font-body text-[hsl(var(--muted-foreground))] text-lg">
                    Manage and view your AI-enhanced photos
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateProject}
                  disabled={createProjectMutation.isPending}
                  className="font-display uppercase tracking-wider rounded-sm transition-all duration-200 relative overflow-hidden bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold-light))] px-6 py-3 text-sm font-semibold border border-transparent hover:border-[hsl(var(--gold))]"
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
                  {/* Top amber accent line */}
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-[hsl(var(--gold-light))]/50" />
                </motion.button>
              </motion.div>

              {/* Search and Filter */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
                className="space-y-4 mb-10"
              >
                {/* First Row: Search + View Toggle */}
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                  <div className="relative flex-1 w-full lg:w-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <Input
                      placeholder="Search projects by name or style..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11 rounded-sm border-[hsl(var(--border))] bg-[hsl(var(--card))] focus:border-[hsl(var(--gold))] font-body"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      onClick={() => setViewMode('grid')}
                      size="sm"
                      className="rounded-sm font-display uppercase tracking-wider text-xs"
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      onClick={() => setViewMode('list')}
                      size="sm"
                      className="rounded-sm font-display uppercase tracking-wider text-xs"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Second Row: Status Filter + Date Range + Sort */}
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                  {/* Status Filter */}
                  <div className="flex gap-2 w-full lg:w-auto overflow-x-auto">
                    <Button
                      variant={filterStatus === 'all' ? 'default' : 'outline'}
                      onClick={() => setFilterStatus('all')}
                      className="rounded-sm uppercase tracking-wider text-xs font-display"
                    >
                      All ({projects.length})
                    </Button>
                    <Button
                      variant={filterStatus === 'completed' ? 'default' : 'outline'}
                      onClick={() => setFilterStatus('completed')}
                      className="rounded-sm uppercase tracking-wider text-xs font-display"
                    >
                      Completed ({projects.filter(p => p.status === 'completed').length})
                    </Button>
                    <Button
                      variant={filterStatus === 'processing' ? 'default' : 'outline'}
                      onClick={() => setFilterStatus('processing')}
                      className="rounded-sm uppercase tracking-wider text-xs font-display"
                    >
                      Processing ({projects.filter(p => p.status === 'processing').length})
                    </Button>
                  </div>

                  {/* Date Range Filter */}
                  <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                    <SelectTrigger className="w-full lg:w-40 rounded-sm border-[hsl(var(--border))] font-body text-xs">
                      <Calendar className="mr-2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Sort Options */}
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="w-full lg:w-32 rounded-sm border-[hsl(var(--border))] font-body text-xs">
                        {sortOrder === 'asc' ? <SortAsc className="mr-2 h-4 w-4 text-[hsl(var(--muted-foreground))]" /> : <SortDesc className="mr-2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />}
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      size="sm"
                      className="rounded-sm"
                    >
                      {sortOrder === 'asc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* Projects Grid */}
              <AnimatePresence mode="wait">
                {sortedProjects.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex flex-col items-center justify-center py-24 text-center relative"
                  >
                    <div className="w-24 h-24 rounded-sm bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex items-center justify-center mb-6 relative">
                      <div className="absolute top-0 left-0 w-12 h-[1px] bg-gradient-to-r from-[hsl(var(--gold))] to-transparent" />
                      <ImageIcon className="w-10 h-10 text-[hsl(var(--muted-foreground))]/40" />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
                      No projects yet
                    </h3>
                    <p className="font-body text-[hsl(var(--muted-foreground))] mb-6 max-w-sm mx-auto">
                      Start by creating your first project. Upload RAW images and let our AI enhance them.
                    </p>
                    <Button 
                      onClick={handleCreateProject} 
                      disabled={createProjectMutation.isPending} 
                      className="bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold-light))] font-display font-semibold uppercase tracking-wider rounded-sm"
                    >
                      {createProjectMutation.isPending ? 'Creating...' : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create First Project
                        </>
                      )}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.08,
                          delayChildren: 0.15,
                        },
                      },
                    }}
                    className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  >
                    <AnimatePresence>
                      {sortedProjects.map((project) => (
                        <motion.div
                          key={project.id}
                          variants={{
                            hidden: { opacity: 0, y: 10 },
                            visible: { opacity: 1, y: 0 },
                          }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                          <ProjectCard
                            project={project}
                            onDelete={handleDeleteProject}
                            isDeleting={deleteProjectMutation.isPending}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </main>
      </div>
    </ErrorBoundary>
  );
}
