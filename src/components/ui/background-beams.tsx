'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const BackgroundBeams = ({ className }: { className?: string }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        'absolute inset-0 z-0 flex h-full w-full flex-col items-center justify-center overflow-hidden bg-background',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.85)_100%)]" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_60%,transparent_100%)] opacity-20" />

      {/* Moving Beams */}
      <div className="absolute inset-0 z-10 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#fff_100%,transparent_100%)]">
        {/* Beam 1 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, x: -100, y: -100, rotate: 45 }}
          animate={
            shouldReduceMotion
              ? { opacity: 0.35, scale: 1, x: 0, y: 0 }
              : { opacity: [0, 1, 0], scale: 1.5, x: 400, y: 400 }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 7, repeat: Infinity, ease: 'linear', delay: 0 }
          }
          className="absolute left-[20%] top-[0%] h-40 w-[2px] bg-gradient-to-b from-transparent via-primary to-transparent blur-sm"
        />
        {/* Beam 2 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, x: 200, y: -200, rotate: -45 }}
          animate={
            shouldReduceMotion
              ? { opacity: 0.35, scale: 1, x: 0, y: 0 }
              : { opacity: [0, 1, 0], scale: 1.5, x: -300, y: 300 }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 8, repeat: Infinity, ease: 'linear', delay: 2 }
          }
          className="absolute right-[20%] top-[0%] h-56 w-[2px] bg-gradient-to-b from-transparent via-primary to-transparent blur-sm"
        />
         {/* Beam 3 (Horizontal) */}
         <motion.div
          initial={{ opacity: 0, x: -500, y: -100, rotate: 90 }}
          animate={
            shouldReduceMotion
              ? { opacity: 0.25, x: 0, y: 0 }
              : { opacity: [0, 0.5, 0], x: 500, y: -100 }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 10, repeat: Infinity, ease: 'linear', delay: 4 }
          }
          className="absolute left-[50%] top-[30%] h-[1px] w-96 bg-gradient-to-r from-transparent via-primary/50 to-transparent blur-[1px]"
        />
      </div>
    </div>
  );
};
