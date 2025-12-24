import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const LoadingSkeleton = React.forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'animate-pulse rounded-sm bg-muted',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
LoadingSkeleton.displayName = 'LoadingSkeleton';

const SkeletonCard = React.forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  ({ className, ...props }, ref) => (
    <LoadingSkeleton
      ref={ref}
      className={cn('h-32 w-full', className)}
      {...props}
    />
  )
);
SkeletonCard.displayName = 'SkeletonCard';

const SkeletonAvatar = React.forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  ({ className, ...props }, ref) => (
    <LoadingSkeleton
      ref={ref}
      className={cn('h-10 w-10 rounded-full', className)}
      {...props}
    />
  )
);
SkeletonAvatar.displayName = 'SkeletonAvatar';

const SkeletonText = React.forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  ({ className, ...props }, ref) => (
    <LoadingSkeleton
      ref={ref}
      className={cn('h-4 w-full', className)}
      {...props}
    />
  )
);
SkeletonText.displayName = 'SkeletonText';

export { LoadingSkeleton, SkeletonCard, SkeletonAvatar, SkeletonText };
