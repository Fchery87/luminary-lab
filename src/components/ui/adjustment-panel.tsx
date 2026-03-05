"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdjustmentValue {
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export interface AdjustmentsState {
  exposure: AdjustmentValue; // -5 to +5 stops
  contrast: AdjustmentValue; // -100 to +100
  highlights: AdjustmentValue; // -100 to +100
  shadows: AdjustmentValue; // -100 to +100
  whites: AdjustmentValue; // -100 to +100
  blacks: AdjustmentValue; // -100 to +100
  clarity: AdjustmentValue; // -100 to +100
  texture: AdjustmentValue; // -100 to +100
  dehaze: AdjustmentValue; // -100 to +100
  saturation: AdjustmentValue; // -100 to +100
  vibrance: AdjustmentValue; // -100 to +100
  temperature: AdjustmentValue; // -100 to +100
  tint: AdjustmentValue; // -100 to +100
}

export const DEFAULT_ADJUSTMENTS: AdjustmentsState = {
  exposure: { value: 0, defaultValue: 0, min: -5, max: 5, step: 0.1, unit: "EV" },
  contrast: { value: 0, defaultValue: 0, min: -100, max: 100, step: 1 },
  highlights: { value: 0, defaultValue: 0, min: -100, max: 100, step: 1 },
  shadows: { value: 0, defaultValue: 0, min: -100, max: 100, step: 1 },
  whites: { value: 0, defaultValue: 0, min: -100, max: 100, step: 1 },
  blacks: { value: 0, defaultValue: 0, min: -100, max: 100, step: 1 },
  clarity: { value: 0, defaultValue: 0, min: -100, max: 100, step: 1 },
  texture: { value: 0, defaultValue: 0, min: -100, max: 100, step: 1 },
  dehaze: { value: 0, defaultValue: 0, min: -100, max: 100, step: 1 },
  saturation: { value: 0, defaultValue: 0, min: -100, max: 100, step: 1 },
  vibrance: { value: 0, defaultValue: 0, min: -100, max: 100, step: 1 },
  temperature: { value: 0, defaultValue: 0, min: -100, max: 100, step: 1 },
  tint: { value: 0, defaultValue: 0, min: -100, max: 100, step: 1 },
};

interface AdjustmentSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  onChange: (value: number) => void;
  onReset: () => void;
  disabled?: boolean;
}

function AdjustmentSlider({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  unit,
  onChange,
  onReset,
  disabled = false,
}: AdjustmentSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const percentage = ((value - min) / (max - min)) * 100;
  const isModified = value !== defaultValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  const formatValue = (val: number) => {
    if (unit === "EV") {
      return val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
    }
    return val > 0 ? `+${Math.round(val)}` : Math.round(val).toString();
  };

  return (
    <div className={cn("space-y-1", disabled && "opacity-50")}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              isModified ? "text-[hsl(var(--gold))]" : "text-[hsl(var(--muted-foreground))]"
            )}
          >
            {formatValue(value)}
            {unit && unit !== "EV" && <span className="ml-0.5">{unit}</span>}
          </span>
          <button
            onClick={onReset}
            disabled={!isModified || disabled}
            className="p-0.5 rounded hover:bg-[hsl(var(--secondary))] disabled:opacity-30 transition-colors"
            title="Reset to default"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="relative h-5 flex items-center">
        {/* Background track */}
        <div className="absolute inset-x-0 h-1 bg-[hsl(var(--secondary))] rounded-full overflow-hidden">
          {/* Center line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-[hsl(var(--muted-foreground))]/30"
            style={{ left: `${((0 - min) / (max - min)) * 100}%` }}
          />
          {/* Fill */}
          <motion.div
            className="absolute top-0 bottom-0 bg-[hsl(var(--gold))]"
            style={{ width: `${percentage}%` }}
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        {/* Slider input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          disabled={disabled}
          className={cn(
            "absolute inset-0 w-full h-full opacity-0 cursor-pointer",
            disabled && "cursor-not-allowed"
          )}
        />
        {/* Thumb */}
        <motion.div
          className={cn(
            "absolute w-3 h-3 bg-[hsl(var(--gold))] rounded-full shadow-md pointer-events-none",
            isDragging && "scale-125"
          )}
          style={{ left: `calc(${percentage}% - 6px)` }}
          initial={false}
          animate={{ left: `calc(${percentage}% - 6px)` }}
          transition={{ duration: 0.1 }}
        />
      </div>
    </div>
  );
}

