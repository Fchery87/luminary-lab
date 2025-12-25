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
  AlertCircle,
  Camera,
  Filter,
  X,
  Sliders,
  Folder,
  CheckCircle2,
  Clock,
  Activity,
  TrendingUp,
  Hourglass,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

import { ProjectCard, type Project } from './project-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ProjectTags } from '@/components/ui/tag-badge';
import { ActivityTimeline, type ActivityItem } from '@/components/ui/activity-timeline';

export default function DashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Metadata filters
  const [showMetadataFilters, setShowMetadataFilters] = useState(false);
  const [cameraMake, setCameraMake] = useState<string>('');
  const [cameraModel, setCameraModel] = useState<string>('');
  const [lensModel, setLensModel] = useState<string>('');
  const [isoRange, setIsoRange] = useState<[number, number]>([100, 6400]);
  const [selectedTag, setSelectedTag] = useState<string>('');

  const queryClient = useQueryClient();

  // Fetch dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 30000, // Refresh stats every 30 seconds
  });

  // Fetch recent activity
  const { data: activities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/activity?limit=8', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch activity');
      return res.json() as Promise<ActivityItem[]>;
    },
  });

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['projects', searchQuery, filterStatus, dateRange, cameraMake, cameraModel, lensModel, isoRange, selectedTag],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (cameraMake) params.set('cameraMake', cameraMake);
      if (cameraModel) params.set('cameraModel', cameraModel);
      if (lensModel) params.set('lensModel', lensModel);
      if (selectedTag) params.set('tag', selectedTag);
      if (isoRange[0] > 100) params.set('isoMin', isoRange[0].toString());
      if (isoRange[1] < 6400) params.set('isoMax', isoRange[1].toString());

      const res = await fetch(`/api/projects?${params.toString()}`, { credentials: 'include' });
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
        credentials: 'include',
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
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE', credentials: 'include' });
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

  // Note: Filtering is now done server-side via API query params
  const sortedProjects = [...projects].sort((a, b) => {
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

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setDateRange('all');
    setCameraMake('');
    setCameraModel('');
    setLensModel('');
    setIsoRange([100, 6400]);
    setSelectedTag('');
    setShowMetadataFilters(false);
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery !== '' ||
    filterStatus !== 'all' ||
    dateRange !== 'all' ||
    cameraMake !== '' ||
    cameraModel !== '' ||
    lensModel !== '' ||
    selectedTag !== '' ||
    isoRange[0] > 100 ||
    isoRange[1] < 6400;

  const handleDeleteProject = (projectId: string) => {
    if (window.confirm(`Are you sure you want to delete this project?`)) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const handleCreateProject = () => {
    // Redirect to upload page with onboarding flag for first-time users
    router.push('/upload?onboarding=true');
  }

  // Helper function to get adaptive empty state message
  const getEmptyStateMessage = () => {
    if (searchQuery) {
      return {
        title: 'No projects match your search',
        description: `No projects found matching "${searchQuery}". Try a different search term.`,
      };
    }
    if (filterStatus === 'completed') {
      return {
        title: 'No completed projects yet',
        description: 'Your completed projects will appear here once processing finishes.',
      };
    }
    if (filterStatus === 'processing') {
      return {
        title: 'No projects processing',
        description: 'Projects currently being processed will appear here.',
      };
    }
    if (dateRange !== 'all') {
      return {
        title: 'No projects in this period',
        description: `No projects found for the selected date range.`,
      };
    }
    if (cameraMake || cameraModel || lensModel || selectedTag || isoRange[0] > 100 || isoRange[1] < 6400) {
      return {
        title: 'No projects match these filters',
        description: 'Try adjusting your metadata filters to see more results.',
      };
    }
    return {
      title: 'No projects yet',
      description: 'Start by creating your first project. Upload RAW images and let our AI enhance them.',
    };
  };

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

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 rounded-sm bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-[hsl(var(--destructive))]" />
          </div>
          <h3 className="font-display text-xl font-semibold text-[hsl(var(--foreground))]">
            Failed to load projects
          </h3>
          <p className="font-body text-sm text-[hsl(var(--muted-foreground))]">
            {error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}
          </p>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}
            className="bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold-light))] font-display font-semibold uppercase tracking-wider rounded-sm"
          >
            Retry
          </Button>
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

                {/* Second Row: Status Filter + Date Range + Sort + Metadata Filters Toggle */}
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
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

                  <div className="flex gap-2">
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

                    {/* Metadata Filters Toggle */}
                    <Button
                      variant={showMetadataFilters ? 'default' : 'outline'}
                      onClick={() => setShowMetadataFilters(!showMetadataFilters)}
                      size="sm"
                      className="rounded-sm"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {hasActiveFilters && (
                        <div className="ml-1 w-2 h-2 rounded-full bg-[hsl(var(--gold))]" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Third Row: Metadata Filters (collapsible) */}
                <AnimatePresence>
                  {showMetadataFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-[hsl(var(--border))] pt-4 space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Camera Make Filter */}
                        <div>
                          <label className="font-body text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2 block">
                            Camera Make
                          </label>
                          <Input
                            placeholder="Canon, Nikon, Sony..."
                            value={cameraMake}
                            onChange={(e) => setCameraMake(e.target.value)}
                            className="h-9 rounded-sm border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs"
                          />
                        </div>

                        {/* Camera Model Filter */}
                        <div>
                          <label className="font-body text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2 block">
                            Camera Model
                          </label>
                          <Input
                            placeholder="EOS R5, Z9, A7R V..."
                            value={cameraModel}
                            onChange={(e) => setCameraModel(e.target.value)}
                            className="h-9 rounded-sm border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs"
                          />
                        </div>

                        {/* Lens Filter */}
                        <div>
                          <label className="font-body text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2 block">
                            Lens Model
                          </label>
                          <Input
                            placeholder="24-70mm, 85mm f/1.4..."
                            value={lensModel}
                            onChange={(e) => setLensModel(e.target.value)}
                            className="h-9 rounded-sm border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs"
                          />
                        </div>

                        {/* Tag Filter */}
                        <div>
                          <label className="font-body text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2 block">
                            Tag
                          </label>
                          <Input
                            placeholder="Search by tag..."
                            value={selectedTag}
                            onChange={(e) => setSelectedTag(e.target.value)}
                            className="h-9 rounded-sm border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs"
                          />
                        </div>
                      </div>

                      {/* ISO Range Slider */}
                      <div>
                        <label className="font-body text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2 flex justify-between">
                          <span>ISO Range</span>
                          <span className="text-[hsl(var(--gold))]">
                            {isoRange[0]} - {isoRange[1]}
                          </span>
                        </label>
                        <Slider
                          value={isoRange}
                          onValueChange={(value: [number, number]) => setIsoRange(value)}
                          min={100}
                          max={6400}
                          step={100}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))] mt-1">
                          <span>100</span>
                          <span>6400</span>
                        </div>
                      </div>

                      {/* Clear Filters Button */}
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          onClick={clearFilters}
                          size="sm"
                          className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] rounded-sm"
                        >
                          <X className="h-3 w-3 mr-1.5" />
                          Clear All Filters
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Status Overview Cards */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
              >
                {/* Total Projects Card */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-sm p-5 group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[hsl(var(--gold))]/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-[hsl(var(--gold))]/10 transition-colors" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-sm bg-[hsl(var(--gold))]/10 flex items-center justify-center border border-[hsl(var(--gold))]/20">
                        <Folder className="w-5 h-5 text-[hsl(var(--gold))]" />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total</span>
                    </div>
                    <p className="font-display text-3xl font-bold text-[hsl(var(--foreground))] mb-1">
                      {stats?.totalProjects ?? 0}
                    </p>
                    <p className="font-body text-sm text-[hsl(var(--muted-foreground))]">Projects</p>
                  </div>
                  <div className="absolute bottom-0 left-0 w-12 h-[2px] bg-[hsl(var(--gold))]/50 group-hover:w-full transition-all duration-300" />
                </motion.div>

                {/* Completed Projects Card */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-sm p-5 group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-colors" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-sm bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Ready</span>
                    </div>
                    <p className="font-display text-3xl font-bold text-[hsl(var(--foreground))] mb-1">
                      {stats?.completedProjects ?? 0}
                    </p>
                    <p className="font-body text-sm text-[hsl(var(--muted-foreground))]">Completed</p>
                  </div>
                  <div className="absolute bottom-0 left-0 w-12 h-[2px] bg-emerald-500/50 group-hover:w-full transition-all duration-300" />
                </motion.div>

                {/* Processing Projects Card with ETA */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-sm p-5 group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/10 transition-colors" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-sm bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Processing</span>
                    </div>
                    <p className="font-display text-3xl font-bold text-[hsl(var(--foreground))] mb-1">
                      {stats?.processingProjects ?? 0}
                    </p>
                    <p className="font-body text-sm text-[hsl(var(--muted-foreground))]">
                      {stats?.processingEta?.remainingMinutes === 0
                        ? 'Almost done'
                        : `${stats?.processingEta?.remainingMinutes ?? 0}m remaining`
                      }
                    </p>
                    {stats?.processingProjects > 0 && stats?.processingEta?.progressPercentage > 0 && (
                      <div className="mt-3 w-full h-1.5 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.processingEta.progressPercentage}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-amber-400 to-[hsl(var(--gold))]"
                        />
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 w-12 h-[2px] bg-amber-500/50 group-hover:w-full transition-all duration-300" />
                </motion.div>

                {/* Recent Activity Card */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-sm p-5 group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-colors" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-sm bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Activity className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Last 24h</span>
                    </div>
                    <p className="font-display text-3xl font-bold text-[hsl(var(--foreground))] mb-1">
                      {stats?.recentActivity ?? 0}
                    </p>
                    <p className="font-body text-sm text-[hsl(var(--muted-foreground))]">Actions</p>
                  </div>
                  <div className="absolute bottom-0 left-0 w-12 h-[2px] bg-blue-500/50 group-hover:w-full transition-all duration-300" />
                </motion.div>
              </motion.div>

              {/* Projects Count */}
              {hasActiveFilters && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-[hsl(var(--muted-foreground))] mb-4"
                >
                  Showing {sortedProjects.length} of {projects.length} projects
                </motion.div>
              )}

              {/* Projects Grid/List with Activity Sidebar */}
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Projects Area */}
                <div className="flex-1">
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
                          {getEmptyStateMessage().title}
                        </h3>
                        <p className="font-body text-[hsl(var(--muted-foreground))] mb-6 max-w-sm mx-auto">
                          {getEmptyStateMessage().description}
                        </p>
                        {!hasActiveFilters && (
                          <Button
                            onClick={handleCreateProject}
                            className="bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold-light))] font-display font-semibold uppercase tracking-wider rounded-sm"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Upload Your First Photo
                          </Button>
                        )}
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
                        className={viewMode === 'grid'
                          ? "grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
                          : "flex flex-col gap-4"
                        }
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
                              className={viewMode === 'list' ? "w-full" : undefined}
                            >
                              <ProjectCard
                                project={project}
                                onDelete={handleDeleteProject}
                                isDeleting={deleteProjectMutation.isPending}
                                viewMode={viewMode}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Activity Timeline Sidebar */}
                <div className="lg:w-80 xl:w-96 flex-shrink-0">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
                    className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-sm p-5 sticky top-8"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-display text-lg font-semibold text-[hsl(var(--foreground))]">
                        Recent Activity
                      </h3>
                      <div className="w-8 h-8 rounded-sm bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Activity className="w-4 h-4 text-blue-400" />
                      </div>
                    </div>

                    <div className="border-t border-[hsl(var(--border))] pt-4">
                      {isLoadingActivities ? (
                        <div className="flex items-center justify-center py-8">
                          <LoadingSkeleton className="h-5 w-5 rounded-sm" />
                        </div>
                      ) : (
                        <ActivityTimeline activities={activities} maxItems={8} />
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ErrorBoundary>
  );
}
