'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TextShimmerProps {
  children: React.ReactNode;
  className?: string;
  shimmerColor?: string;
}

export function TextShimmer({
  children,
  className,
  shimmerColor = '#ffffff', // Default white shimmer
}: TextShimmerProps) {
  return (
    <span
      className={cn(
        'animate-text-shimmer bg-clip-text text-transparent bg-[linear-gradient(110deg,currentColor_45%,var(--shimmer-color)_50%,currentColor_55%)] bg-[length:250%_100%]',
        className
      )}
      style={{
        '--shimmer-color': shimmerColor,
      } as React.CSSProperties}
    >
      {children}
    </span>
  );
}
