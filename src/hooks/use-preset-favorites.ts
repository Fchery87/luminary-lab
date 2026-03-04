"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "luminary_preset_favorites";

export function usePresetFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse favorites:", e);
      }
    }
    setIsLoaded(true);
  }, []);

  const toggleFavorite = useCallback((presetId: string) => {
    setFavorites((prev) => {
      const newFavorites = prev.includes(presetId)
        ? prev.filter((id) => id !== presetId)
        : [...prev, presetId];
      
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
      }
      
      return newFavorites;
    });
  }, []);

  const addFavorite = useCallback((presetId: string) => {
    setFavorites((prev) => {
      if (prev.includes(presetId)) return prev;
      const newFavorites = [...prev, presetId];
      
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
      }
      
      return newFavorites;
    });
  }, []);

  const removeFavorite = useCallback((presetId: string) => {
    setFavorites((prev) => {
      const newFavorites = prev.filter((id) => id !== presetId);
      
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
      }
      
      return newFavorites;
    });
  }, []);

  const isFavorite = useCallback(
    (presetId: string) => favorites.includes(presetId),
    [favorites]
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    favorites,
    isLoaded,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    isFavorite,
    clearFavorites,
  };
}

// Hook for tracking recently used presets
const RECENT_STORAGE_KEY = "luminary_recent_presets";
const MAX_RECENT = 10;

export function useRecentPresets() {
  const [recentPresets, setRecentPresets] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const stored = localStorage.getItem(RECENT_STORAGE_KEY);
    if (stored) {
      try {
        setRecentPresets(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse recent presets:", e);
      }
    }
    setIsLoaded(true);
  }, []);

  const addRecentPreset = useCallback((presetId: string) => {
    setRecentPresets((prev) => {
      // Remove if already exists to move to front
      const filtered = prev.filter((id) => id !== presetId);
      // Add to front and limit to MAX_RECENT
      const newRecent = [presetId, ...filtered].slice(0, MAX_RECENT);
      
      if (typeof window !== "undefined") {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(newRecent));
      }
      
      return newRecent;
    });
  }, []);

  const removeRecentPreset = useCallback((presetId: string) => {
    setRecentPresets((prev) => {
      const newRecent = prev.filter((id) => id !== presetId);
      
      if (typeof window !== "undefined") {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(newRecent));
      }
      
      return newRecent;
    });
  }, []);

  const clearRecentPresets = useCallback(() => {
    setRecentPresets([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(RECENT_STORAGE_KEY);
    }
  }, []);

  const isRecent = useCallback(
    (presetId: string) => recentPresets.includes(presetId),
    [recentPresets]
  );

  return {
    recentPresets,
    isLoaded,
    addRecentPreset,
    removeRecentPreset,
    clearRecentPresets,
    isRecent,
  };
}

export default usePresetFavorites;
