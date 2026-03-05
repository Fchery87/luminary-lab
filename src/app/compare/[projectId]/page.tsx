"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Download,
  ArrowLeft,
  Share2,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  X,
  LayoutTemplate,
  Columns,
  Eye,
  Image as ImageIcon,
  Settings2,
} from "lucide-react";

import { Header } from "@/components/ui/header";
import { SideBySideComparison } from "@/components/ui/side-by-side-comparison";
import { ExportPresets } from "@/components/ui/export-presets";
import { type ExportPreset } from "@/hooks/use-export-presets";
import {
  IndustrialCard,
  AmberButton,
  Frame,
  SectionHeader,
  ControlGroup,
  DataLabel,
  StatusBadge,
} from "@/components/ui/industrial-ui";
import { cn } from "@/lib/utils";

// Local storage key for view mode
const VIEW_MODE_STORAGE_KEY = "luminary_compare_view_mode";

interface ProjectData {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  images?: Array<{
    id: string;
    type: "original" | "processed" | "thumbnail";
    url: string;
    filename: string;
    mimeType: string;
  }>;
  styleName?: string;
  intensity?: number;
}

// Animated counter for metrics
function AnimatedValue({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) return;
    
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        setHasAnimated(true);
        clearInterval(timer);
      } else {
        setCount(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, hasAnimated]);

  return (
    <span ref={ref} className="font-mono text-[hsl(var(--gold))]">
      {count}{suffix}
    </span>
  );
}

