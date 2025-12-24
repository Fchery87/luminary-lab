'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface Preset {
  id: string;
  name: string;
  description: string;
  exampleImageUrl: string;
  blendingParams?: Record<string, any>;
}

interface PresetGalleryProps {
  presets: Preset[];
  selectedPresetId: string | null;
  onSelect: (preset: Preset) => void;
  className?: string;
}

export function PresetGallery({
  presets,
  selectedPresetId,
  onSelect,
  className
}: PresetGalleryProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4", className)}>
      <AnimatePresence>
        {presets.map((preset) => (
          <motion.div
            key={preset.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "group relative overflow-hidden rounded-sm border transition-colors cursor-pointer bg-background",
              selectedPresetId === preset.id
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/40"
            )}
            onClick={() => onSelect(preset)}
          >
            {/* Image Container */}
            <div className="aspect-[4/3] w-full overflow-hidden relative">
              <Image
                src={preset.exampleImageUrl}
                alt={preset.name}
                fill
                className="object-cover opacity-95 transition-opacity duration-200 group-hover:opacity-100"
              />
              
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

              {/* Selected Indicator */}
              {selectedPresetId === preset.id && (
                <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-sm p-1 border border-primary/20">
                  <Check className="h-4 w-4" />
                </div>
              )}

              {/* Centered Action (Visible on Hover) */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Badge variant="secondary" className="px-3 py-1.5 backdrop-blur-md bg-white/20 hover:bg-white/30 text-white border-white/20">
                    {selectedPresetId === preset.id ? "Selected" : "Select Preset"}
                </Badge>
              </div>
            </div>

            {/* Content */}
            <div className={cn(
                "p-4 absolute bottom-0 left-0 right-0 transform transition-transform duration-300",
                "translate-y-2 group-hover:translate-y-0"
            )}>
              <h3 className="font-semibold text-lg text-white mb-1 shadow-black/50 drop-shadow-sm">
                {preset.name}
              </h3>
              <p className="text-sm text-gray-200 line-clamp-2 shadow-black/50 drop-shadow-sm opacity-90 group-hover:opacity-100">
                {preset.description}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
