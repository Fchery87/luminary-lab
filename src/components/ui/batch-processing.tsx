"use client";

import React, { useState, useCallback, useEffect, forwardRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";
import { Layers, Loader2, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

// Inline Checkbox component
const Checkbox = forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

// Inline ScrollArea component
const ScrollArea = forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

interface Project {
  id: string;
  name: string;
  status: string;
  thumbnail?: string;
  createdAt: string;
}

interface BatchProcessingDialogProps {
  selectedPresetName: string;
  intensity: number;
  onBatchProcess: (projectIds: string[]) => Promise<void>;
  recentProjects?: Project[];
  className?: string;
  trigger?: React.ReactNode;
}

export function BatchProcessingDialog({
  selectedPresetName,
  intensity,
  onBatchProcess,
  recentProjects: propProjects,
  className,
  trigger,
}: BatchProcessingDialogProps) {
  // Fetch projects if not provided via props
  const [fetchedProjects, setFetchedProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  useEffect(() => {
    if (propProjects) return; // Use provided projects

    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const res = await fetch("/api/projects", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setFetchedProjects(data.projects || []);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [propProjects]);

  const recentProjects = propProjects || fetchedProjects;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleProject = useCallback((projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedProjects.length === recentProjects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(recentProjects.map((p) => p.id));
    }
  }, [recentProjects, selectedProjects.length]);

  const handleProcess = async () => {
    if (selectedProjects.length === 0) return;

    setIsProcessing(true);
    try {
      await onBatchProcess(selectedProjects);
      toast.success(`Started processing ${selectedProjects.length} images`);
      setIsOpen(false);
      setSelectedProjects([]);
    } catch (error) {
      toast.error("Failed to start batch processing");
    } finally {
      setIsProcessing(false);
    }
  };

  const validProjects = recentProjects.filter(
    (p) => p.status !== "processing" && p.status !== "queued"
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("gap-2", className)}>
          <Layers className="h-4 w-4" />
          Batch Process
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Batch Processing
          </DialogTitle>
          <DialogDescription>
            Apply{" "}
            <span className="font-medium text-foreground">
              {selectedPresetName || "selected preset"}
            </span>{" "}
            at {intensity}% intensity to multiple images
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Select All */}
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={
                  selectedProjects.length > 0 &&
                  selectedProjects.length === validProjects.length
                }
                onCheckedChange={handleSelectAll}
              />
              <span className="text-muted-foreground">
                {selectedProjects.length === validProjects.length
                  ? "Deselect all"
                  : "Select all"}
              </span>
            </label>
            <span className="text-xs text-muted-foreground">
              {selectedProjects.length} of {validProjects.length} selected
            </span>
          </div>

          {/* Project List */}
          <ScrollArea className="h-[400px] border rounded-lg">
            <div className="p-4 space-y-2">
              {validProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No available projects for batch processing</p>
                  <p className="text-xs mt-1">
                    Projects that are already processing cannot be selected.
                  </p>
                </div>
              ) : (
                validProjects.map((project) => (
                  <label
                    key={project.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedProjects.includes(project.id)
                        ? "bg-primary/5 border-primary/30"
                        : "hover:bg-muted/50 border-transparent"
                    )}
                  >
                    <Checkbox
                      checked={selectedProjects.includes(project.id)}
                      onCheckedChange={() => handleToggleProject(project.id)}
                    />

                    <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex-shrink-0">
                      {project.thumbnail ? (
                        <Image
                          src={project.thumbnail}
                          alt={project.name}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created{" "}
                        {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {selectedProjects.includes(project.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </label>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Action Button */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcess}
              disabled={selectedProjects.length === 0 || isProcessing}
              className="gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4" />
                  Process {selectedProjects.length} Image
                  {selectedProjects.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BatchProcessingDialog;
