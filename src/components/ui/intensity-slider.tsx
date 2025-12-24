'use client';

import * as React from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface IntensitySliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

export function IntensitySlider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled = false,
}: IntensitySliderProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div 
      className={cn("w-full space-y-3", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-foreground">
          Intensity
        </label>
        <AnimatePresence mode="wait">
          <motion.span
            key={value}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm font-bold text-primary"
          >
            {Math.round(value)}%
          </motion.span>
        </AnimatePresence>
      </div>
      
      <div className="relative group">
         {/* Custom glow effect behind the slider */}
        <div 
            className={cn(
                "absolute -inset-1 rounded-sm bg-gradient-to-r from-primary/20 to-primary/0 blur-md transition-opacity duration-300",
                isHovered ? "opacity-100" : "opacity-0"
            )}
            style={{
                width: `${(value / (max - min)) * 100}%`
            }}
        />
        
        <Slider
          value={[value]}
          onValueChange={(vals) => onValueChange(vals[0])}
          max={max}
          min={min}
          step={step}
          disabled={disabled}
          className="relative z-10 cursor-pointer"
        />
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>Subtle</span>
        <span>Balanced</span>
        <span>Strong</span>
      </div>
    </div>
  );
}
