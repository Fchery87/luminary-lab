'use client';

import { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Force dark mode - always apply dark class to avoid hydration mismatch
    document.documentElement.classList.add('dark');
  }, []);

  return <>{children}</>;
}
