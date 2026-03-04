# Luminary Lab - Comprehensive Implementation Plan

## Executive Summary

Based on the UI/UX review and extensive research into modern photo editing interfaces (Lightroom, Capture One, Luminar, Figma, and 2025/2026 design trends), this implementation plan provides a phased approach to transforming Luminary Lab into a world-class AI photo editing platform.

**Research Sources:**
- Modern AI photo editing UX patterns (2025-2026)
- Professional photo editing interfaces (Lightroom, Capture One, Luminar Neo)
- Figma keyboard shortcuts & accessibility best practices
- Shadcn/UI component library patterns
- Slider UI design guidelines from Eleken and SetProduct

---

## Phase 1: Foundation & Critical Fixes (Weeks 1-2)

### 1.1 Compare Page - Core Functionality Fixes

#### 1.1.1 Zoom in Split Mode (Critical)
**Current Issue**: Zoom only works in single-view mode
**Research Finding**: Modern editors (Lightroom, Capture One) use synchronized zoom on both panels

**Implementation:**
```typescript
// src/app/compare/[projectId]/page.tsx
// Lines 555-620 - Apply zoom to both images

const [synchronizedZoom, setSynchronizedZoom] = useState(100);

// In split view section (around line 555):
<div className="absolute inset-0 overflow-hidden" style={{ width: `${dividerPosition}%` }}>
  <Image
    src={originalImageUrl!}
    alt="Original"
    fill
    sizes="100vw"
    className="object-contain object-center"
    style={{ 
      transform: `scale(${synchronizedZoom / 100})`,
      transformOrigin: 'center center'
    }}
  />
</div>
```

**Acceptance Criteria:**
- [ ] Zoom slider applies to both original and processed images simultaneously
- [ ] Zoom range: 50% - 300% (industry standard)
- [ ] Smooth zoom transitions (CSS transition: transform 0.2s ease-out)
- [ ] Pan functionality when zoomed > 100%

#### 1.1.2 Keyboard Navigation for Divider (Accessibility Critical)
**Research Finding**: Figma and modern tools use arrow keys for precise control; WCAG 2.2 requires keyboard operability

**Implementation:**
```typescript
// Add to compare page (around line 62)
const [isSliderFocused, setIsSliderFocused] = useState(false);

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isSliderFocused && e.target !== document.body) return;
    
    switch(e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        setDividerPosition(p => Math.max(0, p - (e.shiftKey ? 1 : 5)));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setDividerPosition(p => Math.min(100, p + (e.shiftKey ? 1 : 5)));
        break;
      case 'Home':
        e.preventDefault();
        setDividerPosition(0);
        break;
      case 'End':
        e.preventDefault();
        setDividerPosition(100);
        break;
      case 'c': // Center shortcut (industry standard)
        if (e.target === document.body) {
          e.preventDefault();
          setDividerPosition(50);
        }
        break;
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isSliderFocused]);
```

**Acceptance Criteria:**
- [ ] Arrow keys move divider by 5% (1% with Shift)
- [ ] Home/End keys jump to extremes
- [ ] 'C' key resets to center (50%)
- [ ] Visual focus indicator on slider handle
- [ ] ARIA labels for screen readers

#### 1.1.3 Fullscreen Mode
**Research Finding**: Capture One and Lightroom use dedicated fullscreen modes for detailed inspection

**Implementation:**
```typescript
const [isFullscreen, setIsFullscreen] = useState(false);

const toggleFullscreen = async () => {
  const container = document.getElementById('comparison-container');
  if (!document.fullscreenElement) {
    await container?.requestFullscreen();
    setIsFullscreen(true);
  } else {
    await document.exitFullscreen();
    setIsFullscreen(false);
  }
};

// Add button in controls (line 297-302):
<Button variant="outline" size="sm" onClick={toggleFullscreen}>
  <Maximize2 className="mr-2 h-4 w-4" />
  Fullscreen
</Button>
```

### 1.2 Edit Page - Core UX Fixes

