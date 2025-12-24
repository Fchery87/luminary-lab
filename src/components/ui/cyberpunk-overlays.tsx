import { cn } from '@/lib/utils';

export function CyberpunkOverlays({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 z-30', className)}>
      <div className="absolute inset-0 neon-noise opacity-[0.06] mix-blend-overlay" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(48,227,202,0.10),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,43,214,0.07),transparent_55%)]" />

      <div className="absolute left-0 right-0 top-0 h-[35%] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55),transparent)]" />
      <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-[linear-gradient(to_top,rgba(0,0,0,0.65),transparent)]" />

      <div className="absolute -inset-x-20 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(48,227,202,0.75),transparent)] blur-sm opacity-70" />
      <div className="absolute -inset-x-20 top-[12%] h-px bg-[linear-gradient(to_right,transparent,rgba(255,43,214,0.50),transparent)] blur-sm opacity-40" />

      <div className="absolute left-0 right-0 top-[-30%] h-[40%] animate-scanline bg-[linear-gradient(to_bottom,transparent,rgba(48,227,202,0.12),transparent)] mix-blend-screen" />
      <div className="absolute inset-0 opacity-[0.08] [background:repeating-linear-gradient(to_bottom,transparent_0px,transparent_2px,rgba(255,255,255,0.06)_3px)] mix-blend-overlay" />
    </div>
  );
}

