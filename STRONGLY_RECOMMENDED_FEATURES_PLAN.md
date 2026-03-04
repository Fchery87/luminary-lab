# Luminary Lab - Strongly Recommended Features Implementation Plan

## Features to Implement (from UI_REVIEW.md)

### Status: NOT YET IMPLEMENTED
1. **Split-Screen Edit Mode** - Lightroom-style layout
2. **Batch Processing Controls** - Apply preset to multiple projects
3. **Zoom & Pan in Edit Mode** - Inspect details at high zoom
4. **Presets Search/Filter Enhancement** - Search, favorites, recently used
5. **Export Presets** - Save export settings
6. **Side-by-Side Comparison Mode** - View both images simultaneously

---

## Phase A: Enhanced Edit Experience

### A.1 Split-Screen Edit Mode (Week 10)

**Research:** Lightroom, Capture One use split view for efficient workflow

**Implementation:**
```typescript
// src/app/edit/[projectId]/page.tsx - New layout mode
const [viewMode, setViewMode] = useState<"standard" | "split">("standard");

// Split view layout
<div className={cn(
  "grid gap-6 h-full",
  viewMode === "split" ? "lg:grid-cols-2" : "lg:grid-cols-12"
)}>
  {/* Left: Image Canvas */}
  <div className={viewMode === "split" ? "" : "lg:col-span-9"}>
    <ImageViewer />
  </div>
  
  {/* Right: Preset Gallery */}
  <div className={viewMode === "split" ? "" : "lg:col-span-3"}>
    <PresetGallery />
  </div>
</div>
```

**Acceptance Criteria:**
- [ ] Toggle between standard and split view
- [ ] Split view shows image and presets side-by-side
- [ ] Responsive: split view only on lg+ screens
- [ ] Persists in localStorage

---

### A.2 Zoom & Pan in Edit Mode (Week 10)

**Research:** Professional editors allow detailed inspection of filter effects

**Implementation:**
```typescript
// src/hooks/use-zoom-pan.ts
export function useZoomPan() {
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom(z => Math.max(50, Math.min(400, z + delta)));
    }
  }, []);

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (zoom > 100) {
      setIsPanning(true);
    }
  }, [zoom]);

  return { zoom, pan, setZoom, resetZoom: () => setZoom(100) };
}

// Usage in Edit Page
<div className="relative overflow-hidden">
  <Image
    style={{
      transform: `scale(${zoom/100}) translate(${pan.x}px, ${pan.y}px)`,
      transformOrigin: 'center center',
      cursor: zoom > 100 ? (isPanning ? 'grabbing' : 'grab') : 'default'
    }}
  />
  
  {/* Zoom Controls */}
  <div className="absolute bottom-4 right-4 flex gap-2">
    <Button onClick={() => setZoom(z => Math.max(50, z - 25))}>-</Button>
    <span>{zoom}%</span>
    <Button onClick={() => setZoom(z => Math.min(400, z + 25))}>+</Button>
    <Button onClick={resetZoom}>Reset</Button>
  </div>
</div>
```

**Acceptance Criteria:**
- [ ] Zoom with Ctrl/Cmd + scroll
- [ ] Pan when zoomed > 100%
- [ ] Zoom controls UI (50% - 400%)
- [ ] Double-click to reset

---

## Phase B: Enhanced Preset Management

### B.1 Presets Search & Filter Enhancement (Week 11)

**Research:** Users need to find presets quickly in large libraries

**Implementation:**
```typescript
// src/components/ui/preset-search.tsx
export function PresetSearch({
  presets,
  onSelect,
  recentPresets = [],
  favoritePresets = [],
}: PresetSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "favorites" | "recent">("all");

  const filteredPresets = useMemo(() => {
    let filtered = presets;
    
    if (activeFilter === "favorites") {
      filtered = presets.filter(p => favoritePresets.includes(p.id));
    } else if (activeFilter === "recent") {
      filtered = recentPresets.map(id => presets.find(p => p.id === id)).filter(Boolean);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [presets, searchQuery, activeFilter, recentPresets, favoritePresets]);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search presets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("all")}
        >
          All
        </Button>
        <Button
          variant={activeFilter === "favorites" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("favorites")}
        >
          <Heart className="h-4 w-4 mr-1" />
          Favorites
        </Button>
        <Button
          variant={activeFilter === "recent" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("recent")}
        >
          <Clock className="h-4 w-4 mr-1" />
          Recent
        </Button>
      </div>
      
      {/* Results */}
      <div className="space-y-2">
        {filteredPresets.map(preset => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isFavorite={favoritePresets.includes(preset.id)}
            onToggleFavorite={() => toggleFavorite(preset.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Real-time search by name, description, category
- [ ] Favorites category with heart toggle
- [ ] Recently used presets (last 10)
- [ ] Search debounced (200ms)

---

### B.2 Preset Favorites System (Week 11)

**Implementation:**
```typescript
// src/hooks/use-preset-favorites.ts
const STORAGE_KEY = "luminary_preset_favorites";