interface AdjustmentPanelProps {
  adjustments: AdjustmentsState;
  onAdjustmentsChange: (adjustments: AdjustmentsState) => void;
  onApply: () => void;
  disabled?: boolean;
  className?: string;
}

export function AdjustmentPanel({
  adjustments,
  onAdjustmentsChange,
  onApply,
  disabled = false,
  className,
}: AdjustmentPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    tone: true,
    presence: false,
    color: false,
  });

  const updateAdjustment = useCallback(
    (key: keyof AdjustmentsState, value: number) => {
      onAdjustmentsChange({
        ...adjustments,
        [key]: {
          ...adjustments[key],
          value,
        },
      });
    },
    [adjustments, onAdjustmentsChange]
  );

  const resetAdjustment = useCallback(
    (key: keyof AdjustmentsState) => {
      onAdjustmentsChange({
        ...adjustments,
        [key]: {
          ...adjustments[key],
          value: adjustments[key].defaultValue,
        },
      });
    },
    [adjustments, onAdjustmentsChange]
  );

  const resetAll = useCallback(() => {
    const resetAdjustments = { ...adjustments };
    (Object.keys(resetAdjustments) as Array<keyof AdjustmentsState>).forEach((key) => {
      resetAdjustments[key] = {
        ...resetAdjustments[key],
        value: resetAdjustments[key].defaultValue,
      };
    });
    onAdjustmentsChange(resetAdjustments);
  }, [adjustments, onAdjustmentsChange]);

  const hasModifications = Object.values(adjustments).some(
    (adj) => adj.value !== adj.defaultValue
  );

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const adjustmentGroups = [
    {
      id: "tone",
      label: "Tone",
      icon: "◐",
      controls: [
        { key: "exposure", label: "Exposure" },
        { key: "contrast", label: "Contrast" },
        { key: "highlights", label: "Highlights" },
        { key: "shadows", label: "Shadows" },
        { key: "whites", label: "Whites" },
        { key: "blacks", label: "Blacks" },
      ],
    },
    {
      id: "presence",
      label: "Presence",
      icon: "✦",
      controls: [
        { key: "clarity", label: "Clarity" },
        { key: "texture", label: "Texture" },
        { key: "dehaze", label: "Dehaze" },
      ],
    },
    {
      id: "color",
      label: "Color",
      icon: "◐",
      controls: [
        { key: "saturation", label: "Saturation" },
        { key: "vibrance", label: "Vibrance" },
        { key: "temperature", label: "Temperature" },
        { key: "tint", label: "Tint" },
      ],
    },
  ] as const;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm">Adjustments</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={resetAll}
            disabled={!hasModifications || disabled}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-50 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset All
          </button>
          <button
            onClick={onApply}
            disabled={!hasModifications || disabled}
            className="px-3 py-1.5 bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] text-xs font-medium rounded-sm hover:bg-[hsl(var(--gold))]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Adjustment Groups */}
      <div className="space-y-1">
        {adjustmentGroups.map((group) => (
          <div
            key={group.id}
            className="border border-[hsl(var(--border))] rounded-sm overflow-hidden"
          >
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center justify-between px-3 py-2 bg-[hsl(var(--secondary))]/30 hover:bg-[hsl(var(--secondary))]/50 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="text-[hsl(var(--muted-foreground))]">{group.icon}</span>
                {group.label}
              </span>
              {expandedGroups[group.id] ? (
                <ChevronUp className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              )}
            </button>
            {expandedGroups[group.id] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-3 space-y-3"
              >
                {group.controls.map((control) => {
                  const adj = adjustments[control.key as keyof AdjustmentsState];
                  return (
                    <AdjustmentSlider
                      key={control.key}
                      label={control.label}
                      value={adj.value}
                      min={adj.min}
                      max={adj.max}
                      step={adj.step}
                      defaultValue={adj.defaultValue}
                      unit={adj.unit}
                      onChange={(value) =>
                        updateAdjustment(control.key as keyof AdjustmentsState, value)
                      }
                      onReset={() => resetAdjustment(control.key as keyof AdjustmentsState)}
                      disabled={disabled}
                    />
                  );
                })}
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Before/After Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--border))]">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          Press Space to compare
        </span>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
            <Eye className="w-3 h-3" />
            Before
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1 text-xs text-[hsl(var(--gold))]">
            <EyeOff className="w-3 h-3" />
            After
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdjustmentPanel;