#### 1.2.1 Intensity Slider Repositioning (High Impact)
**Current Issue**: Slider is buried at bottom of sidebar (lines 772-785)
**Research Finding**: Primary controls should be "above the fold" or sticky (Figma, Capture One pattern)

**Implementation:**
```typescript
// src/app/edit/[projectId]/page.tsx
// Move intensity slider to sticky header section

// New sticky control bar (after line 496):
<div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4 mb-4">
  <div className="flex items-center gap-4">
    <div className="flex-1">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Intensity
        </label>
        <span className="text-sm font-mono">{intensity}%</span>
      </div>
      <IntensitySlider
        value={intensity}
        onValueChange={handleIntensityChange}
        disabled={!selectedPreset}
      />
    </div>
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => handleIntensityChange(70)}
      disabled={!selectedPreset}
    >
      <RotateCcw className="h-4 w-4 mr-1" />
      Reset
    </Button>
  </div>
</div>
```

**Acceptance Criteria:**
- [ ] Intensity slider visible without scrolling
- [ ] Sticky positioning keeps it accessible during preset browsing
- [ ] Reset button returns to default 70%
- [ ] Shows current percentage value

#### 1.2.2 Reset/Undo Functionality
**Research Finding**: Modern tools (Figma, Lightroom) use Cmd/Ctrl+Z and dedicated reset buttons per control

**Implementation:**
```typescript
// Add to use-image-preview.ts hook
export function useImagePreview({ previewImageUrl }: UseImagePreviewOptions) {
  const [history, setHistory] = useState<FilterSettings[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const updateFilter = useCallback((key: keyof FilterSettings, value: number) => {
    setFilterSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      setHistory(h => [...h.slice(0, historyIndex + 1), newSettings]);
      setHistoryIndex(i => i + 1);
      return newSettings;
    });
  }, [historyIndex]);
  
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(i => i - 1);
      setFilterSettings(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);
  
  const resetFilters = useCallback(() => {
    setFilterSettings(defaultSettings);
    setHistory([defaultSettings]);
    setHistoryIndex(0);
  }, []);
  
  return { updateFilter, undo, resetFilters, canUndo: historyIndex > 0 };
}
```

**Keyboard shortcuts (add to edit page):**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      undo();
    }
    if (e.key === 'Escape') {
      resetFilters();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [undo, resetFilters]);
```

---

## Phase 2: Power User Features (Weeks 3-4)

### 2.1 Keyboard Shortcuts System

**Research Finding**: Figma's keyboard shortcuts (V for move, F for frame) are now industry standard; users expect similar patterns

**Implementation:**
```typescript
// src/hooks/use-keyboard-shortcuts.ts
export function useKeyboardShortcuts(
  presets: Preset[],
  selectedPreset: Preset | null,
  onSelectPreset: (p: Preset) => void,
  onAdjustIntensity: (delta: number) => void,
  onToggleCompare: () => void,
  onProcess: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch(e.key) {
        case '1': case '2': case '3': case '4': case '5':
        case '6': case '7': case '8': case '9':
          const index = parseInt(e.key) - 1;
          if (presets[index]) {
            e.preventDefault();
            onSelectPreset(presets[index]);
          }
          break;
        case '+': case '=':
        case 'ArrowUp':
          e.preventDefault();
          onAdjustIntensity(5);
          break;
        case '-':
        case 'ArrowDown':
          e.preventDefault();
          onAdjustIntensity(-5);
          break;
        case ' ':
          e.preventDefault();
          onToggleCompare();
          break;
        case 'Enter':
          e.preventDefault();
          onProcess();
          break;
        case '?':
          e.preventDefault();
          setShowShortcutsHelp(true);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presets, onSelectPreset, onAdjustIntensity, onToggleCompare, onProcess]);
}
```

**Visual shortcut help panel:**
```typescript
// Add to UI
<Dialog open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Keyboard Shortcuts</DialogTitle>
    </DialogHeader>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div><kbd>1</kbd> - <kbd>9</kbd></div><div>Select preset</div>
      <div><kbd>↑</kbd> / <kbd>+</kbd></div><div>Increase intensity</div>
      <div><kbd>↓</kbd> / <kbd>-</kbd></div><div>Decrease intensity</div>
      <div><kbd>Space</kbd></div><div>Toggle before/after</div>
      <div><kbd>Enter</kbd></div><div>Apply/Process</div>
      <div><kbd>Cmd</kbd> + <kbd>Z</kbd></div><div>Undo</div>
      <div><kbd>Esc</kbd></div><div>Reset</div>
      <div><kbd>?</kbd></div><div>Show shortcuts</div>
    </div>
  </DialogContent>
