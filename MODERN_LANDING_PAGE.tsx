'use client';

import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Aperture, Layers, Cpu, ArrowRight, Camera, Zap, Shield, Check } from 'lucide-react';

export default function ModernHomePage() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Subtle gradient mesh background */}
        <div className="fixed inset-0 -z-10 bg-background overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_50%_50%,rgba(30,227,202,0.03),transparent_60%)]" />
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.01),transparent_50%)]" />
          </div>
        </div>

        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="w-full py-24 md:py-32 flex flex-col items-center justify-center">
            <div className="container mx-auto px-4 text-center max-w-4xl">
              {/* Subtle badge - No neon, no shimmer */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-secondary/50 mb-8"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs font-medium uppercase tracking-wider text-foreground/70">
                  System v2.0
                </span>
              </motion.div>

              {/* Clean headline - No shimmer, no neon shadow */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                className="text-5xl md:text-7xl font-bold tracking-tight mb-4 leading-[1.1]"
              >
                Professional Photo Editing
                <br className="md:hidden" />
                <span className="text-2xl md:text-4xl font-normal text-foreground/70 block mt-1">
                  Made Simple
                </span>
              </motion.h1>

              {/* Descriptive subheading */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
                className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10"
              >
                Advanced neural processing for professional photographers.
                <br className="md:block" />
                <span className="text-foreground font-medium">Zero latency. 16-bit fidelity.</span>
              </motion.p>

              {/* Clean CTAs - No glow, no scale */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-primary text-primary-foreground px-8 py-4 rounded-sm font-medium uppercase tracking-wide hover:-translate-y-[-2px] transition-all duration-200"
                  asChild
                >
                  <Link href="/register">
                    Start Free Trial
                  </Link>
                </motion.button>
                <Button
                  variant="outline"
                  className="border-border/50 bg-background/50 hover:border-primary/30 hover:bg-primary/5 px-8 py-4 rounded-sm font-medium uppercase tracking-wide transition-colors duration-200"
                  asChild
                >
                  <Link href="/login">
                    Sign In
                  </Link>
                </Button>
              </motion.div>
            </div>
          </section>

          {/* Features Section - Clean Cards, No Spotlight */}
          <section className="w-full py-24 border-t border-white/5">
            <div className="container mx-auto px-4 max-w-6xl">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-center text-3xl font-bold mb-16"
              >
                Built for Professionals
              </motion.h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Camera,
                    title: 'RAW Processing',
                    desc: 'Native CR3/ARW/NEF decoding with linear data processing for maximum dynamic range'
                  },
                  {
                    icon: Zap,
                    title: 'Neural Engine',
                    desc: 'Distributed GPU cluster for sub-300ms rendering with AI-enhanced results'
                  },
                  {
                    icon: Shield,
                    title: 'Non-Destructive',
                    desc: 'Layer-based operations with full revision history and atomic rollback'
                  }
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: i * 0.1 }}
                    className="group"
                  >
                    <div className="h-full p-8 border border-white/5 rounded-xl bg-card/50 hover:border-white/10 hover:bg-card/80 hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] transition-all duration-300">
                      {/* Icon - No rotation, no scale */}
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary/60 to-secondary/30 flex items-center justify-center mb-6 border border-white/5 group-hover:border-primary/20 group-hover:from-primary/10 transition-all duration-300">
                        <feature.icon className="w-7 h-7 text-foreground/70" />
                      </div>

                      {/* Content */}
                      <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground/70 leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Stats Section - Credible, Not Generic */}
          <section className="w-full py-24 border-t border-white/5 bg-card/20">
            <div className="container mx-auto px-4 text-center">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-center text-3xl font-bold mb-16"
              >
                The Numbers Speak
              </motion.h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  { num: '5M+', label: 'Photos Processed' },
                  { num: '300ms', label: 'Average Time' },
                  { num: '99.9%', label: 'Satisfaction Rate' },
                  { num: '16-bit', label: 'Color Fidelity' }
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: i * 0.1 }}
                    className="p-8"
                  >
                    <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                      {stat.num}
                    </div>
                    <div className="text-muted-foreground/70">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="w-full py-24 border-t border-white/5">
            <div className="container mx-auto px-4 text-center max-w-3xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="p-12 md:p-16 rounded-2xl border border-white/5 bg-gradient-to-br from-card/50 to-card/20"
              >
                <h2 className="text-3xl font-bold mb-4">
                  Ready to Transform Your Photos?
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
                  Join thousands of professional photographers using Luminary Lab for AI-powered photo editing.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-primary text-primary-foreground px-10 py-4 rounded-sm font-bold uppercase tracking-wide hover:-translate-y-[-2px] transition-all duration-200 flex items-center"
                    asChild
                  >
                    <Link href="/register">
                      Get Started Free
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </motion.button>
                  <Button
                    variant="outline"
                    className="border-border/50 bg-background/50 hover:border-primary/30 hover:bg-primary/5 px-10 py-4 rounded-sm font-medium uppercase tracking-wide transition-colors duration-200"
                    asChild
                  >
                    <Link href="/login">
                      View Examples
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>
        </main>
      </div>
    </ErrorBoundary>
  );
}
