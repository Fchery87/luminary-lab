import type { Metadata } from 'next';
import { Outfit, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import './globals.css';
import { Providers } from './providers';
import '@/lib/sentry';

const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap'
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700']
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500']
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
      <body className={`${outfit.variable} ${dmSans.variable} ${jetBrainsMono.variable} font-body bg-background text-foreground antialiased`}>
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
