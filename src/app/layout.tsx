import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import './globals.css';
import { Providers } from './providers';
import '@/lib/sentry';

const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Luminary Lab - Professional AI Photo Editing',
  description: 'AI-powered retouching and color grading for professional photographers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${outfit.className} font-display bg-background text-foreground antialiased`}>
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
