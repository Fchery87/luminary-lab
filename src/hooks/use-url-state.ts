"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

type Primitive = string | number | boolean | undefined | null;

interface UseUrlStateOptions<T extends Record<string, Primitive>> {
  defaults: T;
  replace?: boolean;
}

export function useUrlState<T extends Record<string, Primitive>>({
  defaults,
  replace = true,
}: UseUrlStateOptions<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current URL state
  const state = useMemo(() => {
    const result = { ...defaults };
    
    Object.keys(defaults).forEach((key) => {
      const value = searchParams.get(key);
      if (value !== null) {
        const defaultValue = defaults[key];
        
        if (typeof defaultValue === "number") {
          const parsed = Number(value);
          if (!isNaN(parsed)) {
            (result as any)[key] = parsed;
          }
        } else if (typeof defaultValue === "boolean") {
          (result as any)[key] = value === "true";
        } else {
          (result as any)[key] = value as T[Extract<keyof T, string>];
        }
      }
    });
    
    return result;
  }, [searchParams, defaults]);

  // Update URL state
  const setState = useCallback(
    (updates: Partial<T>) => {
      const params = new URLSearchParams(searchParams);
      
      Object.entries(updates).forEach(([key, value]) => {
        const defaultValue = defaults[key];
        
        if (value === undefined || value === null || value === defaultValue) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;

      if (replace) {
        router.replace(url, { scroll: false });
      } else {
        router.push(url, { scroll: false });
      }
    },
    [router, pathname, searchParams, defaults, replace]
  );

  return [state, setState] as const;
}

// Helper hook for edit page state
export function useEditPageState() {
  return useUrlState({
    defaults: {
      preset: "",
      intensity: 70,
      category: "all",
    },
  });
}

// Helper hook for compare page state  
export function useComparePageState() {
  return useUrlState({
    defaults: {
      divider: 50,
      zoom: 100,
      view: "split", // "split" | "original" | "processed"
    },
  });
}

import { useMemo } from "react";
