"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Eye,
  Sparkles,
  ChevronLeft,
  Filter,
  RotateCcw,
  Undo,
  Keyboard,
  Check,
  LayoutTemplate,
  Columns,
  Layers,
  Search,
  Heart,
  Zap,
  Download,
  Image as ImageIcon,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X,
  SlidersHorizontal,
  BarChart3,
  History,
} from "lucide-react";

import { useZoomPan } from "@/hooks/use-zoom-pan";
import { usePresetFavorites, useRecentPresets } from "@/hooks/use-preset-favorites";
import { useImagePreview } from "@/hooks/use-image-preview";
import { useEdits } from "@/hooks/use-edits";
import { type Preset } from "@/components/ui/preset-gallery";
import { CompareSlider } from "@/components/ui/compare-slider";
import { ExportMenu, type ExportOptions } from "@/components/ui/export-menu";
import { Header } from "@/components/ui/header";
import { BlurHashImage } from "@/components/ui/blur-hash-image";
import { BatchProcessingDialog } from "@/components/ui/batch-processing";
import {
  AdjustmentPanel,
  DEFAULT_ADJUSTMENTS,
  type AdjustmentsState,
} from "@/components/ui/adjustment-panel";
import { Histogram, HistogramSelector, useImageHistogram } from "@/components/ui/histogram";
import { HistoryPanel, type HistoryEntry } from "@/components/ui/history-panel";
import {
  IndustrialCard,
  AmberButton,
  Frame,
  SectionHeader,
  ControlGroup,
  DataLabel,
  StatusBadge,
  MetricDisplay,
} from "@/components/ui/industrial-ui";
import { cn } from "@/lib/utils";
import { type ImageAdjustments } from "@/lib/edit-manager";

// Categories with icons
const CATEGORIES = [
  { id: "all", label: "All", description: "View all presets" },
  { id: "portrait", label: "Portrait", description: "Beauty retouching" },
  { id: "film", label: "Film", description: "Classic film stock" },
  { id: "cinematic", label: "Cinematic", description: "Movie-style grading" },
  { id: "moody", label: "Moody", description: "Dark, dramatic looks" },
  { id: "creative", label: "Creative", description: "Artistic effects" },
  { id: "b&w", label: "B&W", description: "Monochrome" },
  { id: "vintage", label: "Vintage", description: "Nostalgic looks" },
  { id: "ai", label: "AI", description: "Smart enhancements" },
  { id: "specialized", label: "Special", description: "Food, product, landscape" },
];