</Dialog>
```

### 2.2 Before/After Toggle (Edit Page)

**Research Finding**: Luminar Neo and modern AI editors use "hold to compare" pattern (spacebar or dedicated button)

**Implementation:**
```typescript
const [showOriginal, setShowOriginal] = useState(false);
const [isComparePressed, setIsComparePressed] = useState(false);

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' && !e.repeat) {
      setIsComparePressed(true);
    }
  };
  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === ' ') {
      setIsComparePressed(false);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}, []);

// In render (line 555-606):
{selectedPreset && (
  <div className="style={previewStyle}">
    {(isComparePressed || showOriginal) ? (
      <BlurHashImage src={originalImage} ... /> // Show original
    ) : (
      <BlurHashImage src={realTimePreviewUrl} ... /> // Show processed
    )}
  </div>
)}

// Compare button in toolbar:
<Button
  variant={isComparePressed ? "default" : "outline"}
  size="sm"
  onMouseDown={() => setIsComparePressed(true)}
  onMouseUp={() => setIsComparePressed(false)}
  onMouseLeave={() => setIsComparePressed(false)}
>
  <Eye className="mr-2 h-4 w-4" />
  Hold to Compare
</Button>
```

### 2.3 Enhanced Preset Selection Feedback

**Research Finding**: 2026 design trends favor clear selection states with iconography + color + elevation

**Implementation:**
```typescript
// Line 698-757 enhancement
<div
  key={preset.id}
  onClick={() => handlePresetSelect(preset)}
  className={`
    group relative cursor-pointer overflow-hidden rounded-sm border-2 transition-all duration-200
    ${isSelected
      ? "border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/20 bg-primary/5"
      : isRecommended
        ? "border-amber-500/50 hover:border-amber-500 hover:shadow-md"
        : "border-border hover:border-primary/50 hover:shadow-sm"
    }
  `}
>
  <div className="flex items-center gap-3 p-3 bg-card">
    {/* Checkmark for selected */}
    {isSelected && (
      <div className="absolute top-2 left-2 z-10">
        <div className="bg-primary text-primary-foreground rounded-full p-1 shadow-sm">
          <Check className="h-3 w-3" />
        </div>
      </div>
    )}
    
    {/* Preset thumbnail with overlay when selected */}
    <div className={`
      relative h-14 w-14 rounded-sm overflow-hidden flex-shrink-0
      ${isSelected ? 'ring-2 ring-primary' : ''}
    `}>
      <Image src={preset.exampleImageUrl} alt={preset.name} fill sizes="56px" className="object-cover" />
      {isSelected && <div className="absolute inset-0 bg-primary/10" />}
    </div>
    
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className={`
          font-medium text-sm truncate transition-colors
          ${isSelected ? 'text-primary font-semibold' : 'text-foreground group-hover:text-primary'}
        `}>
          {preset.name}
        </p>
        {isRecommended && !isSelected && (
          <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
        )}
      </div>
      {preset.description && (
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {preset.description}
        </p>
      )}
    </div>
  </div>
  
  {/* Selected indicator bar */}
  {isSelected && (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
  )}
</div>
```

### 2.4 Processing Progress Indicator

**Research Finding**: Modern AI tools (Aftershoot, Imagen) show real-time progress with stages

**Implementation:**
```typescript
// Enhanced progress component
interface ProcessingStage {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
  progress: number;
}

