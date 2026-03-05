"use client";

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  ImageAdjustments,
  ImageEdit,
  EditHistoryEntry,
} from "@/lib/edit-manager";

export interface UseEditsOptions {
  imageId: string;
  enabled?: boolean;
}

export interface UseEditsReturn {
  // Data
  edits: ImageEdit[];
  currentEdit: ImageEdit | null;
  history: EditHistoryEntry[];
  isLoading: boolean;
  isError: boolean;

  // Actions
  createEdit: (adjustments: ImageAdjustments) => void;
  applyStyle: (styleId: string, intensity: number) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  jumpToVersion: (version: number) => void;

  // Status
  isCreating: boolean;
  isApplyingStyle: boolean;
  isUndoing: boolean;
  isRedoing: boolean;
  isResetting: boolean;
  isJumping: boolean;

  // Capabilities
  canUndo: boolean;
  canRedo: boolean;
  canReset: boolean;
}

export function useEdits({ imageId, enabled = true }: UseEditsOptions): UseEditsReturn {
  const queryClient = useQueryClient();

  // Fetch edits data
  const { data, isLoading, isError } = useQuery({
    queryKey: ["edits", imageId],
    queryFn: async () => {
      const res = await fetch(`/api/edits?imageId=${imageId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch edits");
      return res.json();
    },
    enabled: enabled && !!imageId,
  });

  const edits: ImageEdit[] = data?.edits || [];
  const currentEdit: ImageEdit | null = data?.currentEdit || null;
  const history: EditHistoryEntry[] = data?.history || [];

  // Create edit mutation
  const createEditMutation = useMutation({
    mutationFn: async (adjustments: ImageAdjustments) => {
      const res = await fetch("/api/edits", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, adjustments }),
      });
      if (!res.ok) throw new Error("Failed to create edit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edits", imageId] });
      toast.success("Adjustments applied");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to apply adjustments");
    },
  });

  // Apply style mutation
  const applyStyleMutation = useMutation({
    mutationFn: async ({ styleId, intensity }: { styleId: string; intensity: number }) => {
      const res = await fetch("/api/edits", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, styleId, intensity }),
      });
      if (!res.ok) throw new Error("Failed to apply style");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edits", imageId] });
      toast.success("Style applied");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to apply style");
    },
  });

  // Undo mutation
  const undoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/edits/undo", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to undo");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edits", imageId] });
      toast.success("Undo successful");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to undo");
    },
  });

  // Redo mutation
  const redoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/edits/redo", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to redo");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edits", imageId] });
      toast.success("Redo successful");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to redo");
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/edits/reset", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      if (!res.ok) throw new Error("Failed to reset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edits", imageId] });
      toast.success("Image reset to original");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reset");
    },
  });

  // Jump to version mutation
  const jumpMutation = useMutation({
    mutationFn: async (version: number) => {
      const res = await fetch("/api/edits/jump", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, version }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to jump to version");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["edits", imageId] });
      toast.success(`Jumped to version ${data.edit?.version || ""}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to jump to version");
    },
  });

  // Determine capabilities
  const canUndo = edits.some((e) => e.version < (currentEdit?.version || 0));
  const canRedo = edits.some((e) => e.version > (currentEdit?.version || 0));
  const canReset = edits.length > 0;

  return {
    // Data
    edits,
    currentEdit,
    history,
    isLoading,
    isError,

    // Actions
    createEdit: createEditMutation.mutate,
    applyStyle: useCallback(
      (styleId: string, intensity: number) => {
        applyStyleMutation.mutate({ styleId, intensity });
      },
      [applyStyleMutation]
    ),
    undo: undoMutation.mutate,
    redo: redoMutation.mutate,
    reset: resetMutation.mutate,
    jumpToVersion: jumpMutation.mutate,

    // Status
    isCreating: createEditMutation.isPending,
    isApplyingStyle: applyStyleMutation.isPending,
    isUndoing: undoMutation.isPending,
    isRedoing: redoMutation.isPending,
    isResetting: resetMutation.isPending,
    isJumping: jumpMutation.isPending,

    // Capabilities
    canUndo,
    canRedo,
    canReset,
  };
}

export default useEdits;
