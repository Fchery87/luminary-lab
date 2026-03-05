"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Undo2,
  Redo2,
  RotateCcw,
  Wand2,
  SlidersHorizontal,
  ArrowRightLeft,
  Trash2,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export type HistoryAction =
  | "apply_style"
  | "adjust"
  | "reset"
  | "undo"
  | "redo"
  | "jump";

export interface HistoryEntry {
  id: string;
  imageId: string;
  action: HistoryAction;
  version?: number;
  styleName?: string;
  adjustments?: Record<string, number>;
  timestamp: Date;
  isCurrent?: boolean;
}

interface HistoryPanelProps {
  entries: HistoryEntry[];
  currentVersion?: number;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onJumpToVersion: (version: number) => void;
  onClearHistory: () => void;
  canUndo: boolean;
  canRedo: boolean;
  disabled?: boolean;
  className?: string;
}

const actionConfig: Record<
  HistoryAction,
  { label: string; icon: React.ElementType; color: string; description: (entry: HistoryEntry) => string }
> = {
  apply_style: {
    label: "Style Applied",
    icon: Wand2,
    color: "text-purple-400",
    description: (entry) => entry.styleName || "Unknown style",
  },
  adjust: {
    label: "Adjustments",
    icon: SlidersHorizontal,
    color: "text-amber-400",
    description: (entry) => {
      if (!entry.adjustments) return "Manual adjustments";
      const count = Object.values(entry.adjustments).filter((v) => v !== 0).length;
      return `${count} adjustment${count !== 1 ? "s" : ""}`;
    },
  },
  reset: {
    label: "Reset",
    icon: RotateCcw,
    color: "text-red-400",
    description: () => "Reset to original",
  },
  undo: {
    label: "Undo",
    icon: Undo2,
    color: "text-blue-400",
    description: (entry) => `Reverted to version ${entry.version || "?"}`,
  },
  redo: {
    label: "Redo",
    icon: Redo2,
    color: "text-green-400",
    description: (entry) => `Restored version ${entry.version || "?"}`,
  },
  jump: {
    label: "Jump",
    icon: ArrowRightLeft,
    color: "text-cyan-400",
    description: (entry) => `Jumped to version ${entry.version || "?"}`,
  },
};

function HistoryItem({
  entry,
  isCurrent,
  isActive,
  onClick,
  index,
}: {
  entry: HistoryEntry;
  isCurrent: boolean;
  isActive: boolean;
  onClick: () => void;
  index: number;
}) {
  const config = actionConfig[entry.action];
  const Icon = config.icon;

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 text-left rounded-sm transition-all group",
        isActive
          ? "bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/30"
          : "hover:bg-[hsl(var(--secondary))]/50 border border-transparent",
        isCurrent && "ring-1 ring-[hsl(var(--gold))]"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
          isActive ? "bg-[hsl(var(--gold))]/20" : "bg-[hsl(var(--secondary))]"
        )}
      >
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">{config.label}</span>
          {isCurrent && (
            <span className="text-[10px] font-medium text-[hsl(var(--gold))] uppercase tracking-wider">
              Current
            </span>
          )}
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
          {config.description(entry)}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Clock className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
            {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

export function HistoryPanel({
  entries,
  currentVersion,
  onUndo,
  onRedo,
  onReset,
  onJumpToVersion,
  onClearHistory,
  canUndo,
  canRedo,
  disabled = false,
  className,
}: HistoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleJumpToVersion = useCallback(
    (version: number) => {
      if (version !== currentVersion) {
        onJumpToVersion(version);
      }
    },
    [currentVersion, onJumpToVersion]
  );

  const handleClear = useCallback(() => {
    if (showConfirmClear) {
      onClearHistory();
      setShowConfirmClear(false);
    } else {
      setShowConfirmClear(true);
      setTimeout(() => setShowConfirmClear(false), 3000);
    }
  }, [showConfirmClear, onClearHistory]);

  const adjustmentEntries = entries.filter(
    (entry) => entry.action === "apply_style" || entry.action === "adjust"
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 font-display font-semibold text-sm hover:text-[hsl(var(--gold))] transition-colors"
        >
          History
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo || disabled}
            className="p-1.5 rounded-sm hover:bg-[hsl(var(--secondary))] disabled:opacity-30 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo || disabled}
            className="p-1.5 rounded-sm hover:bg-[hsl(var(--secondary))] disabled:opacity-30 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onReset}
            disabled={disabled}
            className="p-1.5 rounded-sm hover:bg-[hsl(var(--secondary))] text-red-400 disabled:opacity-30 transition-colors"
            title="Reset to Original"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {/* Version count */}
            <div className="flex items-center justify-between px-2 py-1.5 bg-[hsl(var(--secondary))]/30 rounded-sm">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {adjustmentEntries.length} edit
                {adjustmentEntries.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={handleClear}
                className={cn(
                  "flex items-center gap-1 text-xs transition-colors",
                  showConfirmClear
                    ? "text-red-400"
                    : "text-[hsl(var(--muted-foreground))] hover:text-red-400"
                )}
              >
                <Trash2 className="w-3 h-3" />
                {showConfirmClear ? "Confirm?" : "Clear"}
              </button>
            </div>

            {/* History list */}
            <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
              {entries.length === 0 ? (
                <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No edits yet</p>
                  <p className="text-xs mt-1">Make adjustments to see history</p>
                </div>
              ) : (
                entries.map((entry, index) => (
                  <HistoryItem
                    key={entry.id}
                    entry={entry}
                    isCurrent={typeof entry.version === 'number' && entry.version === currentVersion}
                    isActive={typeof entry.version === 'number' && entry.version === currentVersion}
                    onClick={() => {
                      if (typeof entry.version === 'number') {
                        handleJumpToVersion(entry.version);
                      }
                    }}
                    index={index}
                  />
                ))
              )}
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="flex items-center justify-center gap-3 pt-2 text-[10px] text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))]">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[hsl(var(--secondary))] rounded font-mono">Ctrl+Z</kbd>
                Undo
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[hsl(var(--secondary))] rounded font-mono">Ctrl+Y</kbd>
                Redo
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HistoryPanel;
