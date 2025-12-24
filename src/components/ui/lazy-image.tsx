'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage = React.forwardRef<HTMLImageElement, LazyImageProps>(
  ({ 
    className, 
    src, 
    alt, 
    fallback, 
    onLoad, 
    onError, 
    ...props 
  }, ref) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        {
          threshold: 0.1,
        }
      );

      if (imageRef.current) {
        observer.observe(imageRef.current);
      }

      return () => {
        observer.disconnect();
      };
    }, []);

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      setIsLoaded(true);
      onLoad?.();
    };

    const handleError = () => {
      setHasError(true);
      onError?.();
    };

    return (
      <div 
        className={cn(
          'relative overflow-hidden',
          !isLoaded && !hasError && 'bg-muted animate-pulse',
          className
        )}
        ref={imageRef}
      >
        {isInView && (
          <img
            ref={ref}
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              'transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
            loading="lazy"
            {...props}
          />
        )}
        
        {!isLoaded && !hasError && fallback && (
          <div className="absolute inset-0 flex items-center justify-center">
            {fallback}
          </div>
        )}
        
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <span className="text-sm">Failed to load image</span>
          </div>
        )}
      </div>
    );
  }
);
LazyImage.displayName = 'LazyImage';

export { LazyImage };