const ProcessingIndicator = ({ stages, overallProgress, estimatedTime }: {
  stages: ProcessingStage[];
  overallProgress: number;
  estimatedTime: string;
}) => (
  <div className="bg-black/80 backdrop-blur-md rounded-lg p-6 text-white">
    <div className="flex items-center gap-3 mb-4">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <div>
        <p className="font-medium">Processing your image...</p>
        <p className="text-sm text-white/60">{estimatedTime} remaining</p>
      </div>
      <span className="ml-auto text-2xl font-bold">{overallProgress}%</span>
    </div>
    
    <Progress value={overallProgress} className="h-2 mb-4" />
    
    <div className="space-y-2">
      {stages.map(stage => (
        <div key={stage.id} className="flex items-center gap-2 text-sm">
          {stage.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-400" />}
          {stage.status === 'active' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {stage.status === 'pending' && <Circle className="h-4 w-4 text-white/30" />}
          <span className={stage.status === 'active' ? 'text-white' : 'text-white/60'}>
            {stage.label}
          </span>
        </div>
      ))}
    </div>
  </div>
);
```

---

## Phase 3: Modern Design System Implementation (Weeks 5-6)

### 3.1 Design Token System Enhancement

**Based on Shadcn/UI 2026 patterns and professional creative tools:**

```css
/* Add to globals.css */
:root {
  /* Enhanced color system */
  --accent-gold: 43 74% 66%;
  --accent-gold-light: 43 74% 76%;
  --accent-gold-dark: 43 74% 46%;
  
  /* Creative tool specific */
  --canvas-bg: 0 0% 5%;
  --sidebar-bg: 0 0% 8%;
  --tool-active: var(--accent-gold);
  --tool-hover: 0 0% 15%;
  
  /* Spacing scale (8px grid) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  
  /* Animation timing */
  --duration-instant: 0ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
  --ease-productive: cubic-bezier(0.2, 0, 0, 1);
  --ease-expressive: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 3.2 Component Library Updates

#### 3.2.1 New Comparison Slider Component

**Research Finding**: Modern comparison sliders (DualView, Eleken examples) use smooth physics-based dragging

```typescript
// src/components/ui/comparison-slider-v2.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Image from "next/image";

interface ComparisonSliderV2Props {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  aspectRatio?: number;
}

export function ComparisonSliderV2({
  beforeImage,
  afterImage,
  beforeLabel = "Original",
  afterLabel = "Processed",
  className,
  aspectRatio = 16/9,
}: ComparisonSliderV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(50);
  
  const x = useMotionValue(50);
  const springX = useSpring(x, { stiffness: 300, damping: 30 });
  
  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const percentage = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, percentage));
    setPosition(clamped);
    x.set(clamped);
  }, [x]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  }, [isDragging, handleMove]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  }, [handleMove]);
  
  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setPosition(p => Math.max(0, p - (e.shiftKey ? 1 : 5)));
      } else if (e.key === 'ArrowRight') {
        setPosition(p => Math.min(100, p + (e.shiftKey ? 1 : 5)));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-black select-none ${className}`}
      style={{ aspectRatio }}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onTouchMove={handleTouchMove}
    >
      {/* After image (full width) */}
      <Image
        src={afterImage}
        alt={afterLabel}
        fill
        className="object-contain"
        draggable={false}
      />
      
      {/* Before image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src={beforeImage}
          alt={beforeLabel}
          fill
          className="object-contain"
          draggable={false}
        />
      </div>
      
      {/* Slider handle */}
      <motion.div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
        style={{ x: springX, left: '-0.5px' }}
        onMouseDown={() => setIsDragging(true)}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                        w-10 h-10 bg-white rounded-full shadow-lg 
                        flex items-center justify-center">
          <div className="flex gap-1">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      </motion.div>
      
      {/* Labels */}
      <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 text-white text-sm rounded backdrop-blur-sm">
        {beforeLabel}
      </div>
      <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 text-white text-sm rounded backdrop-blur-sm">
        {afterLabel}
      </div>
    </div>
  );
}
```

#### 3.2.2 Skeleton Loading States

```typescript
// src/components/ui/skeleton-preset-card.tsx
export function SkeletonPresetCard() {
  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-sm animate-pulse">
      <div className="h-14 w-14 rounded-sm bg-muted flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

// src/components/ui/skeleton-image-viewer.tsx
export function SkeletonImageViewer() {
  return (
    <div className="relative w-full h-full bg-secondary/20 animate-pulse">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-muted rounded-full mx-auto" />
          <div className="h-4 bg-muted rounded w-32 mx-auto" />
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 4: Advanced Features (Weeks 7-8)

### 4.1 Histogram Display

**Research Finding**: Professional editors (Lightroom, Capture One) use RGB histograms for visual feedback

**Implementation:**
```typescript
// src/components/ui/histogram.tsx
interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
}

export function Histogram({ data, height = 100 }: { data: HistogramData; height?: number }) {
  const maxValue = Math.max(
    ...data.red, ...data.green, ...data.blue, ...data.luminance
  );
  
  const renderChannel = (values: number[], color: string, opacity = 0.5) => {
    const points = values.map((v, i) => {
      const x = (i / values.length) * 100;
      const y = 100 - (v / maxValue) * 100;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <polygon
        points={`0,100 ${points} 100,100`}
        fill={color}
        fillOpacity={opacity}
      />
    );
  };
  
  return (
    <svg viewBox="0 0 100 100" className="w-full" style={{ height }} preserveAspectRatio="none">
      {renderChannel(data.red, 'rgb(239, 68, 68)', 0.3)}
      {renderChannel(data.green, 'rgb(34, 197, 94)', 0.3)}
      {renderChannel(data.blue, 'rgb(59, 130, 246)', 0.3)}
      {renderChannel(data.luminance, 'rgb(255, 255, 255)', 0.4)}
    </svg>
  );
}
```

### 4.2 Mobile-Responsive Comparison

**Research Finding**: Mobile photo editing (VSCO, Lightroom Mobile) uses vertical slider in portrait mode

```typescript
// Mobile detection and vertical mode
const [isPortrait, setIsPortrait] = useState(false);

useEffect(() => {
  const checkOrientation = () => {
    setIsPortrait(window.innerHeight > window.innerWidth);
  };
  checkOrientation();
  window.addEventListener('resize', checkOrientation);
  return () => window.removeEventListener('resize', checkOrientation);
}, []);

// In render:
{isPortrait ? (
  <VerticalComparisonSlider /* ... */ />
) : (
  <ComparisonSlider /* ... */ />
)}
```

### 4.3 Comparison Metrics Sidebar

**Implementation:**
```typescript
// src/components/ui/comparison-metrics.tsx
interface ImageMetrics {
  fileSize: number;
  dimensions: { width: number; height: number };
  colorSpace: string;
  bitDepth: number;
}

export function ComparisonMetrics({
  original,
  processed,
}: {
  original: ImageMetrics;
  processed: ImageMetrics;
}) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const sizeDiff = processed.fileSize - original.fileSize;
  const sizeDiffPercent = ((sizeDiff / original.fileSize) * 100).toFixed(1);
  
  return (
    <Card className="w-64 shrink-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Image Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between text-muted-foreground">
            <span>Dimensions</span>
            <span className="text-foreground">
              {original.dimensions.width} × {original.dimensions.height}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Color Space</span>
            <span className="text-foreground">{original.colorSpace}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Bit Depth</span>
            <span className="text-foreground">{original.bitDepth}-bit</span>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="flex justify-between text-muted-foreground">
            <span>Original Size</span>
            <span className="text-foreground">{formatBytes(original.fileSize)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Processed Size</span>
            <span className="text-foreground">{formatBytes(processed.fileSize)}</span>
          </div>
          <div className={cn(
            "flex justify-between text-xs",
            sizeDiff > 0 ? "text-amber-500" : "text-green-500"
          )}>
            <span>Size Change</span>
            <span>{sizeDiff > 0 ? '+' : ''}{sizeDiffPercent}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Phase 5: Polish & Optimization (Week 9)

### 5.1 URL State Persistence

**Research Finding**: Modern apps (Linear, Vercel) use URL state for shareability and back-button support

**Implementation:**
```typescript
// src/hooks/use-url-state.ts
export function useUrlState<T extends Record<string, any>>(
  defaults: T
): [T, (updates: Partial<T>) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const state = useMemo(() => {
    const result = { ...defaults };
    Object.keys(defaults).forEach(key => {
      const value = searchParams.get(key);
      if (value !== null) {
        const defaultValue = defaults[key];
        if (typeof defaultValue === 'number') {
          result[key] = Number(value) as T[Extract<keyof T, string>];
        } else if (typeof defaultValue === 'boolean') {
          result[key] = (value === 'true') as T[Extract<keyof T, string>];
        } else {
          result[key] = value as T[Extract<keyof T, string>];
        }
      }
    });
    return result;
  }, [searchParams, defaults]);
  
  const setState = useCallback((updates: Partial<T>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === defaults[key]) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.replace(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams, defaults]);
  
  return [state, setState];
}

// Usage in edit page:
const [urlState, setUrlState] = useUrlState({
  preset: '',
  intensity: 70,
  compare: false,
});
```

### 5.2 Accessibility Audit

**Checklist:**
- [ ] All interactive elements keyboard accessible
- [ ] ARIA labels on comparison slider
- [ ] Color contrast ratio ≥ 4.5:1
- [ ] Focus indicators visible
- [ ] Screen reader announcements for processing state
- [ ] Reduced motion support (`prefers-reduced-motion`)

### 5.3 Performance Optimization

**Tasks:**
- [ ] Virtualize preset list (react-window)
- [ ] Debounce intensity slider updates (200ms)
- [ ] Lazy load comparison images
- [ ] Preload next preset thumbnails on hover
- [ ] Optimize image sizes (WebP format)

---

## Implementation Checklist

### Phase 1
- [ ] 1.1.1 Zoom in split mode
- [ ] 1.1.2 Keyboard navigation for divider
- [ ] 1.1.3 Fullscreen mode
- [ ] 1.2.1 Intensity slider repositioning
- [ ] 1.2.2 Reset/undo functionality

### Phase 2
- [ ] 2.1 Keyboard shortcuts system
- [ ] 2.2 Before/after toggle
- [ ] 2.3 Enhanced preset feedback
- [ ] 2.4 Processing progress indicator

### Phase 3
- [ ] 3.1 Design token system
- [ ] 3.2 New comparison slider component
- [ ] 3.3 Skeleton loading states

### Phase 4
- [ ] 4.1 Histogram display
- [ ] 4.2 Mobile responsive comparison
- [ ] 4.3 Comparison metrics sidebar

### Phase 5
- [ ] 5.1 URL state persistence
- [ ] 5.2 Accessibility audit
- [ ] 5.3 Performance optimization

---

## Key Research Insights Applied

### From Professional Photo Editors:
1. **Lightroom/Capture One**: Tools stay accessible, canvas is maximized
2. **Keyboard shortcuts**: Single-key shortcuts for common actions
3. **Before/after**: Spacebar hold is industry standard

### From 2025/2026 Design Trends:
1. **AI UX Patterns**: Transparency about processing stages builds trust
2. **Accessibility**: Keyboard-first design is now expected
3. **Motion**: Subtle, purposeful animations (not gratuitous)

### From Component Libraries:
1. **Shadcn/UI**: Copy-paste ownership model, Radix primitives
2. **Tailwind**: Utility-first, design token integration
3. **Framer Motion**: Physics-based animations feel more natural

---

## Success Metrics

**Usability:**
- Time to compare images: < 2 seconds
- Time to apply preset: < 3 clicks
- Keyboard-only task completion rate: > 90%

**Performance:**
- First paint: < 1.5s
- Time to interactive: < 3s
- Image load time: < 2s

**Accessibility:**
- Lighthouse a11y score: 100
- WCAG 2.2 AA compliance
- Keyboard navigation coverage: 100%

---

*Implementation plan based on research from Eleken, SetProduct, Figma, UX Collective, and industry-leading photo editing tools.*
