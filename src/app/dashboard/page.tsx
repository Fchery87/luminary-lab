"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  Filter,
  X,
  Folder,
  CheckCircle2,
  Clock,
  Activity,
  Camera,
  Zap,
} from "lucide-react";

import { Header } from "@/components/ui/header";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ActivityTimeline, type ActivityItem } from "@/components/ui/activity-timeline";
import {
  IndustrialCard,
  AmberButton,
  Frame,
  SectionHeader,
  StatusBadge,
  MetricDisplay,
} from "@/components/ui/industrial-ui";
import { ProjectCard, type Project } from "./project-card";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch dashboard stats
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 30000,
  });

  // Fetch recent activity
  const { data: activities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/activity?limit=8", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json() as Promise<ActivityItem[]>;
    },
  });

  // Fetch projects
  const { data: projectsResponse, isLoading, error } = useQuery({
    queryKey: ["projects", searchQuery, filterStatus, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/projects?${params.toString()}`, { credentials: "include" });
      if (res.status === 401) {
        router.push("/login");
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json() as Promise<{ data: Project[]; meta: unknown }>;
    },
  });

  const projects = projectsResponse?.data ?? [];

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Project" }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      return res.json();
    },
    onSuccess: (newProject) => {
      toast.success("New project created");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      window.location.href = `/edit/${newProject.id}`;
    },
    onError: () => {
      toast.error("Failed to create project");
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete project");
      return projectId;
    },
    onSuccess: () => {
      toast.success("Project deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => {
      toast.error("Failed to delete project");
    },
  });

  // Sort projects client-side
  const sortedProjects = [...projects].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "status":
        comparison = (a.status || "").localeCompare(b.status || "");
        break;
      case "date":
      default:
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setDateRange("all");
  };

  const hasActiveFilters = searchQuery !== "" || filterStatus !== "all" || dateRange !== "all";

  const handleDeleteProject = (projectId: string) => {
    if (window.confirm(`Are you sure you want to delete this project?`)) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const handleCreateProject = () => {
    router.push("/upload?onboarding=true");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--charcoal))]">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-2 border-[hsl(var(--gold))] border-t-transparent rounded-full"
          />
          <span className="font-mono text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Loading Projects
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--charcoal))]">
        <IndustrialCard className="p-8 max-w-md text-center" accent>
          <div className="w-16 h-16 mx-auto mb-4 rounded-sm bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="font-display text-xl font-bold mb-3">
            Failed to Load Projects
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
            {error instanceof Error ? error.message : "An unexpected error occurred."}
          </p>
          <AmberButton
            variant="primary"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["projects"] })}
          >
            Retry
          </AmberButton>
        </IndustrialCard>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen flex-col bg-[hsl(var(--charcoal))]">
        <div className="film-grain" />
        <div className="scanlines" />

        <Header
          variant="minimal"
          navigation={
            <Link
              href="/pricing"
              className="font-mono text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors"
            >
              Upgrade
            </Link>
          }
          showUserMenu={true}
        />

        <main className="flex-1 container mx-auto px-4 py-6">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-[1px] bg-[hsl(var(--gold))]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
                  Workspace
                </span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold">
                My Projects
              </h1>
            </div>

            <AmberButton
              onClick={handleCreateProject}
              disabled={createProjectMutation.isPending}
              icon={<Plus className="w-4 h-4" />}
            >
              {createProjectMutation.isPending ? "Creating..." : "New Project"}
            </AmberButton>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
          >
            {[
              {
                icon: Folder,
                label: "Total",
                value: stats?.totalProjects ?? 0,
                color: "gold",
              },
              {
                icon: CheckCircle2,
                label: "Completed",
                value: stats?.completedProjects ?? 0,
                color: "emerald",
              },
              {
                icon: Clock,
                label: "Processing",
                value: stats?.processingProjects ?? 0,
                color: "amber",
                subtext: stats?.processingEta?.remainingMinutes > 0
                  ? `${stats.processingEta.remainingMinutes}m remaining`
                  : undefined,
              },
              {
                icon: Activity,
                label: "Last 24h",
                value: stats?.recentActivity ?? 0,
                color: "blue",
              },
            ].map((stat, index) => (
              <IndustrialCard
                key={stat.label}
                className="p-4"
                hover
              >
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-sm flex items-center justify-center",
                      stat.color === "gold" && "bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))]",
                      stat.color === "emerald" && "bg-emerald-500/10 text-emerald-400",
                      stat.color === "amber" && "bg-amber-500/10 text-amber-400",
                      stat.color === "blue" && "bg-blue-500/10 text-blue-400",
                    )}
                  >
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    {stat.label}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="font-display text-2xl font-bold">
                    {stat.value}
                  </div>
                  {stat.subtext && (
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      {stat.subtext}
                    </div>
                  )}
                </div>
              </IndustrialCard>
            ))}
          </motion.div>

          {/* Controls Section */}
          <IndustrialCard className="p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-sm text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--gold))] focus:outline-none transition-colors"
                />
              </div>

              {/* Status Filters */}
              <div className="flex gap-1 p-1 bg-[hsl(var(--secondary))] rounded-sm">
                {[
                  { id: "all", label: "All", count: projects.length },
                  { id: "completed", label: "Done", count: projects.filter((p) => p.status === "completed").length },
                  { id: "processing", label: "Active", count: projects.filter((p) => p.status === "processing").length },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setFilterStatus(filter.id)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-sm transition-all flex items-center gap-1.5",
                      filterStatus === filter.id
                        ? "bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))]"
                        : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    )}
                  >
                    {filter.label}
                    <span className="font-mono text-[10px] opacity-70">{filter.count}</span>
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="flex gap-1 p-1 bg-[hsl(var(--secondary))] rounded-sm">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "px-2 py-1.5 rounded-sm transition-colors",
                    viewMode === "grid"
                      ? "bg-[hsl(var(--card))] text-[hsl(var(--gold))]"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "px-2 py-1.5 rounded-sm transition-colors",
                    viewMode === "list"
                      ? "bg-[hsl(var(--card))] text-[hsl(var(--gold))]"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-3 py-2 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-sm text-xs focus:border-[hsl(var(--gold))] focus:outline-none"
                >
                  <option value="date">Date</option>
                  <option value="name">Name</option>
                  <option value="status">Status</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="p-2 rounded-sm border border-[hsl(var(--border))] hover:border-[hsl(var(--gold))] transition-colors"
                >
                  {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </button>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>
          </IndustrialCard>

          {/* Projects Count */}
          <div className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
            {hasActiveFilters
              ? `Showing ${sortedProjects.length} of ${projects.length} projects`
              : `${projects.length} projects`}
          </div>

          {/* Main Content */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Projects Grid/List */}
            <div className="flex-1">
              <AnimatePresence mode="wait">
                {sortedProjects.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-24 text-center"
                  >
                    <div className="w-20 h-20 mb-6 rounded-sm bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] flex items-center justify-center"
                    >
                      <ImageIcon className="w-10 h-10 text-[hsl(var(--muted-foreground))]" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-2">
                      {searchQuery ? "No matching projects" : "No projects yet"}
                    </h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-sm"
                    >
                      {searchQuery
                        ? `No projects found matching "${searchQuery}"`
                        : "Start by creating your first project. Upload RAW images and let our AI enhance them."}
                    </p>
                    {!searchQuery && (
                      <AmberButton onClick={handleCreateProject} icon={<Plus className="w-4 h-4" />}>
                        Upload Your First Photo
                      </AmberButton>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: { staggerChildren: 0.05 },
                      },
                    }}
                    className={cn(
                      viewMode === "grid"
                        ? "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
                        : "flex flex-col gap-3"
                    )}
                  >
                    {sortedProjects.map((project) => (
                      <motion.div
                        key={project.id}
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 },
                        }}
                      >
                        <ProjectCard
                          project={project}
                          onDelete={handleDeleteProject}
                          isDeleting={deleteProjectMutation.isPending}
                          viewMode={viewMode}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Activity Sidebar */}
            <div className="lg:w-80 flex-shrink-0">
              <IndustrialCard className="sticky top-6">
                <div className="p-4 border-b border-[hsl(var(--border))]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[hsl(var(--gold))]" />
                      <span className="font-display font-semibold text-sm">Recent Activity</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  {isLoadingActivities ? (
                    <div className="flex items-center justify-center py-8">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-6 h-6 border-2 border-[hsl(var(--gold))] border-t-transparent rounded-full"
                      />
                    </div>
                  ) : (
                    <ActivityTimeline activities={activities} maxItems={8} />
                  )}
                </div>
              </IndustrialCard>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
