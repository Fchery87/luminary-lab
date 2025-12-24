'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface CompareSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  aspectRatio?: string; // e.g., "aspect-[4/3]" or "aspect-video"
}

export function CompareSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Original",
  afterLabel = "Processed",
  className,
  aspectRatio = "aspect-[3/2]"
}: CompareSliderProps) {
  const [isResizing, setIsResizing] = React.useState(false);
  const [sliderPosition, setSliderPosition] = React.useState(50);
  const [isHovered, setIsHovered] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Handle drag/click interaction
  const handleMove = React.useCallback((event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!containerRef.current) return;

    const { left, width } = containerRef.current.getBoundingClientRect();
    let clientX;

    if ('touches' in event) {
      clientX = event.touches[0].clientX;
    } else {
      clientX = (event as MouseEvent).clientX;
    }

    const position = ((clientX - left) / width) * 100;
    setSliderPosition(Math.min(100, Math.max(0, position)));
  }, []);

  // Add global event listeners during drag
  React.useEffect(() => {
    const handleUp = () => setIsResizing(false);
    
    if (isResizing) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isResizing, handleMove]);

  // Handle keyboard interaction
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSliderPosition(prev => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      setSliderPosition(prev => Math.min(100, prev + 5));
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden select-none touch-none group rounded-sm border border-border shadow-2xl bg-black",
        aspectRatio,
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
        setIsResizing(true);
        handleMove(e);
      }}
      onTouchStart={(e) => {
        setIsResizing(true);
        handleMove(e);
      }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="slider"
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={sliderPosition}
      aria-label="Compare before and after images"
    >
      {/* Before Image (Background) - Shows on Right side (since clip reveals Left) */}
      {/* Standard pattern: Left is Before, Right is After. 
          Let's implement: Background = After, Foreground (Clipped) = Before ?
          Usually slider at 50%: Left half shows Before, Right half shows After. 
      */}
      
      {/* Layer 1: Right Image (After/Processed) - Full width, sitting at the back */}
      <div className="absolute inset-0 w-full h-full select-none">
        <Image
          src={afterImage}
          alt={afterLabel}
          fill
          priority
          className="object-cover object-center pointer-events-none"
          draggable={false}
        />
       
         {/* Label for After - Positioned Top Right */}
         <div className={cn(
             "absolute top-4 right-4 transition-opacity duration-300 pointer-events-none z-10",
             isResizing ? "opacity-0" : "opacity-100"
         )}>
             <Badge variant="secondary" className="bg-black/40 backdrop-blur-md border-white/10 text-white/90 shadow-sm">
                {afterLabel}
             </Badge>
         </div>
      </div>

      {/* Layer 2: Left Image (Before/Original) - Clipped */}
      <div 
        className="absolute inset-0 w-full h-full select-none overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <Image
          src={beforeImage}
          alt={beforeLabel}
          fill
          priority
          className="object-cover object-center pointer-events-none"
          draggable={false}
        />
        
        {/* Label for Before - Positioned Top Left */}
         <div className={cn(
             "absolute top-4 left-4 transition-opacity duration-300 pointer-events-none",
             isResizing ? "opacity-0" : "opacity-100"
         )}>
             <Badge variant="secondary" className="bg-black/40 backdrop-blur-md border-white/10 text-white/90 shadow-sm">
                {beforeLabel}
             </Badge>
         </div>
      </div>

      {/* Handle Line */}
      <div 
        className="absolute inset-y-0 w-0.5 bg-primary cursor-col-resize z-20 pointer-events-none shadow-[0_0_10px_2px_rgba(48,227,202,0.3)]"
        style={{ left: `${sliderPosition}%` }}
      >
        {/* Handle Grabber */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary/20 backdrop-blur-[2px] border border-primary/50 flex items-center justify-center shadow-lg">
             <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                 <GripVertical size={14} />
             </div>
        </div>
      </div>
      
      {/* Interactive Helper Text */}
      <AnimatePresence>
        {isHovered && !isResizing && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
            >
                {/* <span className="text-[10px] uppercase font-medium tracking-widest text-white/70 bg-black/40 px-2 py-1 rounded-sm backdrop-blur-md">
                    Drag to Compare
                </span> */}
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
