"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface ZoomPanState {
  zoom: number;
  pan: { x: number; y: number };
  isPanning: boolean;
}

interface UseZoomPanOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  containerRef?: React.RefObject<HTMLElement | null>;
}

export function useZoomPan(options: UseZoomPanOptions = {}) {
  const {
    minZoom = 50,
    maxZoom = 400,
    zoomStep = 25,
    containerRef,
  } = options;

  const [zoom, setZoomState] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panStartPosRef = useRef({ x: 0, y: 0 });

  const setZoom = useCallback(
    (newZoom: number | ((prev: number) => number)) => {
      setZoomState((prev) => {
        const resolvedZoom =
          typeof newZoom === "function" ? newZoom(prev) : newZoom;
        return Math.max(minZoom, Math.min(maxZoom, resolvedZoom));
      });
    },
    [minZoom, maxZoom]
  );

  const resetZoom = useCallback(() => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  }, [setZoom]);

  const zoomIn = useCallback(() => {
    setZoom((z) => z + zoomStep);
  }, [setZoom, zoomStep]);

  const zoomOut = useCallback(() => {
    setZoom((z) => z - zoomStep);
  }, [setZoom, zoomStep]);

  // Handle wheel zoom with Ctrl/Cmd
  useEffect(() => {
    const element = containerRef?.current;

    const handleWheel = (e: Event) => {
      const wheelEvent = e as WheelEvent;
      if (wheelEvent.ctrlKey || wheelEvent.metaKey) {
        e.preventDefault();
        const delta = wheelEvent.deltaY > 0 ? -zoomStep : zoomStep;
        setZoom((z) => z + delta);
      }
    };

    const target = element || window;
    target.addEventListener("wheel", handleWheel, { passive: false });
    return () => target.removeEventListener("wheel", handleWheel);
  }, [containerRef, setZoom, zoomStep]);

  // Handle pan start
  const handlePanStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (zoom <= 100) return;

      setIsPanning(true);
      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY =
        "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      panStartRef.current = { x: clientX, y: clientY };
      panStartPosRef.current = { ...pan };
    },
    [zoom, pan]
  );

  // Handle pan move
  const handlePanMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isPanning) return;

      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY =
        "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      const deltaX = clientX - panStartRef.current.x;
      const deltaY = clientY - panStartRef.current.y;

      setPan({
        x: panStartPosRef.current.x + deltaX,
        y: panStartPosRef.current.y + deltaY,
      });
    },
    [isPanning]
  );

  // Handle pan end
  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        resetZoom();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        zoomOut();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resetZoom, zoomIn, zoomOut]);

  const transform = {
    transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
    transformOrigin: "center center",
    cursor: zoom > 100 ? (isPanning ? "grabbing" : "grab") : "default",
  };

  return {
    zoom,
    pan,
    isPanning,
    setZoom,
    resetZoom,
    zoomIn,
    zoomOut,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    transform,
    canPan: zoom > 100,
  };
}

export default useZoomPan;
