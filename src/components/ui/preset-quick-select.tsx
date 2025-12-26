'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Preset {
  id: string;
  name: string;
  description: string;
  exampleImageUrl: string;
  category?: string;
  blendingParams?: Record<string, any>;
}

interface PresetQuickSelectProps {
  presets: Preset[];
  popularPresets?: Preset[];
  selectedPresetId: string | null;
  onSelect: (preset: Preset) => void;
  className?: string;
  recommendedPresetId?: string | null;
}

export function PresetQuickSelect({
  presets,
  popularPresets,
  selectedPresetId,
  onSelect,
  className,
  recommendedPresetId,
}: PresetQuickSelectProps) {
  // Use popular presets if provided, otherwise take first 3-4 presets
  const quickPresets = popularPresets || presets.slice(0, 4);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Quick Presets
        </label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AnimatePresence>
          {quickPresets.map((preset) => {
            const isRecommended = preset.id === recommendedPresetId;
            const isSelected = selectedPresetId === preset.id;

            return (
              <motion.button
                key={preset.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => onSelect(preset)}
                className={cn(
                  "group relative aspect-[4/3] rounded-sm overflow-hidden border transition-all duration-200",
                  isSelected
                    ? "border-primary ring-2 ring-primary/30 shadow-lg"
                    : "border-border hover:border-primary/50 hover:shadow-md",
                  isRecommended && !isSelected && "ring-2 ring-amber-500/50"
                )}
              >
                {/* Thumbnail */}
                 <div className="relative h-full w-full">
                   <Image
                     src={preset.exampleImageUrl}
                     alt={preset.name}
                     fill
                     sizes="(max-width: 640px) 50vw, 25vw"
                     className="object-cover transition-transform duration-300 group-hover:scale-105"
                   />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                  
                  {/* Recommended Badge (Gold) */}
                  {isRecommended && (
                    <div className="absolute top-2 left-2 bg-amber-500/90 backdrop-blur-sm px-2 py-1 rounded-sm border border-amber-400/30 shadow-lg">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Recommended
                      </span>
                    </div>
                  )}

                  {/* Selected Checkmark */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-sm p-1 border border-primary/30 shadow-lg">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Preset Name */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs font-semibold text-white text-center drop-shadow-md line-clamp-1">
                      {preset.name}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
