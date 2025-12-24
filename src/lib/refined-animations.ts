// Modern, refined animations and effects for dashboard
// Replace cheesy effects with these professional alternatives

export const refinedAnimations = {
  // Subtle fade-in with slide up
  fadeInUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.3, ease: [0.4, 0, 0.2] },
  },

  // Staggered children animation
  staggerContainer: {
    initial: 'hidden',
    animate: 'visible',
    variants: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.08,
          delayChildren: 0.1,
        },
      },
    },
  },

  // Gentle hover elevation
  hoverElevation: {
    whileHover: {
      boxShadow: '0 8px 30px -4px rgba(0, 0, 0, 0.08)',
      transform: 'translateY(-2px)',
    },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  // Magnetic button effect
  magneticButton: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
};

// Gradient text animation
export function gradientText(baseColor = 'currentColor') {
  return {
    background: `linear-gradient(90deg, ${baseColor}, ${baseColor}90%, ${baseColor})`,
    backgroundSize: '200% 200%',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };
}

// Refined status colors (muted, professional)
export const statusStyles = {
  completed: {
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/15',
    text: 'text-emerald-400',
    iconBg: 'bg-emerald-400',
  },
  processing: {
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/15',
    text: 'text-amber-400',
    iconBg: 'bg-amber-400',
  },
  failed: {
    bg: 'bg-rose-500/5',
    border: 'border-rose-500/15',
    text: 'text-rose-400',
    iconBg: 'bg-rose-400',
  },
  queued: {
    bg: 'bg-secondary',
    border: 'border-border/20',
    text: 'text-muted-foreground',
    iconBg: 'bg-muted-foreground',
  },
  pending: {
    bg: 'bg-secondary',
    border: 'border-border/20',
    text: 'text-muted-foreground',
    iconBg: 'bg-muted-foreground',
  },
};

// Card styles (elegant, glassmorphism)
export const cardStyles = {
  base: 'bg-card/50 backdrop-blur-sm border-white/5 rounded-lg',
  hover: 'hover:border-white/10 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]',
  transition: 'transition-all duration-400',
};

// Button styles (refined, professional)
export const buttonStyles = {
  base: 'rounded-sm font-medium transition-all duration-200',
  hover: 'hover:border-white/10',
};

// Empty state styles
export const emptyStateStyles = {
  container: 'flex flex-col items-center justify-center py-20 text-center',
  iconBox: 'w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary/50 to-secondary/20 flex items-center justify-center mb-6',
  title: 'text-lg font-semibold text-foreground mb-2',
  description: 'text-sm text-muted-foreground max-w-sm mx-auto mb-6',
};

// Background patterns
export const backgroundPatterns = {
  // Subtle mesh gradient
  mesh: 'before:absolute before:inset-0 before:opacity-30 before:bg-[radial-gradient(circle_at_50%_50%,rgba(48,227,202,0.03),transparent_50%)] before:pointer-events-none',

  // Grid pattern (very subtle)
  grid: 'before:absolute before:inset-0 before:opacity-[0.03] before:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] before:bg-[length:40px_40px]',
};

// Status indicators (modern, subtle)
export const statusIndicators = {
  // Processing - pulsing dots
  processing: 'flex items-center gap-1.5',
  processingDot: 'w-1.5 h-1.5 rounded-full bg-foreground/60 animate-pulse',

  // Completed - checkmark
  completed: 'flex items-center gap-1.5',
  completedIcon: 'text-emerald-400',
};

// Helper for generating status badge
export function getStatusBadge(status: string) {
  const style = statusStyles[status as keyof typeof statusStyles] || statusStyles.pending;

  return {
    container: `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium backdrop-blur-md ${style.bg} ${style.border} ${style.text}`,
    icon: `${style.iconBg}`,
    textClass: style.text,
  };
}

// Helper for glassmorphism card
export function getGlassCardStyles(hover = false) {
  const base = 'bg-card/40 backdrop-blur-sm border border-white/5 rounded-lg';
  const hoverClass = hover ? 'hover:border-white/10 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)]' : '';

  return `${base} ${hoverClass} transition-all duration-300`;
}

// Helper for elegant hover effect
export function getElegantHoverStyles() {
  return {
    className: 'group-hover:translate-y-[-2px] group-hover:shadow-[0_8px_24px_-2px_rgba(0,0,0,0.08)] transition-all duration-300',
  };
}

// Helper for shimmer removal
// Instead of TextShimmer, use these alternatives
export const textAlternatives = {
  // Simple, clean
  clean: 'text-4xl font-bold tracking-tight',

  // Subtle gradient (no animation)
  gradient: 'bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent',

  // Very subtle opacity animation
  subtle: 'text-4xl font-bold tracking-tight opacity-90 transition-opacity duration-500 hover:opacity-100',
};

// Helper for button hover removal
// Instead of neon glow, use these
export const buttonHoverAlternatives = {
  // Subtle border
  border: 'hover:border-white/10',

  // Subtle shadow
  shadow: 'hover:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06)]',

  // Magnetic effect (framer-motion)
  magnetic: 'whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}',
};
