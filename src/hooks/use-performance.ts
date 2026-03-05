"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;
}

export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): T {
  const inThrottle = useRef(false);

  return useCallback(
    (...args: Parameters<T>) => {
      if (!inThrottle.current) {
        callback(...args);
        inThrottle.current = true;
        setTimeout(() => {
          inThrottle.current = false;
        }, limit);
      }
    },
    [callback, limit]
  ) as T;
}

// Hook for intersection observer (lazy loading)
export function useInView(
  options?: IntersectionObserverInit
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.disconnect();
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [ref, isInView];
}

// Hook for image preload
export function useImagePreload(src: string): boolean {
  // Initialize based on src presence
  const [isLoaded, setIsLoaded] = useState(() => {
    if (!src) return false;
    // Check if image is already cached
    const img = new Image();
    img.src = src;
    return img.complete && img.naturalWidth > 0;
  });

  useEffect(() => {
    if (!src) {
      const timer = setTimeout(() => setIsLoaded(false), 0);
      return () => clearTimeout(timer);
    }

    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setIsLoaded(false);

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return isLoaded;
}

// Hook to measure performance
export function usePerformanceMark(markName: string) {
  useEffect(() => {
    if (typeof window !== "undefined" && window.performance) {
      performance.mark(`${markName}-start`);

      return () => {
        performance.mark(`${markName}-end`);
        performance.measure(
          markName,
          `${markName}-start`,
          `${markName}-end`
        );
      };
    }
  }, [markName]);
}

export default useDebounce;
