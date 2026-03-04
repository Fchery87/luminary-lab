"use client";

import { useState, useEffect, useCallback } from "react";

export interface ExportPreset {
  id: string;
  name: string;
  format: "jpg" | "tiff" | "png";
  quality: number;
  colorSpace: string;
  bitDepth: 8 | 16;
  resize?: {
    width?: number;
    height?: number;
    maintainAspectRatio?: boolean;
  };
  metadata?: {
    keepExif?: boolean;
    keepXmp?: boolean;
    keepIptc?: boolean;
  };
  sharpening?: {
    amount: number;
    radius: number;
    detail: number;
  };
  watermark?: {
    enabled: boolean;
    text?: string;
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
    opacity?: number;
    size?: number;
  };
  createdAt: string;
}

const STORAGE_KEY = "luminary_export_presets";

export const DEFAULT_EXPORT_PRESETS: ExportPreset[] = [
  {
    id: "web-optimized",
    name: "Web Optimized",
    format: "jpg",
    quality: 85,
    colorSpace: "sRGB",
    bitDepth: 8,
    resize: { width: 2048, maintainAspectRatio: true },
    metadata: { keepExif: false, keepXmp: false, keepIptc: false },
    sharpening: { amount: 25, radius: 1, detail: 25 },
    createdAt: new Date().toISOString(),
  },
  {
    id: "print-ready",
    name: "Print Ready",
    format: "tiff",
    quality: 100,
    colorSpace: "Adobe RGB",
    bitDepth: 16,
    metadata: { keepExif: true, keepXmp: true, keepIptc: true },
    sharpening: { amount: 0, radius: 1, detail: 25 },
    createdAt: new Date().toISOString(),
  },
  {
    id: "archive",
    name: "Archive (Lossless)",
    format: "png",
    quality: 100,
    colorSpace: "sRGB",
    bitDepth: 16,
    metadata: { keepExif: true, keepXmp: true, keepIptc: true },
    sharpening: { amount: 0, radius: 1, detail: 25 },
    createdAt: new Date().toISOString(),
  },
];

export function useExportPresets() {
  const [presets, setPresets] = useState<ExportPreset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load presets from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPresets(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse export presets:", e);
        setPresets(DEFAULT_EXPORT_PRESETS);
      }
    } else {
      // Initialize with defaults
      setPresets(DEFAULT_EXPORT_PRESETS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EXPORT_PRESETS));
    }
    setIsLoaded(true);
  }, []);

  const savePreset = useCallback((preset: ExportPreset) => {
    setPresets((prev) => {
      const exists = prev.find((p) => p.id === preset.id);
      let newPresets: ExportPreset[];
      
      if (exists) {
        // Update existing
        newPresets = prev.map((p) => (p.id === preset.id ? preset : p));
      } else {
        // Add new
        newPresets = [...prev, preset];
      }
      
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
      }
      
      return newPresets;
    });
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => {
      const newPresets = prev.filter((p) => p.id !== id);
      
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
      }
      
      return newPresets;
    });
  }, []);

  const duplicatePreset = useCallback((preset: ExportPreset) => {
    const newPreset: ExportPreset = {
      ...preset,
      id: `${preset.id}-copy-${Date.now()}`,
      name: `${preset.name} (Copy)`,
      createdAt: new Date().toISOString(),
    };
    
    setPresets((prev) => {
      const newPresets = [...prev, newPreset];
      
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
      }
      
      return newPresets;
    });
    
    return newPreset;
  }, []);

  const resetToDefaults = useCallback(() => {
    setPresets(DEFAULT_EXPORT_PRESETS);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EXPORT_PRESETS));
    }
  }, []);

  const createPreset = useCallback((
    name: string,
    settings: Partial<ExportPreset>
  ): ExportPreset => {
    const newPreset: ExportPreset = {
      id: `custom-${Date.now()}`,
      name,
      format: "jpg",
      quality: 90,
      colorSpace: "sRGB",
      bitDepth: 8,
      ...settings,
      createdAt: new Date().toISOString(),
    };
    
    savePreset(newPreset);
    return newPreset;
  }, [savePreset]);

  return {
    presets,
    isLoaded,
    savePreset,
    deletePreset,
    duplicatePreset,
    resetToDefaults,
    createPreset,
    defaultPresets: DEFAULT_EXPORT_PRESETS,
  };
}

export default useExportPresets;
