import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, Circle, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export interface ProcessingStage {
  id: string;
  label: string;
  status: "pending" | "active" | "completed" | "error";
  progress: number;
}

interface ProcessingIndicatorProps {
  isOpen: boolean;
  onClose?: () => void;
  overallProgress: number;
  estimatedTimeRemaining?: string;
  stages: ProcessingStage[];
  title?: string;
  description?: string;
}

export function ProcessingIndicator({
  isOpen,
  onClose,
  overallProgress,
  estimatedTimeRemaining,
  stages,
  title = "Processing your image...",
  description,
}: ProcessingIndicatorProps) {
  const getStageIcon = (status: ProcessingStage["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "active":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "error":
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground/50" />;
    }
  };

  const getStageTextColor = (status: ProcessingStage["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-600 dark:text-green-400";
      case "active":
        return "text-foreground font-medium";
      case "error":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="bg-background rounded-xl shadow-2xl border max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{title}</h3>
                    {description && (
                      <p className="text-sm text-muted-foreground">{description}</p>
                    )}
                  </div>
                </div>
                <span className="text-2xl font-bold tabular-nums">
                  {Math.round(overallProgress)}%
                </span>
              </div>

              {/* Main Progress Bar */}
              <div className="mt-4">
                <Progress value={overallProgress} className="h-2" />
              </div>

              {estimatedTimeRemaining && (
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  {estimatedTimeRemaining} remaining
                </p>
              )}
            </div>

            {/* Stages */}
            <div className="p-6 space-y-3">
              {stages.map((stage, index) => (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-shrink-0 w-5">
                    {getStageIcon(stage.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${getStageTextColor(stage.status)}`}>
                        {stage.label}
                      </span>
                      {stage.status === "active" && stage.progress > 0 && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {stage.progress}%
                        </span>
                      )}
                    </div>
                    {stage.status === "active" && stage.progress > 0 && (
                      <Progress value={stage.progress} className="h-1 mt-1.5" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            {onClose && overallProgress >= 100 && (
              <div className="p-4 border-t bg-muted/30 flex justify-end">
                <Button onClick={onClose} size="sm">
                  Done
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for managing processing state
export function useProcessingIndicator() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [overallProgress, setOverallProgress] = React.useState(0);
  const [stages, setStages] = React.useState<ProcessingStage[]>([]);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = React.useState<string>();

  const startProcessing = React.useCallback((initialStages: ProcessingStage[]) => {
    setStages(initialStages);
    setOverallProgress(0);
    setIsOpen(true);
  }, []);

  const updateStage = React.useCallback((
    stageId: string,
    updates: Partial<ProcessingStage>
  ) => {
    setStages((prev) => {
      const newStages = prev.map((stage) =>
        stage.id === stageId ? { ...stage, ...updates } : stage
      );
      
      // Calculate overall progress
      const completedStages = newStages.filter((s) => s.status === "completed").length;
      const activeStage = newStages.find((s) => s.status === "active");
      const activeProgress = activeStage ? activeStage.progress / 100 : 0;
      const progressPerStage = 100 / newStages.length;
      
      const overall =
        completedStages * progressPerStage +
        (activeStage ? activeProgress * progressPerStage : 0);
      
      setOverallProgress(Math.min(100, overall));
      
      return newStages;
    });
  }, []);

  const completeProcessing = React.useCallback(() => {
    setOverallProgress(100);
    setStages((prev) =>
      prev.map((stage) => ({ ...stage, status: "completed", progress: 100 }))
    );
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    overallProgress,
    stages,
    estimatedTimeRemaining,
    setEstimatedTimeRemaining,
    startProcessing,
    updateStage,
    completeProcessing,
    close,
  };
}