export function usePresetFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setFavorites(JSON.parse(stored));
    }
  }, []);

  const toggleFavorite = useCallback((presetId: string) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(presetId)
        ? prev.filter(id => id !== presetId)
        : [...prev, presetId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
      return newFavorites;
    });
  }, []);

  const isFavorite = useCallback(
    (presetId: string) => favorites.includes(presetId),
    [favorites]
  );

  return { favorites, toggleFavorite, isFavorite };
}
```

---

## Phase C: Advanced Comparison & Export

### C.1 Side-by-Side Comparison Mode (Week 12)

**Research:** Some users prefer seeing both images simultaneously vs. slider

**Implementation:**
```typescript
// src/components/ui/side-by-side-comparison.tsx
interface SideBySideComparisonProps {
  originalImage: string;
  processedImage: string;
  originalLabel?: string;
  processedLabel?: string;
}

export function SideBySideComparison({
  originalImage,
  processedImage,
  originalLabel = "Original",
  processedLabel = "Processed",
}: SideBySideComparisonProps) {
  const [synchronizedZoom, setSynchronizedZoom] = useState(100);
  const [synchronizedPan, setSynchronizedPan] = useState({ x: 0, y: 0 });

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Original */}
      <div className="relative overflow-hidden rounded-lg border">
        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-black/60 text-white text-sm rounded">
          {originalLabel}
        </div>
        <ZoomableImage
          src={originalImage}
          zoom={synchronizedZoom}
          pan={synchronizedPan}
          onZoomChange={setSynchronizedZoom}
          onPanChange={setSynchronizedPan}
        />
      </div>

      {/* Processed */}
      <div className="relative overflow-hidden rounded-lg border">
        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-black/60 text-white text-sm rounded">
          {processedLabel}
        </div>
        <ZoomableImage
          src={processedImage}
          zoom={synchronizedZoom}
          pan={synchronizedPan}
          onZoomChange={setSynchronizedZoom}
          onPanChange={setSynchronizedPan}
          syncWith={originalImage} // Keep both in sync
        />
      </div>
    </div>
  );
}
```

**Integration with Compare Page:**
```typescript
// src/app/compare/[projectId]/page.tsx
const [comparisonMode, setComparisonMode] = useState<"slider" | "side-by-side">("slider");

<ToggleGroup
  type="single"
  value={comparisonMode}
  onValueChange={(v) => setComparisonMode(v as any)}
>
  <ToggleGroupItem value="slider">
    <ArrowLeftRight className="h-4 w-4 mr-1" />
    Slider
  </ToggleGroupItem>
  <ToggleGroupItem value="side-by-side">
    <Columns className="h-4 w-4 mr-1" />
    Side-by-Side
  </ToggleGroupItem>
</ToggleGroup>

{comparisonMode === "slider" ? (
  <ComparisonSlider ... />
) : (
  <SideBySideComparison ... />
)}
```

**Acceptance Criteria:**
- [ ] Toggle between slider and side-by-side
- [ ] Synchronized zoom and pan in side-by-side
- [ ] Labels on both images
- [ ] Responsive: side-by-side only on md+ screens

---

### C.2 Export Presets (Week 12)

**Research:** Users want to save common export settings

**Implementation:**
```typescript
// src/hooks/use-export-presets.ts
interface ExportPreset {
  id: string;
  name: string;
  format: "jpg" | "tiff" | "png";
  quality: number;
  colorSpace: string;
  resize?: { width?: number; height?: number };
  watermark?: boolean;
}

export function useExportPresets() {
  const [presets, setPresets] = useState<ExportPreset[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("luminary_export_presets");
    if (stored) {
      setPresets(JSON.parse(stored));
    }
  }, []);

  const savePreset = useCallback((preset: ExportPreset) => {
    setPresets(prev => {
      const newPresets = [...prev, preset];
      localStorage.setItem("luminary_export_presets", JSON.stringify(newPresets));
      return newPresets;
    });
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets(prev => {
      const newPresets = prev.filter(p => p.id !== id);
      localStorage.setItem("luminary_export_presets", JSON.stringify(newPresets));
      return newPresets;
    });
  }, []);

  return { presets, savePreset, deletePreset };
}

