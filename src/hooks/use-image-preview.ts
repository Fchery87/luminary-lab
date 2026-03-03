'use client';

import { useState, useCallback, useMemo } from 'react';

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

  const updateFilter = useCallback((key: keyof FilterSettings, value: number) => {
    setFilterSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      onFilterChange?.(newSettings);
      return newSettings;
    });
  }, [onFilterChange]);

  const updateMultipleFilters = useCallback((updates: Partial<FilterSettings>) => {
    setFilterSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      onFilterChange?.(newSettings);
      return newSettings;
    });
  }, [onFilterChange]);

  const resetFilters = useCallback(() => {
    setFilterSettings(DEFAULT_SETTINGS);
    onFilterChange?.(DEFAULT_SETTINGS);
  }, [onFilterChange]);

  const applyPreset = useCallback((preset: FilterSettings) => {
    setFilterSettings(preset);
    onFilterChange?.(preset);
  }, [onFilterChange]);

  return {
    filterSettings,
    previewStyle,
    isProcessing,
    updateFilter,
    updateMultipleFilters,
    resetFilters,
    applyPreset,
    setIsProcessing,
  };
}