export default function ComparePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const isOnboarding = searchParams.get("onboarding") === "true";

  const [zoomLevel, setZoomLevel] = useState(100);
  const [dividerPosition, setDividerPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showAhaMoment, setShowAhaMoment] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | string>("auto");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<"view" | "export">("view");

  // View mode for comparison layout with localStorage persistence
  const [viewMode, setViewModeState] = useState<"slider" | "side-by-side">(() => {
    if (typeof window === "undefined") return "slider";
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return (saved as "slider" | "side-by-side") || "slider";
  });

  const setViewMode = useCallback((mode: "slider" | "side-by-side") => {
    setViewModeState(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  }, []);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(async () => {
    const container = document.getElementById("comparison-wrapper");
    if (!document.fullscreenElement) {
      try {
        await container?.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        toast.error("Fullscreen not supported");
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error("Error exiting fullscreen:", err);
      }
    }
  }, []);

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Show "Aha" moment celebration on mount if onboarding
  useEffect(() => {
    if (isOnboarding) {
      const timer = setTimeout(() => {
        setShowAhaMoment(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnboarding]);

  // Fetch project data from API
  const {
    data: project,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Project not found");
        throw new Error("Failed to fetch project");
      }
      return res.json() as Promise<ProjectData>;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "processing" || status === "queued" ? 2000 : false;
    },
  });

  // Extract image URLs from project images array
  const largeThumbnail = project?.images?.find(
    (img: any) =>
      img.type === "thumbnail" && img.filename?.includes("thumb_large"),
  )?.url;
  const mediumThumbnail = project?.images?.find(
    (img: any) =>
      img.type === "thumbnail" && img.filename?.includes("thumb_medium"),
  )?.url;
  const anyThumbnail = project?.images?.find(
    (img: any) => img.type === "thumbnail",
  )?.url;
  const originalImageObj = project?.images?.find(
    (img: any) => img.type === "original",
  );
  const isRawFile = originalImageObj?.mimeType?.startsWith("image/x-");

  const originalImageUrl =
    (isRawFile
      ? largeThumbnail || mediumThumbnail || anyThumbnail
      : originalImageObj?.url) ||
    largeThumbnail ||
    mediumThumbnail ||
    anyThumbnail ||
    originalImageObj?.url;

  const processedImageUrl = project?.images?.find(
    (img: any) => img.type === "processed",
  )?.url;

  // Calculate aspect ratio from DB-stored image dimensions during render
  const calculatedAspectRatio = (() => {
    if (!project?.images) return null;
    const imgWithDims = (project.images as any[]).find(
      (img) => (img.type === 'original' || img.type === 'thumbnail') && img.width && img.height,
    );
    if (imgWithDims?.width && imgWithDims?.height) {
      const ratio = imgWithDims.width / imgWithDims.height;
      return Math.max(0.3, Math.min(3.33, ratio));
    }
    return null;
  })();

  // Sync calculated aspect ratio to state when project changes (deferred to avoid sync setState)
  useEffect(() => {
    if (calculatedAspectRatio !== null) {
      const timer = setTimeout(() => setImageAspectRatio(calculatedAspectRatio), 0);
      return () => clearTimeout(timer);
    }
  }, [calculatedAspectRatio]);

  // Mouse handlers for slider
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = (x / rect.width) * 100;
    setDividerPosition(Math.min(100, Math.max(0, position)));
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const rect = document.getElementById("comparison-container")?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const position = (x / rect.width) * 100;
      setDividerPosition(Math.min(100, Math.max(0, position)));
    };

    if (isDragging) {
      document.addEventListener("mouseup", handleGlobalMouseUp);
      document.addEventListener("mousemove", handleGlobalMouseMove);
    }

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, [isDragging]);

  const handleZoom = (direction: "in" | "out") => {
    setZoomLevel((prev) => 
      direction === "in" ? Math.min(200, prev + 25) : Math.max(50, prev - 25)
    );
  };

  const handleExport = async (format: "jpg" | "tiff" | "png") => {
    toast.success(`Exporting ${format.toUpperCase()} file...`);
    setTimeout(() => {
      toast.success("Export completed successfully!");
    }, 2000);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
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
            Loading Project
          </span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--charcoal))]">
        <IndustrialCard className="p-8 max-w-md text-center" accent>
          <h2 className="font-display text-xl font-bold mb-3 text-[hsl(var(--foreground))]">
            {error ? "Error Loading Project" : "Project Not Found"}
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
            {error instanceof Error
              ? error.message
              : "The project you're looking for doesn't exist or you don't have access."}
          </p>
          <AmberButton href="/dashboard" variant="primary">
            Back to Dashboard
          </AmberButton>
        </IndustrialCard>
      </div>
    );
  }

  const hasProcessedImage = !!processedImageUrl;
  const isProcessing = project.status === "processing" || project.status === "queued";

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--charcoal))]">
      <div className="film-grain" />
      <div className="scanlines" />

      <Header variant="minimal" showUserMenu={true} />

      <main className="flex-1 w-full px-4 lg:px-8 py-4 lg:py-6">
        {/* Project Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4">
              <AmberButton
                variant="ghost"
                size="sm"
                href="/dashboard"
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </AmberButton>
              <div className="h-4 w-px bg-[hsl(var(--border))]" />
              <div>
                <h1 className="font-display font-bold text-lg text-[hsl(var(--foreground))]">
                  {project.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  {project.styleName && (
                    <span className="text-xs text-[hsl(var(--gold))]">
                      {project.styleName}
                    </span>
                  )}
                  {project.intensity !== undefined && (
                    <>
                      <span className="text-[hsl(var(--border))]">•</span>
                      <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                        <AnimatedValue value={Math.round(project.intensity * 100)} suffix="%" /> intensity
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={isProcessing ? "processing" : hasProcessedImage ? "complete" : "idle"}>
                {isProcessing ? "Processing" : hasProcessedImage ? "Ready" : "Pending"}
              </StatusBadge>
              <AmberButton
                variant="secondary"
                size="sm"
                onClick={handleShare}
                icon={<Share2 className="w-3.5 h-3.5" />}
              >
                Share
              </AmberButton>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid gap-4 h-[calc(100vh-120px)] lg:grid-cols-12">
          {/* Left Column - Comparison Viewer */}
          <div className="flex flex-col h-full min-h-[400px] min-w-0 relative rounded-xl overflow-hidden bg-black/40 border border-[hsl(var(--border))]/30 shadow-2xl lg:col-span-8 xl:col-span-9">
            
            {/* Floating Toolbar */}
            {hasProcessedImage && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center justify-between gap-4 p-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 p-1 bg-black/50 rounded-full border border-white/5">
                    {[
                      { id: "slider", label: "Slider", icon: LayoutTemplate },
                      { id: "split", label: "Split", icon: Columns },
                      { id: "original", label: "Original", icon: ImageIcon },
                    ].map((mode) => {
                      const isActive = 
                        (mode.id === "original" && showOriginal) ||
                        (mode.id === "slider" && !showOriginal && viewMode === "slider") ||
                        (mode.id === "split" && !showOriginal && viewMode === "side-by-side");
                      
                      return (
                        <button
                          key={mode.id}
                          onClick={() => {
                            if (mode.id === "original") {
                              setShowOriginal(true);
                              setViewMode("slider");
                            } else if (mode.id === "slider") {
                              setShowOriginal(false);
                              setViewMode("slider");
                            } else {
                              setShowOriginal(false);
                              setViewMode("side-by-side");
                            }
                          }}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5",
                            isActive
                              ? "bg-white/20 text-white shadow-sm"
                              : "text-white/50 hover:text-white hover:bg-white/10"
                          )}
                        >
                          <mode.icon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-1 pl-4 border-l border-white/10">
                  <button
                    onClick={() => handleZoom("out")}
                    disabled={zoomLevel <= 50 || showOriginal}
                    className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-50 transition-colors text-white/70 hover:text-white"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-xs text-[hsl(var(--gold))] w-10 text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={() => handleZoom("in")}
                    disabled={zoomLevel >= 200 || showOriginal}
                    className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-50 transition-colors text-white/70 hover:text-white"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(100)}
                    disabled={zoomLevel === 100}
                    className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-50 transition-colors text-white/70 hover:text-white ml-1"
                    title="Reset Zoom"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Viewer Container */}
            <div id="comparison-wrapper" className="flex-1 w-full h-full relative overflow-hidden bg-black/40 backdrop-blur-3xl rounded-2xl border border-white/5 group">
              <div
                id="comparison-container"
                className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden"
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
              >
                {!hasProcessedImage ? (
                  // No processed image state
                  <div className="text-center p-8">
                    {isProcessing ? (
                      <div className="flex flex-col items-center gap-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-16 h-16 border-2 border-[hsl(var(--gold))] border-t-transparent rounded-full"
                        />
                        <div>
                          <p className="font-display font-semibold text-white mb-1">
                            Processing Image
                          </p>
                          <p className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                            Estimated time: 2-3 minutes
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-[hsl(var(--secondary))] flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                        </div>
                        <div>
                          <p className="font-display font-semibold text-white mb-1">
                            No Processed Image
                          </p>
                          <p className="font-mono text-xs text-[hsl(var(--muted-foreground))] mb-4">
                            Go to the editor to process your image
                          </p>
                          <AmberButton href={`/edit/${projectId}`} variant="primary" size="sm">
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                            Open Editor
                          </AmberButton>
                        </div>
                      </div>
                    )}
                  </div>
                ) : viewMode === "side-by-side" && !showOriginal ? (
                  // Side-by-Side View
                  <SideBySideComparison
                    originalImage={originalImageUrl!}
                    processedImage={processedImageUrl!}
                    originalLabel="Original"
                    processedLabel="Processed"
                    className="h-full w-full"
                  />
                ) : showOriginal ? (
                  // Original-only view
                  <div className="w-full h-full flex items-center justify-center">
                    <Image
                      src={originalImageUrl!}
                      alt="Original"
                      fill
                      sizes="(max-width: 768px) 100vw, 75vw"
                      className="object-contain"
                      style={{ transform: `scale(${zoomLevel / 100})` }}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalWidth && img.naturalHeight) {
                          const ratio = img.naturalWidth / img.naturalHeight;
                          setImageAspectRatio(Math.max(0.3, Math.min(3.33, ratio)));
                        }
                      }}
                    />
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-sm">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-white">
                        Original
                      </span>
                    </div>
                  </div>
                ) : (
                  // Slider Comparison View
                  <>
                    {/* Original Image (Left Side) */}
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ width: `${dividerPosition}%` }}
                    >
                      <Image
                        src={originalImageUrl!}
                        alt="Original"
                        fill
                        sizes="(max-width: 768px) 100vw, 75vw"
                        className="object-contain object-center"
                        style={{ transform: `scale(${zoomLevel / 100})` }}
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          if (img.naturalWidth && img.naturalHeight) {
                            const ratio = img.naturalWidth / img.naturalHeight;
                            setImageAspectRatio(Math.max(0.3, Math.min(3.33, ratio)));
                          }
                        }}
                      />
                    </div>

                    {/* Processed Image (Right Side) */}
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        left: `${dividerPosition}%`,
                        width: `${100 - dividerPosition}%`,
                      }}
                    >
                      <Image
                        src={processedImageUrl!}
                        alt="Processed"
                        fill
                        sizes="(max-width: 768px) 100vw, 75vw"
                        className="object-contain object-center"
                        style={{ transform: `scale(${zoomLevel / 100})` }}
                      />
                    </div>

                    {/* Divider Line */}
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize transition-opacity",
                        isDragging ? "opacity-100" : "opacity-70"
                      )}
                      style={{ left: `${dividerPosition}%` }}
                      onMouseDown={handleMouseDown}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <div className="flex gap-0.5">
                          <div className="w-0.5 h-3 bg-gray-600" />
                          <div className="w-0.5 h-3 bg-gray-600" />
                        </div>
                      </div>
                    </div>

                    {/* Labels */}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-sm">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-white">
                        Original
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 px-2 py-1 bg-[hsl(var(--gold))]/90 backdrop-blur-sm rounded-sm">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--charcoal))]">
                        Processed
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* "Aha" Moment Celebration */}
            <AnimatePresence>
              {showAhaMoment && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.4 }}
                >
                  <IndustrialCard className="border-[hsl(var(--gold))] bg-gradient-to-br from-[hsl(var(--gold))]/10 to-transparent" accent>
                    <div className="p-5 flex items-start gap-4">
                      <button
                        onClick={() => setShowAhaMoment(false)}
                        className="shrink-0 p-1.5 rounded-full hover:bg-[hsl(var(--gold))]/20 transition-colors text-[hsl(var(--muted-foreground))]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-[hsl(var(--gold))]" />
                          <h3 className="font-display font-bold text-[hsl(var(--gold))]">
                            Your First Aha Moment!
                          </h3>
                        </div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                          Drag the divider to compare the <strong className="text-[hsl(var(--foreground))]">Original</strong> and{" "}
                          <strong className="text-[hsl(var(--foreground))]">Processed</strong> images.
                        </p>
                        <div className="flex gap-2">
                          <AmberButton
                            variant="primary"
                            size="sm"
                            onClick={() => setShowAhaMoment(false)}
                          >
                            Got It
                          </AmberButton>
                          <AmberButton variant="secondary" size="sm" href="/dashboard">
                            Dashboard
                          </AmberButton>
                        </div>
                      </div>
                    </div>
                  </IndustrialCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column - Controls */}
          <div className="flex flex-col gap-3 h-full min-h-0 min-w-0 lg:col-span-4 xl:col-span-3">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-[hsl(var(--secondary))] rounded-sm">
              {[
                { id: "view", label: "View", icon: Eye },
                { id: "export", label: "Export", icon: Download },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium uppercase tracking-wider transition-all rounded-sm",
                    activeTab === tab.id
                      ? "bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))]"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "view" ? (
              <IndustrialCard className="p-4 flex-1 overflow-y-auto">
                <SectionHeader title="Project Details" className="mb-4" />
                <div className="space-y-4 text-sm text-[hsl(var(--muted-foreground))]">
                  <DataLabel label="ID" value={project.id} />
                  <DataLabel label="Status" value={project.status} />
                  <DataLabel label="Created" value={new Date(project.createdAt).toLocaleDateString()} />
                  {project.styleName && (
                    <DataLabel label="Style" value={project.styleName} />
                  )}
                  {project.intensity !== undefined && (
                    <DataLabel label="Intensity" value={`${project.intensity * 100}%`} />
                  )}
                </div>
              </IndustrialCard>
            ) : (
              <>
                {/* Export Controls */}
                <IndustrialCard className="p-4">
                  <SectionHeader title="Export Options" className="mb-4" />
                  <ExportPresets
                    onExport={(preset: ExportPreset) => {
                      toast.success(`Exporting with preset: ${preset.name}`);
                      setTimeout(() => {
                        toast.success("Export completed successfully!");
                      }, 2000);
                    }}
                  />
                </IndustrialCard>

                {/* Quick Export */}
                <IndustrialCard className="p-4">
                  <SectionHeader title="Quick Export" className="mb-4" />
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { format: "jpg", label: "JPEG", desc: "sRGB, 8-bit", quality: "Web" },
                      { format: "tiff", label: "TIFF", desc: "16-bit, ProPhoto", quality: "Print" },
                      { format: "png", label: "PNG", desc: "Lossless", quality: "Archive" },
                    ].map((item) => (
                      <button
                        key={item.format}
                        onClick={() => handleExport(item.format as "jpg" | "tiff" | "png")}
                        className="flex items-center gap-3 p-3 rounded-sm border border-[hsl(var(--border))] hover:border-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/5 transition-all text-left group"
                      >
                        <div className="w-10 h-10 rounded-sm bg-[hsl(var(--secondary))] flex items-center justify-center group-hover:bg-[hsl(var(--gold))]/10 transition-colors">
                          <Download className="w-5 h-5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--gold))]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{item.label}</span>
                            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                              {item.quality}
                            </span>
                          </div>
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">{item.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </IndustrialCard>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <AmberButton
                variant="secondary"
                href={`/edit/${projectId}`}
                className="flex-1"
                size="sm"
              >
                <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </AmberButton>
              <AmberButton
                variant="secondary"
                className="flex-1"
                size="sm"
                icon={<Save className="w-3.5 h-3.5" />}
              >
                Save
              </AmberButton>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
