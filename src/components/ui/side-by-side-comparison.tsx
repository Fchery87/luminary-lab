import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ZoomControls } from "@/components/ui/zoom-controls";
import { useZoomPan } from "@/hooks/use-zoom-pan";
import Image from "next/image";

interface SideBySideComparisonProps {
  originalImage: string;
  processedImage: string;
  originalLabel?: string;
  processedLabel?: string;
  className?: string;
}

export function SideBySideComparison({
  originalImage,
  processedImage,
  originalLabel = "Original",
  processedLabel = "Processed",
  className,
}: SideBySideComparisonProps) {
  // Shared zoom/pan state for synchronization
  const [syncZoom, setSyncZoom] = useState(100);
  const [syncPan, setSyncPan] = useState({ x: 0, y: 0 });

  const handleZoomChange = useCallback((newZoom: number) => {
    setSyncZoom(newZoom);
  }, []);

  const handlePanChange = useCallback((newPan: { x: number; y: number }) => {
    setSyncPan(newPan);
  }, []);

  const zoomIn = () => setSyncZoom((z) => Math.min(400, z + 25));
  const zoomOut = () => setSyncZoom((z) => Math.max(50, z - 25));
  const resetZoom = () => {
    setSyncZoom(100);
    setSyncPan({ x: 0, y: 0 });
  };

  return (
    <div className={cn("relative h-full w-full", className)}>
      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Original Image */}
        <ImagePanel
          src={originalImage}
          label={originalLabel}
          zoom={syncZoom}
          pan={syncPan}
          onZoomChange={handleZoomChange}
          onPanChange={handlePanChange}
        />

        {/* Processed Image */}
        <ImagePanel
          src={processedImage}
          label={processedLabel}
          zoom={syncZoom}
          pan={syncPan}
          onZoomChange={handleZoomChange}
          onPanChange={handlePanChange}
        />
      </div>

      {/* Shared Zoom Controls */}
      <ZoomControls
        zoom={syncZoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetZoom}
        position="bottom-right"
        className="m-4"
      />

      {/* Zoom Help */}
      {syncZoom > 100 && (
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-background/90 backdrop-blur-sm rounded-md border shadow-sm">
          <p className="text-xs text-muted-foreground">
            Ctrl/Cmd + scroll to zoom • Drag to pan
          </p>
        </div>
      )}
    </div>
  );
}

interface ImagePanelProps {
  src: string;
  label: string;
  zoom: number;
  pan: { x: number; y: number };
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
}

function ImagePanel({
  src,
  label,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
}: ImagePanelProps) {
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = React.useRef({ x: 0, y: 0 });
  const panStartPosRef = React.useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 100) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panStartPosRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const deltaX = e.clientX - panStartRef.current.x;
    const deltaY = e.clientY - panStartRef.current.y;
    onPanChange({
      x: panStartPosRef.current.x + deltaX,
      y: panStartPosRef.current.y + deltaY,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Handle wheel zoom
  React.useEffect(() => {
    const handleWheel = (e: Event) => {
      const wheelEvent = e as WheelEvent;
      if (wheelEvent.ctrlKey || wheelEvent.metaKey) {
        e.preventDefault();
        const delta = wheelEvent.deltaY > 0 ? -25 : 25;
        onZoomChange(Math.max(50, Math.min(400, zoom + delta)));
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [zoom, onZoomChange]);

  const transform = {
    transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
    transformOrigin: "center center",
    cursor: zoom > 100 ? (isPanning ? "grabbing" : "grab") : "default",
  };

  return (
    <div
      className="relative overflow-hidden rounded-lg border bg-black"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Label */}
      <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-black/70 text-white text-xs font-medium rounded backdrop-blur-sm">
        {label}
      </div>

      {/* Image */}
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-75"
        style={transform}
      >
        <Image
          src={src}
          alt={label}
          fill
          className="object-contain select-none"
          draggable={false}
        />
      </div>
    </div>
  );
}

export default SideBySideComparison;
