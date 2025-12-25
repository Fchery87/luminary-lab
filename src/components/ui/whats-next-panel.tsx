'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Download, Share2, Sliders, ArrowRight, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PresetQuickSelect, type Preset } from '@/components/ui/preset-quick-select';

interface WhatsNextPanelProps {
  onApplyPreset?: (preset: Preset) => void;
  onAdjustSettings?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  presets?: Preset[];
  popularPresets?: Preset[];
  recommendedPresetId?: string | null;
  selectedPresetId?: string | null;
  className?: string;
}

const actions = [
  {
    id: 'preset',
    title: 'Apply a Preset',
    description: 'Choose from our curated collection of professional styles',
    icon: Sparkles,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
  },
  {
    id: 'settings',
    title: 'Adjust Settings',
    description: 'Fine-tune intensity and other parameters',
    icon: Sliders,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30',
  },
  {
    id: 'download',
    title: 'Download',
    description: 'Export your masterpiece in high resolution',
    icon: Download,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/30',
  },
  {
    id: 'share',
    title: 'Share',
    description: 'Show off your work with the world',
    icon: Share2,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30',
  },
];

export function WhatsNextPanel({
  onApplyPreset,
  onAdjustSettings,
  onDownload,
  onShare,
  presets = [],
  popularPresets,
  recommendedPresetId,
  selectedPresetId,
  className,
}: WhatsNextPanelProps) {
  const [dismissed, setDismissed] = useState(false);
  const [showQuickPresets, setShowQuickPresets] = useState(true);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(
          "relative bg-gradient-to-br from-card to-card/50 border border-border/50 rounded-sm overflow-hidden",
          className
        )}
      >
        {/* Gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        
        {/* Glow effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 p-1 rounded-sm hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Dismiss panel"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 rounded-sm bg-primary/10 border border-primary/30">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground mb-1">
                What&apos;s Next?
              </h3>
              <p className="text-sm text-muted-foreground">
                Your image is ready! Here are some quick actions to get you started.
              </p>
            </div>
          </div>

          {/* Quick Preset Selection */}
          {showQuickPresets && presets.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-px h-4 bg-border" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Quick Start
                  </span>
                </div>
                {popularPresets && (
                  <button
                    onClick={() => setShowQuickPresets(false)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    Collapse <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
              <PresetQuickSelect
                presets={presets}
                popularPresets={popularPresets}
                selectedPresetId={selectedPresetId || null}
                onSelect={(preset) => {
                  onApplyPreset?.(preset);
                  setShowQuickPresets(false);
                }}
                recommendedPresetId={recommendedPresetId}
              />
            </div>
          )}

          {/* Action Cards */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-px h-4 bg-border" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Actions
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.id}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      switch (action.id) {
                        case 'settings':
                          onAdjustSettings?.();
                          break;
                        case 'download':
                          onDownload?.();
                          break;
                        case 'share':
                          onShare?.();
                          break;
                        case 'preset':
                          setShowQuickPresets(!showQuickPresets);
                          break;
                      }
                    }}
                    className={cn(
                      "group relative p-3 rounded-sm border text-left transition-all duration-200",
                      action.borderColor,
                      action.bgColor,
                      "hover:shadow-md"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("flex-shrink-0 p-1.5 rounded-sm bg-background/50", action.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {action.title}
                          </p>
                          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
