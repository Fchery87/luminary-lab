import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ZoomIn, ZoomOut, Maximize2, Minus, Plus } from "lucide-react";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  minZoom = 50,
  maxZoom = 400,
  className,
  position = "bottom-right",
}: ZoomControlsProps) {
  const positionClasses = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
  };

  return (
    <div
      className={cn(
        "absolute flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-lg p-1.5 border shadow-lg",
        positionClasses[position],
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onZoomOut}
        disabled={zoom <= minZoom}
        title="Zoom out (-)"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>

      <div className="flex items-center gap-1 min-w-[60px] justify-center">
        <span className="text-xs font-mono tabular-nums">{Math.round(zoom)}%</span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onZoomIn}
        disabled={zoom >= maxZoom}
        title="Zoom in (+)"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onReset}
        disabled={zoom === 100}
        title="Reset zoom (0)"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface ViewModeToggleProps {
  viewMode: "standard" | "split";
  onChange: (mode: "standard" | "split") => void;
  className?: string;
}

export function ViewModeToggle({
  viewMode,
  onChange,
  className,
}: ViewModeToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-lg p-1 border shadow-lg",
        className
      )}
    >
      <Button
        variant={viewMode === "standard" ? "default" : "ghost"}
        size="sm"
        className="h-7 text-xs"
        onClick={() => onChange("standard")}
      >
        Standard
      </Button>
      <Button
        variant={viewMode === "split" ? "default" : "ghost"}
        size="sm"
        className="h-7 text-xs"
        onClick={() => onChange("split")}
      >
        Split View
      </Button>
    </div>
  );
}

export default ZoomControls;
