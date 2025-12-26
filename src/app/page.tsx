'use client';

import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  ArrowRight, Upload, Download, Sparkles, Aperture,
  Shield, Layers, Zap, Cpu, Wand2, Sliders, Camera
} from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

// Utility: Simple fade-in animation (replaces expensive CharReveal)
function FadeIn({ 
  children, 
  delay = 0,
  className = ''
}: { 
  children: React.ReactNode; 
  delay?: number;
  className?: string;
}) {
  return (
    <motion.span
      className={`inline-block ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.6, 
        delay,
        ease: [0.25, 0.1, 0.25, 1] // CSS ease-out equivalent
      }}
    >
      {children}
    </motion.span>
  );
}

// Precise border frame with amber accent
function Frame({ 
  children, 
  className = '',
  accent = false
}: { 
  children: React.ReactNode; 
  className?: string;
  accent?: boolean;
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 border border-[hsl(var(--border))] rounded-sm" />
      {accent && (
        <div className="absolute -top-[1px] -left-[1px] w-12 h-12 border-t-2 border-l-2 border-[hsl(var(--gold))] rounded-tl-sm" />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

// Industrial card with sharp edges
function IndustrialCard({ 
  children, 
  className = '',
  hover = false
}: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      className={`relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] ${hover ? 'hover:border-[hsl(var(--gold))] transition-colors duration-300' : ''} ${className}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6 }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold-light))] to-transparent opacity-50" />
      {children}
    </motion.div>
  );
}

// Amber glow button with sharp edges
function AmberButton({ 
  children, 
  variant = 'primary',
  className = '',
  href,
  ...props 
}: any) {
  const content = (
    <span className="relative z-10 flex items-center justify-center gap-2">
      {children}
    </span>
  );

  const buttonClasses = `
    relative overflow-hidden font-display font-semibold uppercase tracking-wider cursor-pointer
    ${variant === 'primary' 
      ? 'bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold-light))]' 
      : 'bg-transparent border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--gold))]'
    }
    ${className}
  `;

  if (href) {
    return (
      <motion.a
        href={href}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={buttonClasses}
        {...props}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={buttonClasses}
      {...props}
    >
      {content}
    </motion.button>
  );
}

// Stat counter with monospace font
function StatCounter({ 
  value, 
  suffix = '',
  label,
  index = 0 
}: { 
  value: string;
  suffix?: string;
  label: string;
  index?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [count, setCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    if (isInView) {
      const numericValue = parseFloat(value);
      const duration = 2000;
      const steps = 60;
      const stepTime = duration / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += numericValue / steps;
        setCount(current);
        if (current >= numericValue) {
          clearInterval(timer);
          setIsComplete(true);
        }
      }, stepTime);
      
      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <div ref={ref} className="text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: isComplete ? 0.3 : 0.6, delay: isComplete ? 0 : index * 0.1 }}
        animate={{ scale: isComplete ? [1, 1.02, 1] : 1 }}
      >
        <div className="font-mono text-5xl md:text-7xl font-medium text-[hsl(var(--gold))] mb-1">
          {count.toFixed(value.includes('.') ? 1 : 0)}
          {suffix && <span className="text-3xl md:text-5xl text-[hsl(var(--foreground))] ml-1">{suffix}</span>}
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] font-display">
          {label}
        </div>
      </motion.div>
    </div>
  );
}

// Feature item with amber accent
function FeatureItem({ 
  icon: Icon, 
  title, 
  description, 
  index = 0 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  index?: number;
}) {
  return (
    <IndustrialCard 
      className="p-6 group hover:bg-[hsl(var(--secondary))] transition-colors"
      hover
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="flex gap-4"
      >
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-[hsl(var(--gold))] opacity-0 group-hover:opacity-10 transition-opacity rounded-sm" />
          <div className="relative w-12 h-12 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] group-hover:border-[hsl(var(--gold))] rounded-sm flex items-center justify-center transition-colors">
            <Icon className="w-5 h-5 text-[hsl(var(--gold))]" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-lg mb-2 text-[hsl(var(--foreground))]">{title}</h3>
          <p className="font-body text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{description}</p>
        </div>
      </motion.div>
    </IndustrialCard>
  );
}