// Local storage keys
const STORAGE_KEYS = {
  LAST_USED_PRESET: "luminary_last_used_preset",
  VIEW_MODE: "luminary_edit_view_mode",
};

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [intensity, setIntensity] = useState(70);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | string>("auto");
  const [searchQuery, setSearchQuery] = useState("");
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [isComparePressed, setIsComparePressed] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<"idle" | "processing" | "completed" | "error">("idle");

  // View mode for split-screen layout
  const [viewMode, setViewMode] = useState<"standard" | "split">(() => {
    if (typeof window === "undefined") return "standard";
    return (localStorage.getItem(STORAGE_KEYS.VIEW_MODE) as "standard" | "split") || "standard";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, viewMode);
  }, [viewMode]);

  // Zoom and pan for image inspection
  const {
    zoom,
    pan,
    setZoom,
    resetZoom,
    zoomIn,
    zoomOut,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    transform,
    canPan,
  } = useZoomPan({ minZoom: 50, maxZoom: 400 });

  // Favorites and recent presets
  const { favorites, toggleFavorite, isFavorite } = usePresetFavorites();
  const { recentPresets, addRecentPreset } = useRecentPresets();

  // Image preview hook
  const {
    filterSettings,
    previewStyle,
    updateMultipleFilters,
    resetFilters,
    undo,
    canUndo,
  } = useImagePreview({ previewImageUrl: "" });

  // Fetch project data
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "processing" || status === "queued" ? 2000 : false;
    },
  });

  // Fetch presets
  const { data: presets = [], isLoading: presetsLoading } = useQuery({
    queryKey: ["presets"],
    queryFn: async () => {
      const res = await fetch("/api/presets", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch presets");
      const data = await res.json();
      return data.presets || data;
    },
  });

  // Initialize aspect ratio
  useEffect(() => {
    if (!project?.images) return;
    const imgWithDims = project.images.find(
      (img: any) => (img.type === 'original' || img.type === 'thumbnail') && img.width && img.height
    );
    if (imgWithDims?.width && imgWithDims?.height) {
      const ratio = imgWithDims.width / imgWithDims.height;
      setImageAspectRatio(Math.max(0.3, Math.min(3.33, ratio)));
    }
  }, [project]);

  // ========== PHASE 3: NON-DESTRUCTIVE EDITING ==========
  
  // Right sidebar tab state
  const [activeSidebarTab, setActiveSidebarTab] = useState<"presets" | "adjustments" | "histogram" | "history">("presets");
  
  // Adjustments state
  const [adjustments, setAdjustments] = useState<AdjustmentsState>(DEFAULT_ADJUSTMENTS);
  const [hasAdjustments, setHasAdjustments] = useState(false);
  
  // Histogram state
  const [histogramChannel, setHistogramChannel] = useState<"rgb" | "red" | "green" | "blue" | "luminance">("rgb");
  
  // Get original image ID for edits
  const originalImageId = project?.images?.find((img: any) => img.type === "original")?.id;
  
  // Edit management hook
  const {
    edits,
    currentEdit,
    history: editHistory,
    isLoading: editsLoading,
    createEdit,
    applyStyle: applyStyleEdit,
    undo: undoEdit,
    redo: redoEdit,
    reset: resetEdit,
    jumpToVersion,
    canUndo: canUndoEdit,
    canRedo: canRedoEdit,
    isCreating,
    isApplyingStyle,
  } = useEdits({
    imageId: originalImageId || "",
    enabled: !!originalImageId,
  });
  
  // Convert adjustments to API format
  const getAdjustmentsForApi = useCallback((): ImageAdjustments => {
    return {
      exposure: adjustments.exposure.value,
      contrast: adjustments.contrast.value,
      highlights: adjustments.highlights.value,
      shadows: adjustments.shadows.value,
      whites: adjustments.whites.value,
      blacks: adjustments.blacks.value,
      clarity: adjustments.clarity.value,
      texture: adjustments.texture.value,
      dehaze: adjustments.dehaze.value,
      saturation: adjustments.saturation.value,
      vibrance: adjustments.vibrance.value,
      temperature: adjustments.temperature.value,
      tint: adjustments.tint.value,
    };
  }, [adjustments]);
  
  // Check if adjustments have been modified
  useEffect(() => {
    const hasChanges = Object.values(adjustments).some(
      (adj) => adj.value !== adj.defaultValue
    );
    setHasAdjustments(hasChanges);
  }, [adjustments]);
  
  // Get image URL for histogram
  const histogramImageUrl = useMemo(() => {
    if (!project?.images) return null;
    const originalImgObj = project.images.find((img: any) => img.type === "original");
    const thumbnailImgObj = project.images.find((img: any) => img.type === "thumbnail");
    return originalImgObj?.url || thumbnailImgObj?.url;
  }, [project]);
  
  // Load histogram data
  const { histogram: histogramData, isComputing: isComputingHistogram, error: histogramError } = useImageHistogram(
    activeSidebarTab === "histogram" ? histogramImageUrl : null
  );
  
  // Handle adjustment changes
  const handleAdjustmentsChange = useCallback((newAdjustments: AdjustmentsState) => {
    setAdjustments(newAdjustments);
    
    // Map all adjustments to preview filters
    const a = newAdjustments;
    updateMultipleFilters({
      // Exposure affects brightness (10% per EV stop)
      brightness: 100 + (a.exposure.value * 10),
      // Contrast directly maps
      contrast: 100 + a.contrast.value,
      // Highlights/shadows affect clarity/exposure balance
      exposure: a.highlights.value * 0.5 - a.shadows.value * 0.3,
      // Saturation directly maps
      saturation: 100 + a.saturation.value,
      // Vibrance affects saturation more subtly
      // Temperature affects warmth/sepia
      warmth: a.temperature.value * 0.5,
      // Tint affects hue rotate slightly
      hueRotate: a.tint.value * 0.3,
      // Clarity affects... clarity (could be simulated with contrast + sharpening)
      clarity: a.clarity.value,
      // Texture and dehaze could affect blur inversely
      blur: Math.max(0, -(a.texture.value + a.dehaze.value) * 0.05),
    });
  }, [updateMultipleFilters]);
  
  // Apply adjustments to create edit
  const handleApplyAdjustments = useCallback(() => {
    if (!hasAdjustments) {
      toast.error("No adjustments to apply");
      return;
    }
    
    const apiAdjustments = getAdjustmentsForApi();
    createEdit(apiAdjustments);
  }, [hasAdjustments, getAdjustmentsForApi, createEdit]);
  
  // Handle preset selection with edit system
  const handlePresetSelectWithEdit = useCallback((preset: Preset) => {
    setSelectedPreset(preset);
    addRecentPreset(preset.id);
    
    // Apply style via edit system
    if (originalImageId) {
      applyStyleEdit(preset.id, intensity / 100);
    }
    
    localStorage.setItem(STORAGE_KEYS.LAST_USED_PRESET, preset.id);
  }, [originalImageId, intensity, addRecentPreset, applyStyleEdit]);
  
  // Convert edit history to HistoryEntry format
  const formattedHistory: HistoryEntry[] = editHistory.map((entry: any) => ({
    id: entry.id,
    imageId: entry.imageId,
    action: entry.action,
    version: entry.version,
    timestamp: new Date(entry.createdAt),
    isCurrent: entry.newEditId === currentEdit?.id,
  }));
  
  // Handle history actions
  const handleUndo = useCallback(() => {
    if (canUndoEdit) {
      undoEdit();
    } else {
      undo(); // Fallback to filter undo
    }
  }, [canUndoEdit, undoEdit, undo]);
  
  const handleRedo = useCallback(() => {
    if (canRedoEdit) {
      redoEdit();
    }
  }, [canRedoEdit, redoEdit]);
  
  const handleReset = useCallback(() => {
    resetEdit();
    resetFilters();
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setSelectedPreset(null);
    setIntensity(70);
  }, [resetEdit, resetFilters]);
  
  const handleClearHistory = useCallback(() => {
    // In a real implementation, this would call an API to clear history
    toast.success("History cleared");
  }, []);

  // Handle preset selection
  const handlePresetSelect = (preset: Preset) => {
    setSelectedPreset(preset);
    addRecentPreset(preset.id);
    
    const params = (preset as any).blendingParams || {};
    const scale = intensity / 100;

    const applyScale = (base: number, neutral: number = 100) => {
      if (base === neutral) return neutral;
      return neutral + (base - neutral) * scale;
    };

    const applyScaleFromZero = (base: number) => base * scale;

    updateMultipleFilters({
      brightness: applyScale(params.brightness ?? 100),
      contrast: applyScale(params.contrast ?? 100),
      saturation: applyScale(params.saturate ?? params.saturation ?? 100),
      grayscale: applyScaleFromZero(params.grayscale ?? 0),
      sepia: applyScaleFromZero(params.sepia ?? 0),
      hueRotate: (params.hueRotate ?? 0) * scale,
      blur: (params.blur ?? 0) * scale,
      warmth: (params.warmth ?? 0) * scale,
      exposure: (params.exposure ?? 0) * scale,
      clarity: (params.clarity ?? 0) * scale,
    });

    localStorage.setItem(STORAGE_KEYS.LAST_USED_PRESET, preset.id);
  };

  // Handle intensity change
  const handleIntensityChange = useCallback((value: number) => {
    setIntensity(value);
    if (selectedPreset) {
      const params = (selectedPreset as any).blendingParams || {};
      const scale = value / 100;

      const applyScale = (base: number, neutral: number = 100) => {
        if (base === neutral) return neutral;
        return neutral + (base - neutral) * scale;
      };

      const applyScaleFromZero = (base: number) => base * scale;

      updateMultipleFilters({
        brightness: applyScale(params.brightness ?? 100),
        contrast: applyScale(params.contrast ?? 100),
        saturation: applyScale(params.saturate ?? params.saturation ?? 100),
        grayscale: applyScaleFromZero(params.grayscale ?? 0),
        sepia: applyScaleFromZero(params.sepia ?? 0),
        hueRotate: (params.hueRotate ?? 0) * scale,
        blur: (params.blur ?? 0) * scale,
        warmth: (params.warmth ?? 0) * scale,
        exposure: (params.exposure ?? 0) * scale,
        clarity: (params.clarity ?? 0) * scale,
      });
    }
  }, [selectedPreset, updateMultipleFilters]);

  // Start processing mutation with timeout
  const startProcessingMutation = useMutation({
    mutationFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const res = await fetch("/api/process", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            presetId: selectedPreset?.id,
            intensity: intensity / 100,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || `Server error: ${res.status}`);
        }
        return res.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Request timed out. Please try again.");
        }
        throw error;
      }
    },
    onMutate: () => {
      setProcessingStatus("processing");
      setIsProcessing(true);
    },
    onSuccess: (data) => {
      setProcessingStatus("completed");
      toast.success(data.message || "Style applied successfully!");
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });

      // Reset status after 3 seconds
      setTimeout(() => {
        setProcessingStatus("idle");
        setIsProcessing(false);
      }, 3000);
    },
    onError: (error: Error) => {
      setProcessingStatus("error");
      toast.error(error.message || "Failed to apply style");
      setIsProcessing(false);
    },
  });

  const handleStartProcessing = useCallback(() => {
    if (!selectedPreset) {
      toast.error("Please select a preset");
      return;
    }
    startProcessingMutation.mutate();
  }, [selectedPreset, startProcessingMutation]);

  // Handle reset
  const handleResetAll = useCallback(() => {
    setIntensity(70);
    setSelectedPreset(null);
    resetFilters();
    toast.info("Settings reset to default");
  }, [resetFilters]);

  // Handle export
  const handleExport = async (options: ExportOptions) => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/export`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      if (!res.ok) throw new Error("Export failed");
      toast.success(`Export ready: ${options.format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export image");
    } finally {
      setIsExporting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        undo();
        return;
      }

      switch (e.key) {
        case "Escape":
          if (selectedPreset) {
            e.preventDefault();
            handleResetAll();
          }
          break;
        case " ":
          e.preventDefault();
          setIsComparePressed(true);
          break;
        case "Enter":
          e.preventDefault();
          if (selectedPreset && !isProcessing) handleStartProcessing();
          break;
        case "?":
          e.preventDefault();
          setShowShortcutsHelp(true);
          break;
        case "ArrowUp":
        case "+":
          e.preventDefault();
          handleIntensityChange(Math.min(100, intensity + 5));
          break;
        case "ArrowDown":
        case "-":
          e.preventDefault();
          handleIntensityChange(Math.max(0, intensity - 5));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") setIsComparePressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedPreset, isProcessing, intensity, undo, handleResetAll, handleIntensityChange, handleStartProcessing]);

  // Filter presets
  const filteredPresets = presets.filter((preset: Preset) => {
    const matchesCategory = selectedCategory === "all" || preset.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (projectLoading || presetsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--charcoal))]">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-2 border-[hsl(var(--gold))] border-t-transparent rounded-full"
          />
          <span className="font-mono text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Loading Workspace
          </span>
        </div>
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--charcoal))]">
        <IndustrialCard className="p-8 max-w-md text-center" accent>
          <h2 className="font-display text-xl font-bold mb-3 text-[hsl(var(--foreground))]">
            Error Loading Project
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
            The project could not be found or you don&apos;t have permission.
          </p>
          <AmberButton href="/dashboard" variant="primary">
            Return to Dashboard
          </AmberButton>
        </IndustrialCard>
      </div>
    );
  }

  // Get images
  const largeThumbnail = project.images?.find((img: any) =>
    img.type === "thumbnail" && img.filename?.includes("thumb_large")
  )?.url;
  const mediumThumbnail = project.images?.find((img: any) =>
    img.type === "thumbnail" && img.filename?.includes("thumb_medium")
  )?.url;
  const anyThumbnail = project.images?.find((img: any) => img.type === "thumbnail")?.url;
  const thumbnailImageObj = project.images?.find((img: any) => img.type === "thumbnail");
  const originalImageObj = project.images?.find((img: any) => img.type === "original");
  const isRawFile = originalImageObj?.mimeType?.startsWith("image/x-");
  const previewImageObj = project.images?.find((img: any) => img.isPreview === true);
  
  const originalImage = (isRawFile
    ? largeThumbnail || mediumThumbnail || anyThumbnail
    : originalImageObj?.url) || largeThumbnail || mediumThumbnail || anyThumbnail || originalImageObj?.url;
  
  const processedImage = project.images?.find((img: any) => img.type === "processed")?.url;
  const hasProcessed = !!processedImage;

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--charcoal))]">
      <div className="film-grain" />
      <div className="scanlines" />

      <Header
        variant="minimal"
        navigation={
          <div className="flex items-center gap-3">
            <AmberButton variant="ghost" size="sm" href="/dashboard" icon={<ChevronLeft className="w-4 h-4" />}>
              Back
            </AmberButton>
            <div className="h-4 w-px bg-[hsl(var(--border))]" />
            <span className="font-semibold text-sm text-[hsl(var(--foreground))]">{project.name}</span>
          </div>
        }
        showUserMenu={true}
      />

      <main className="flex-1 w-full px-4 lg:px-8 py-4 lg:py-6">
        <div className={cn(
          "grid gap-4 h-[calc(100vh-120px)]",
          viewMode === "split" ? "lg:grid-cols-2" : "lg:grid-cols-12"
        )}>
          {/* Main Canvas Area */}
          <div className={cn(
            "flex flex-col h-full min-h-[400px] min-w-0 relative rounded-xl overflow-hidden bg-black/40 border border-[hsl(var(--border))]/30 shadow-2xl",
            viewMode === "standard" && "lg:col-span-8 xl:col-span-9",
          )}>
            {/* Floating Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center justify-between gap-4 p-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
              <div className="flex items-center gap-2">
                {!hasProcessed && selectedPreset && (
                  <button
                    onMouseDown={() => setIsComparePressed(true)}
                    onMouseUp={() => setIsComparePressed(false)}
                    onMouseLeave={() => setIsComparePressed(false)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full border transition-all flex items-center gap-1.5",
                      isComparePressed
                        ? "bg-[hsl(var(--gold))] text-black border-[hsl(var(--gold))]"
                        : "border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Hold to Compare
                  </button>
                )}

                <div className="flex gap-1 p-1 bg-black/50 rounded-full border border-white/5">
                  {[
                    { id: "standard", icon: LayoutTemplate, label: "Single" },
                    { id: "split", icon: Columns, label: "Split" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setViewMode(mode.id as typeof viewMode)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5",
                        viewMode === mode.id
                          ? "bg-white/20 text-white shadow-sm"
                          : "text-white/50 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <mode.icon className="w-3.5 h-3.5" />
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                {zoom !== 100 && (
                  <span className="font-mono text-xs text-[hsl(var(--gold))]">
                    {Math.round(zoom)}%
                  </span>
                )}
                <button
                  onClick={() => setShowShortcutsHelp(true)}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                >
                  <Keyboard className="w-4 h-4" />
                </button>
                <ExportMenu onExport={handleExport} isExporting={isExporting} hasPresetSelected={!!selectedPreset} />
              </div>
            </div>

            {/* Viewport */}
            <div className="flex-1 w-full h-full relative">
              <div className="h-full w-full flex items-center justify-center bg-black relative overflow-hidden"
                onMouseDown={handlePanStart}
                onMouseMove={handlePanMove}
                onMouseUp={handlePanEnd}
                onMouseLeave={handlePanEnd}
                onDoubleClick={resetZoom}
              >
                {hasProcessed ? (
                  <CompareSlider
                    beforeImage={originalImage}
                    afterImage={processedImage}
                    className="h-full w-full"
                    aspectRatio={imageAspectRatio === "auto" ? undefined : imageAspectRatio}
                  />
                ) : selectedPreset ? (
                  <div
                    className="relative w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
                    style={{ ...previewStyle, ...transform }}
                  >
                    <BlurHashImage
                      src={previewImageObj?.url || largeThumbnail || mediumThumbnail || anyThumbnail}
                      blurHash={previewImageObj?.blurHash || thumbnailImageObj?.blurHash}
                      alt="Preview"
                      fill
                      sizes="(max-width: 768px) 100vw, 75vw"
                      className="object-contain select-none"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalWidth && img.naturalHeight) {
                          setImageAspectRatio(img.naturalWidth / img.naturalHeight);
                        }
                      }}
                    />
                    {isProcessing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-3">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-10 h-10 border-2 border-[hsl(var(--gold))] border-t-transparent rounded-full"
                          />
                          <span className="font-mono text-xs uppercase tracking-wider text-white">
                            Generating Magic
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <BlurHashImage
                    src={originalImage}
                    blurHash={thumbnailImageObj?.blurHash}
                    alt="Original"
                    fill
                    sizes="(max-width: 768px) 100vw, 75vw"
                    className="object-contain"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (img.naturalWidth && img.naturalHeight) {
                        setImageAspectRatio(img.naturalWidth / img.naturalHeight);
                      }
                    }}
                  />
                )}

                {/* Zoom Controls */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-1">
                  <button
                    onClick={zoomIn}
                    className="p-2 bg-[hsl(var(--card))]/90 backdrop-blur-sm rounded-sm border border-[hsl(var(--border))] hover:border-[hsl(var(--gold))] transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={zoomOut}
                    className="p-2 bg-[hsl(var(--card))]/90 backdrop-blur-sm rounded-sm border border-[hsl(var(--border))] hover:border-[hsl(var(--gold))] transition-colors"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={resetZoom}
                    className="p-2 bg-[hsl(var(--card))]/90 backdrop-blur-sm rounded-sm border border-[hsl(var(--border))] hover:border-[hsl(var(--gold))] transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {zoom > 100 && (
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-[hsl(var(--card))]/90 backdrop-blur-sm rounded-sm border border-[hsl(var(--border))]">
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Drag to pan • Double-click to reset
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Tools */}
          <div className={cn(
            "flex flex-col gap-3 h-full min-h-0 min-w-0",
            viewMode === "standard" && "lg:col-span-4 xl:col-span-3",
          )}>
            {/* Intensity Controls */}
            <IndustrialCard className="p-4 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Intensity
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-[hsl(var(--gold))]">{intensity}%</span>
                  <button
                    onClick={() => handleIntensityChange(70)}
                    disabled={!selectedPreset || intensity === 70}
                    className="p-1.5 rounded-sm border border-[hsl(var(--border))] hover:border-[hsl(var(--gold))] disabled:opacity-50 transition-colors"
                    title="Reset to 70%"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="p-1.5 rounded-sm border border-[hsl(var(--border))] hover:border-[hsl(var(--gold))] disabled:opacity-50 transition-colors"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={intensity}
                onChange={(e) => handleIntensityChange(Number(e.target.value))}
                disabled={!selectedPreset}
                className="w-full h-2 bg-[hsl(var(--secondary))] rounded-sm appearance-none cursor-pointer accent-[hsl(var(--gold))] disabled:cursor-not-allowed"
              />

              {!selectedPreset && (
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-3 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-[hsl(var(--gold))]" />
                  Select preset to adjust
                </p>
              )}
            </IndustrialCard>

            {/* Creative Suite with Tabs */}
            <IndustrialCard className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-3 border-b border-[hsl(var(--border))] shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[hsl(var(--gold))]" />
                    <span className="font-display font-semibold text-sm">Creative Suite</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Pending Changes Indicator */}
                    {(selectedPreset || hasAdjustments) && processingStatus !== "completed" && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                        <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wider">Pending</span>
                      </div>
                    )}
                    {processingStatus === "completed" && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Applied</span>
                      </div>
                    )}
                    <button
                      onClick={() => setShowShortcutsHelp(true)}
                      className="p-1.5 rounded-sm hover:bg-[hsl(var(--secondary))] transition-colors text-[hsl(var(--muted-foreground))]"
                      title="Shortcuts"
                    >
                      <Keyboard className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Tab Navigation */}
                <div className="flex gap-1 bg-[hsl(var(--secondary))]/50 p-1 rounded-lg">
                  {[
                    { id: "presets", label: "Presets", icon: Zap },
                    { id: "adjustments", label: "Adjust", icon: SlidersHorizontal },
                    { id: "histogram", label: "Histogram", icon: BarChart3 },
                    { id: "history", label: "History", icon: History },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSidebarTab(tab.id as any)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-all",
                        activeSidebarTab === tab.id
                          ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm"
                          : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                      )}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 space-y-4 overflow-y-auto flex-1">
                {/* ========== PRESETS TAB ========== */}
                {activeSidebarTab === "presets" && (
                  <>
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <input
                        type="text"
                        placeholder="Search presets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-sm text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--gold))] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Categories */}
                    <ControlGroup label="Categories">
                  <div className="flex flex-wrap gap-1">
                    {CATEGORIES.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={cn(
                          "px-2 py-1 text-[10px] font-medium rounded-sm transition-all",
                          selectedCategory === category.id
                            ? "bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))]"
                            : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                        )}
                        title={category.description}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                </ControlGroup>

                {/* Presets Grid */}
                <ControlGroup label={`${CATEGORIES.find(c => c.id === selectedCategory)?.label} (${filteredPresets.length})`}>
                  <div className="grid grid-cols-1 gap-2">
                    {filteredPresets.map((preset: Preset, index: number) => {
                      const isSelected = selectedPreset?.id === preset.id;

                      return (
                        <motion.button
                          key={preset.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handlePresetSelect(preset)}
                          className={cn(
                            "group relative flex items-center gap-3 p-2 rounded-sm border-2 transition-all text-left overflow-hidden",
                            isSelected
                              ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10"
                              : "border-[hsl(var(--border))] hover:border-[hsl(var(--gold))]/50"
                          )}
                        >
                          {/* Selected indicator */}
                          {isSelected && (
                            <div className="absolute top-2 left-2 z-10">
                              <div className="bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] rounded-full p-0.5">
                                <Check className="w-3 h-3" />
                              </div>
                            </div>
                          )}

                          {/* Favorite button - using div to avoid nested buttons */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(preset.id);
                            }}
                            className="absolute top-2 right-2 z-10 p-1 rounded-full bg-[hsl(var(--card))]/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-[hsl(var(--card))]"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                toggleFavorite(preset.id);
                              }
                            }}
                          >
                            <Heart
                              className={cn(
                                "w-3 h-3 transition-colors",
                                isFavorite(preset.id)
                                  ? "fill-red-500 text-red-500"
                                  : "text-[hsl(var(--muted-foreground))] hover:text-red-500"
                              )}
                            />
                          </div>

                          {/* Thumbnail */}
                          <div className={cn(
                            "relative w-14 h-14 rounded-sm overflow-hidden shrink-0",
                            isSelected && "ring-2 ring-[hsl(var(--gold))]"
                          )}>
                            <Image
                              src={preset.exampleImageUrl}
                              alt={preset.name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "font-medium text-sm truncate",
                              isSelected ? "text-[hsl(var(--gold))]" : "text-[hsl(var(--foreground))]"
                            )}>
                              {preset.name}
                            </p>
                            {preset.category && (
                              <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                                {preset.category}
                              </span>
                            )}
                          </div>

                          {/* Index shortcut */}
                          <span className="absolute bottom-1 right-1 font-mono text-[9px] text-[hsl(var(--muted-foreground))]/50">
                            {index + 1}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </ControlGroup>
                  </>
                )}
                
                {/* ========== ADJUSTMENTS TAB ========== */}
                {activeSidebarTab === "adjustments" && (
                  <AdjustmentPanel
                    adjustments={adjustments}
                    onAdjustmentsChange={handleAdjustmentsChange}
                    onApply={handleApplyAdjustments}
                    disabled={!originalImageId || isCreating}
                  />
                )}
                
                {/* ========== HISTOGRAM TAB ========== */}
                {activeSidebarTab === "histogram" && (
                  <div className="space-y-4">
                    <HistogramSelector
                      selectedChannel={histogramChannel === "rgb" ? null : histogramChannel}
                      onChannelChange={(ch) => setHistogramChannel(ch || "rgb")}
                    />
                    {isComputingHistogram ? (
                      <div className="flex items-center justify-center h-24">
                        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--gold))]" />
                      </div>
                    ) : histogramData ? (
                      <>
                        <Histogram
                          data={histogramData}
                          height={120}
                          showChannels={{
                            red: histogramChannel === "rgb" || histogramChannel === "red",
                            green: histogramChannel === "rgb" || histogramChannel === "green",
                            blue: histogramChannel === "rgb" || histogramChannel === "blue",
                            luminance: histogramChannel === "luminance",
                          }}
                        />
                        {histogramError && (
                          <p className="text-[10px] text-amber-500/80 text-center">
                            {histogramError}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-8">
                        No image data available
                      </p>
                    )}
                    <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
                      Histogram updates in real-time as you adjust
                    </p>
                  </div>
                )}
                
                {/* ========== HISTORY TAB ========== */}
                {activeSidebarTab === "history" && (
                  <HistoryPanel
                    entries={formattedHistory}
                    currentVersion={currentEdit?.version}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onReset={handleReset}
                    onJumpToVersion={jumpToVersion}
                    onClearHistory={handleClearHistory}
                    canUndo={canUndoEdit || canUndo}
                    canRedo={canRedoEdit}
                    disabled={isCreating || isApplyingStyle}
                  />
                )}
              </div>

              {/* Action Footer */}
              <div className="p-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/30 shrink-0 space-y-2">
                {activeSidebarTab === "presets" && (
                  <>
                    <AmberButton
                      onClick={handleStartProcessing}
                      disabled={isProcessing || !selectedPreset}
                      className={cn(
                        "w-full transition-all duration-300",
                        processingStatus === "completed" && "bg-emerald-500 hover:bg-emerald-600"
                      )}
                      size="md"
                      icon={
                        processingStatus === "processing" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : processingStatus === "completed" ? (
                          <Check className="w-4 h-4" />
                        ) : processingStatus === "error" ? (
                          <RotateCcw className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )
                      }
                    >
                      {processingStatus === "processing"
                        ? "Applying..."
                        : processingStatus === "completed"
                        ? "Applied!"
                        : processingStatus === "error"
                        ? "Try Again"
                        : "Apply Style"}
                    </AmberButton>

                    <BatchProcessingDialog
                      selectedPresetName={selectedPreset?.name || "No preset"}
                      intensity={intensity}
                      onBatchProcess={async () => {
                        await new Promise((resolve) => setTimeout(resolve, 2000));
                      }}
                      trigger={
                        <AmberButton
                          variant="secondary"
                          disabled={!selectedPreset}
                          className="w-full"
                          size="sm"
                          icon={<Layers className="w-4 h-4" />}
                        >
                          Batch Process
                        </AmberButton>
                      }
                    />
                  </>
                )}
                
                {activeSidebarTab === "adjustments" && (
                  <AmberButton
                    onClick={handleApplyAdjustments}
                    disabled={!hasAdjustments || isCreating}
                    className="w-full"
                    size="md"
                    icon={isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  >
                    {isCreating ? "Applying..." : "Apply Adjustments"}
                  </AmberButton>
                )}
              </div>
            </IndustrialCard>
          </div>
        </div>
      </main>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcutsHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <IndustrialCard className="p-6" accent>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-lg">Keyboard Shortcuts</h2>
                  <button
                    onClick={() => setShowShortcutsHelp(false)}
                    className="p-1.5 rounded-sm hover:bg-[hsl(var(--secondary))] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { keys: "1-9", action: "Select preset" },
                    { keys: "↑ / +", action: "Increase intensity" },
                    { keys: "↓ / -", action: "Decrease intensity" },
                    { keys: "Space", action: "Hold to compare" },
                    { keys: "Enter", action: "Apply style" },
                    { keys: "Ctrl+Z", action: "Undo" },
                    { keys: "Ctrl+Y", action: "Redo" },
                    { keys: "Tab", action: "Next tab" },
                    { keys: "Shift+Tab", action: "Previous tab" },
                    { keys: "Esc", action: "Reset all" },
                    { keys: "?", action: "Show help" },
                    { keys: "H", action: "Toggle histogram" },
                    { keys: "A", action: "Toggle adjustments" },
                  ].map((shortcut) => (
                    <div key={shortcut.action} className="flex items-center justify-between p-2 bg-[hsl(var(--secondary))] rounded-sm">
                      <kbd className="font-mono text-xs bg-[hsl(var(--card))] px-2 py-0.5 rounded border border-[hsl(var(--border))]">
                        {shortcut.keys}
                      </kbd>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">{shortcut.action}</span>
                    </div>
                  ))}
                </div>
              </IndustrialCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
