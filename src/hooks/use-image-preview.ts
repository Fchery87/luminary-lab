'use client';

import { useState, useCallback, useMemo, useRef } from 'react';

export interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  clarity: number;
  exposure: number;
}

export interface UseImagePreviewOptions {
  previewImageUrl: string;
  initialSettings?: Partial<FilterSettings>;
  onFilterChange?: (settings: FilterSettings) => void;
}

const DEFAULT_SETTINGS: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  clarity: 0,
  exposure: 0,
};

export function useImagePreview({
  previewImageUrl,
  initialSettings,
  onFilterChange,
}: UseImagePreviewOptions) {
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // History tracking for undo functionality
  const historyRef = useRef<FilterSettings[]>([{ ...DEFAULT_SETTINGS, ...initialSettings }]);
  const historyIndexRef = useRef(0);
  const MAX_HISTORY = 20;

  const previewStyle = useMemo(() => {
    const filters: string[] = [];
    
    if (filterSettings.brightness !== 100) {
      filters.push(`brightness(${filterSettings.brightness}%)`);
    }
    
    if (filterSettings.contrast !== 100) {
      filters.push(`contrast(${filterSettings.contrast}%)`);
    }
    
    if (filterSettings.saturation !== 100) {
      filters.push(`saturate(${filterSettings.saturation}%)`);
    }
    
    if (filterSettings.exposure !== 0) {
      const exposureAdjust = 100 + filterSettings.exposure;
      filters.push(`brightness(${exposureAdjust}%)`);
    }
    
    if (filterSettings.warmth !== 0) {
      if (filterSettings.warmth > 0) {
        filters.push(`sepia(${filterSettings.warmth}%)`);
        filters.push(`hue-rotate(${filterSettings.warmth * 0.15}deg)`);
      } else {
        filters.push(`hue-rotate(${Math.abs(filterSettings.warmth) * 0.2}deg)`);
        filters.push(`saturate(${100 - Math.abs(filterSettings.warmth) * 0.3}%)`);
      }
    }

    return {
      filter: filters.length > 0 ? filters.join(' ') : 'none',
    };
  }, [filterSettings]);

  const addToHistory = useCallback((settings: FilterSettings) => {
    // Remove any future history if we're not at the end
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }
    // Add new state
    historyRef.current.push({ ...settings });
    // Keep only last MAX_HISTORY states
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
  }, []);

  const updateFilter = useCallback((key: keyof FilterSettings, value: number) => {
    setFilterSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      addToHistory(newSettings);
      onFilterChange?.(newSettings);
      return newSettings;
    });
  }, [onFilterChange, addToHistory]);

  const updateMultipleFilters = useCallback((updates: Partial<FilterSettings>) => {
    setFilterSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      addToHistory(newSettings);
      onFilterChange?.(newSettings);
      return newSettings;
    });
  }, [onFilterChange, addToHistory]);

  const resetFilters = useCallback(() => {
    setFilterSettings(DEFAULT_SETTINGS);
    addToHistory(DEFAULT_SETTINGS);
    onFilterChange?.(DEFAULT_SETTINGS);
  }, [onFilterChange, addToHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const previousSettings = historyRef.current[historyIndexRef.current];
      setFilterSettings(previousSettings);
      onFilterChange?.(previousSettings);
      return true;
    }
    return false;
  }, [onFilterChange]);

  const canUndo = historyIndexRef.current > 0;

  const applyPreset = useCallback((preset: FilterSettings) => {
    setFilterSettings(preset);
    addToHistory(preset);
    onFilterChange?.(preset);
  }, [onFilterChange, addToHistory]);

  return {
    filterSettings,
    previewStyle,
    isProcessing,
    updateFilter,
    updateMultipleFilters,
    resetFilters,
    undo,
    canUndo,
    applyPreset,
    setIsProcessing,
  };
}