export default function HomePage() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0.85]);

  return (
    <ErrorBoundary>
      {/* Texture overlays */}
      <div className="film-grain" />
      <div className="scanlines" />
      
      <div className="min-h-screen flex flex-col bg-[hsl(var(--charcoal))] text-[hsl(var(--cream))] overflow-x-hidden relative">
        {/* Subtle background grid */}
        <div className="fixed inset-0 grid-pattern opacity-[0.03] pointer-events-none" />
        
        {/* Amber ambient glow */}
        <div className="fixed top-0 left-1/4 w-[800px] h-[800px] rounded-full bg-[hsl(var(--gold))] opacity-[0.03] blur-[200px] pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-[hsl(var(--gold))] opacity-[0.02] blur-[150px] pointer-events-none" />

        <motion.div style={{ opacity }}>
          <Header />
        </motion.div>

        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative w-full min-h-screen flex items-center justify-center py-20">
            <div className="container mx-auto px-6 max-w-6xl relative z-10">
              {/* Technical badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center justify-center gap-3 mb-12"
              >
                <div className="w-8 h-[1px] bg-[hsl(var(--gold))]" />
                <span className="font-mono text-xs uppercase tracking-[0.3em] text-[hsl(var(--gold))]">
                  Neural Image Processing
                </span>
                <div className="w-8 h-[1px] bg-[hsl(var(--gold))]" />
              </motion.div>

              {/* Headline */}
              <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-display font-bold tracking-tighter leading-[0.85] mb-8">
                <FadeIn>Precision</FadeIn>
                <br />
                <span className="text-shimmer">
                  <FadeIn delay={0.2}>Retouching</FadeIn>
                </span>
              </h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="font-body text-xl md:text-2xl text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto mb-16 leading-relaxed"
              >
                AI-powered RAW processing engineered for professional photographers. 
                Preserve texture, enhance color, deliver results.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-24"
              >
                <AmberButton
                  className="px-10 py-4 text-sm rounded-sm"
                  href="/login"
                >
                  Begin Processing
                  <ArrowRight className="w-4 h-4" />
                </AmberButton>
                <AmberButton
                  variant="secondary"
                  className="px-10 py-4 text-sm rounded-sm"
                  href="/login"
                >
                  Sign In
                </AmberButton>
              </motion.div>

              {/* Technical specifications */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto"
              >
                {[
                  { label: 'RAW Support', value: 'CR3, ARW, NEF, DNG' },
                  { label: 'Color Depth', value: '16-bit' },
                  { label: 'Processing', value: '< 300ms' }
                ].map((item, i) => (
                  <Frame key={i} accent={i === 0} className="bg-[hsl(var(--card))] p-5">
                    <div className="font-mono text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
                      {item.label}
                    </div>
                    <div className="font-display font-semibold text-[hsl(var(--gold))]">
                      {item.value}
                    </div>
                  </Frame>
                ))}
              </motion.div>
            </div>

            {/* Decorative corner elements */}
            <div className="absolute top-20 left-6 w-24 h-24 border-l-2 border-t-2 border-[hsl(var(--gold))]/20" />
            <div className="absolute top-20 right-6 w-24 h-24 border-r-2 border-t-2 border-[hsl(var(--gold))]/20" />
            <div className="absolute bottom-20 left-6 w-24 h-24 border-l-2 border-b-2 border-[hsl(var(--gold))]/20" />
            <div className="absolute bottom-20 right-6 w-24 h-24 border-r-2 border-b-2 border-[hsl(var(--gold))]/20" />
          </section>

          {/* Capabilities Section */}
          <section className="w-full py-32 relative border-y border-[hsl(var(--border))]">
            <div className="container mx-auto px-6 max-w-7xl">
              {/* Section header */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-20"
              >
                <div className="inline-flex items-center gap-3 mb-6">
                  <div className="w-12 h-[1px] bg-[hsl(var(--gold))]" />
                  <span className="font-mono text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
                    Engineering
                  </span>
                  <div className="w-12 h-[1px] bg-[hsl(var(--gold))]" />
                </div>
                <h2 className="font-display text-4xl md:text-6xl font-bold mb-4">
                  <FadeIn>Professional Capabilities</FadeIn>
                </h2>
                <p className="font-body text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto">
                  Advanced processing powered by distributed GPU clusters and neural networks trained on millions of editorial images.
                </p>
              </motion.div>

              {/* Feature grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FeatureItem
                  icon={Cpu}
                  index={0}
                  title="Neural Processing Engine"
                  description="Distributed GPU cluster with 5M+ editorial training samples. Sub-300ms rendering for 45MP images."
                />
                <FeatureItem
                  icon={Camera}
                  index={1}
                  title="Native RAW Pipeline"
                  description="Complete CR3/ARW/NEF/DNG support with linear data processing for maximum dynamic range retention."
                />
                <FeatureItem
                  icon={Sliders}
                  index={2}
                  title="Non-Destructive Editing"
                  description="Layer-based metadata operations with full revision history and atomic rollback capability."
                />
                <FeatureItem
                  icon={Shield}
                  index={3}
                  title="Secure Infrastructure"
                  description="End-to-end encrypted cloud storage with automatic backups and comprehensive version control."
                />
                <FeatureItem
                  icon={Wand2}
                  index={4}
                  title="AI Enhancement"
                  description="Automatic color grading, exposure adjustment, and noise reduction powered by neural networks."
                />
                <FeatureItem
                  icon={Layers}
                  index={5}
                  title="Batch Processing"
                  description="Process hundreds of photos simultaneously with consistent AI-powered enhancements."
                />
              </div>
            </div>
          </section>

          {/* Statistics Section */}
          <section className="w-full py-32 relative">
            <div className="container mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 max-w-6xl mx-auto"
              >
                <StatCounter value="5" suffix="M+" label="Photos Processed" index={0} />
                <StatCounter value="300" suffix="ms" label="Average Time" index={1} />
                <StatCounter value="99.9" suffix="%" label="Satisfaction" index={2} />
                <StatCounter value="16" suffix="-bit" label="Color Depth" index={3} />
              </motion.div>
            </div>
          </section>

          {/* Workflow Section */}
          <section className="w-full py-32 relative border-y border-[hsl(var(--border))]">
            <div className="container mx-auto px-6 max-w-6xl">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-20"
              >
                <div className="inline-flex items-center gap-3 mb-6">
                  <div className="w-12 h-[1px] bg-[hsl(var(--gold))]" />
                  <span className="font-mono text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
                    Workflow
                  </span>
                  <div className="w-12 h-[1px] bg-[hsl(var(--gold))]" />
                </div>
                <h2 className="font-display text-4xl md:text-6xl font-bold mb-4">
                  <FadeIn>Seamless Process</FadeIn>
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    step: '01',
                    icon: Upload,
                    title: 'Upload RAW',
                    desc: 'Drag and drop your RAW photos or select from your device. Support for all major formats.'
                  },
                  {
                    step: '02',
                    icon: Sparkles,
                    title: 'AI Enhancement',
                    desc: 'Our neural network automatically enhances your photos while preserving natural texture.'
                  },
                  {
                    step: '03',
                    icon: Download,
                    title: 'Export Results',
                    desc: 'Download in your preferred format with full quality. JPG for web, TIFF for print.'
                  }
                ].map((item, i) => (
                  <IndustrialCard key={i} className="p-8 relative">
                    {/* Step number */}
                    <div className="absolute -top-3 -left-3 font-mono text-4xl font-bold text-[hsl(var(--gold))]/20">
                      {item.step}
                    </div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                    >
                      <div className="w-16 h-16 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-sm flex items-center justify-center mb-6">
                        <item.icon className="w-7 h-7 text-[hsl(var(--gold))]" />
                      </div>
                      <h3 className="font-display font-bold text-xl mb-3 text-[hsl(var(--foreground))]">
                        {item.title}
                      </h3>
                      <p className="font-body text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                        {item.desc}
                      </p>
                    </motion.div>
                  </IndustrialCard>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA Section */}
          <section className="w-full py-32 relative">
            <div className="container mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <Frame accent className="bg-[hsl(var(--card))] p-16 md:p-24 text-center max-w-4xl mx-auto">
                  {/* Amber icon */}
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 mx-auto mb-10 bg-[hsl(var(--gold))] rounded-sm flex items-center justify-center amber-glow"
                  >
                    <Sparkles className="w-10 h-10 text-[hsl(var(--charcoal))]" />
                  </motion.div>

                  <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
                    <FadeIn>Create Something Extraordinary</FadeIn>
                  </h2>
                  
                  <p className="font-body text-xl text-[hsl(var(--muted-foreground))] max-w-xl mx-auto mb-10 leading-relaxed">
                    Start transforming your RAW files into gallery-worthy masterpieces with AI-powered precision.
                  </p>

                  <AmberButton className="px-12 py-5 text-sm rounded-sm" href="/login">
                    Begin Your Journey
                    <ArrowRight className="w-4 h-4" />
                  </AmberButton>
                </Frame>
              </motion.div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="py-12 border-t border-[hsl(var(--border))] relative z-10">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
              {/* Brand */}
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 bg-[hsl(var(--gold))] rounded-sm flex items-center justify-center"
                >
                  <Aperture className="w-5 h-5 text-[hsl(var(--charcoal))]" />
                </motion.div>
                <span className="font-display font-bold text-lg tracking-tight text-[hsl(var(--foreground))]">
                  LUMINARY LAB
                </span>
              </div>

              {/* Navigation */}
              <nav className="flex gap-8">
                <Link
                  href="/privacy"
                  className="font-body text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors relative group"
                >
                  Privacy
                  <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[hsl(var(--gold))] group-hover:w-full transition-all duration-300" />
                </Link>
                <Link
                  href="/terms"
                  className="font-body text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors relative group"
                >
                  Terms
                  <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[hsl(var(--gold))] group-hover:w-full transition-all duration-300" />
                </Link>
                <a
                  href="https://status.luminarylab.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors relative group"
                >
                  Status
                  <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[hsl(var(--gold))] group-hover:w-full transition-all duration-300" />
                </a>
              </nav>

              {/* Version */}
              <div className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                BUILD 2025.12.23
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