// UI Component
export function ExportPresetSelector({
  presets,
  selectedPreset,
  onSelect,
  onSaveCurrent,
}: ExportPresetSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Export Preset</Label>
        <Button variant="outline" size="sm" onClick={onSaveCurrent}>
          <Save className="h-4 w-4 mr-1" />
          Save Current
        </Button>
      </div>
      
      <Select value={selectedPreset?.id} onValueChange={onSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select preset..." />
        </SelectTrigger>
        <SelectContent>
          {presets.map(preset => (
            <SelectItem key={preset.id} value={preset.id}>
              <div className="flex items-center justify-between w-full">
                <span>{preset.name}</span>
                <span className="text-xs text-muted-foreground">
                  {preset.format.toUpperCase()} • {preset.quality}%
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Save current export settings as preset
- [ ] Select from saved presets
- [ ] Delete saved presets
- [ ] Presets persist in localStorage

---

## Phase D: Batch Processing

### D.1 Batch Processing Controls (Week 13)

**Research:** Power users need to apply edits to multiple images

**Implementation:**
```typescript
// src/components/ui/batch-processing.tsx
interface BatchProcessingProps {
  selectedPreset: Preset | null;
  intensity: number;
  onBatchProcess: (projectIds: string[]) => Promise<void>;
}

export function BatchProcessingPanel({
  selectedPreset,
  intensity,
  onBatchProcess,
}: BatchProcessingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const { projects } = useProjects(); // Recent projects

  const handleBatchProcess = async () => {
    if (!selectedPreset || selectedProjects.length === 0) return;
    
    toast.promise(
      onBatchProcess(selectedProjects),
      {
        loading: `Processing ${selectedProjects.length} images...`,
        success: `Batch processing started for ${selectedProjects.length} images`,
        error: "Failed to start batch processing",
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!selectedPreset}>
          <Layers className="h-4 w-4 mr-1" />
          Batch Process
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Batch Processing</DialogTitle>
          <DialogDescription>
            Apply "{selectedPreset?.name}" at {intensity}% intensity to multiple images
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {projects.map(project => (
                <label
                  key={project.id}
                  className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                >
                  <Checkbox
                    checked={selectedProjects.includes(project.id)}
                    onCheckedChange={(checked) => {
                      setSelectedProjects(prev =>
                        checked
                          ? [...prev, project.id]
                          : prev.filter(id => id !== project.id)
                      );
                    }}
                  />
                  <div className="w-12 h-12 rounded bg-muted overflow-hidden">
                    {project.thumbnail && (
                      <Image
                        src={project.thumbnail}
                        alt={project.name}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{project.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {project.status}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedProjects.length} projects selected
            </p>
            <Button
              onClick={handleBatchProcess}
              disabled={selectedProjects.length === 0}
            >
              Process {selectedProjects.length} Images
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Acceptance Criteria:**
- [ ] Select multiple projects from recent list
- [ ] Apply current preset/intensity to all selected
- [ ] Progress tracking for batch jobs
- [ ] Toast notifications for batch status

---

## Implementation Timeline

| Phase | Feature | Duration | Priority |
|-------|---------|----------|----------|
| A.1 | Split-Screen Edit Mode | 3 days | High |
| A.2 | Zoom & Pan | 4 days | High |
| B.1 | Presets Search | 3 days | Medium |
| B.2 | Favorites System | 2 days | Medium |
| C.1 | Side-by-Side Comparison | 4 days | High |
| C.2 | Export Presets | 3 days | Low |
| D.1 | Batch Processing | 5 days | Medium |

**Total Duration:** ~3-4 weeks (can be parallelized)

---

## Files to Create/Modify

### New Components:
- `src/components/ui/preset-search.tsx`
- `src/components/ui/side-by-side-comparison.tsx`
- `src/components/ui/batch-processing.tsx`
- `src/components/ui/export-preset-selector.tsx`
- `src/components/ui/zoomable-image.tsx`

### New Hooks:
- `src/hooks/use-preset-favorites.ts`
- `src/hooks/use-export-presets.ts`
- `src/hooks/use-zoom-pan.ts`
- `src/hooks/use-recent-presets.ts`

### Modified Files:
- `src/app/edit/[projectId]/page.tsx` - Add split view, zoom, search
- `src/app/compare/[projectId]/page.tsx` - Add side-by-side mode
- `src/components/ui/preset-gallery.tsx` - Add favorites, search

---

## Success Metrics

- **Preset Search:** < 100ms search response time
- **Zoom Performance:** Smooth pan at 400% zoom (60fps)
- **Batch Processing:** Handle 50+ images without UI freeze
- **Favorites:** Persist across sessions
