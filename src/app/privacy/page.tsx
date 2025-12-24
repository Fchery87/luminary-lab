'use client';

import { Header } from '@/components/ui/header';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { motion } from 'framer-motion';
import { Shield, Eye, Database, Lock, CheckCircle } from 'lucide-react';

// Character reveal animation component
function CharReveal({
  children,
  delay = 0,
  stagger = 0.02
}: {
  children: string;
  delay?: number;
  stagger?: number;
}) {
  const chars = children.split('');

  return (
    <span className="inline-block">
      {chars.map((char, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: 30, rotateX: -15 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{
            duration: 0.5,
            delay: delay + (i * stagger),
            type: "spring",
            stiffness: 200,
            damping: 25
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  );
}

// Frame component with amber accent
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

// Section card component
function SectionCard({
  title,
  icon: Icon,
  children,
  index = 0
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-sm overflow-hidden"
    >
      {/* Top amber accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold-light))] to-transparent opacity-60" />

      <div className="p-8 md:p-12">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-sm flex items-center justify-center">
            <Icon className="w-6 h-6 text-[hsl(var(--gold))]" />
          </div>
          <h3 className="font-display font-bold text-xl text-[hsl(var(--foreground))] pt-2">
            {title}
          </h3>
        </div>
        <div className="font-body text-[hsl(var(--muted-foreground))] leading-relaxed">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))] relative overflow-x-hidden">
      {/* Texture overlays */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] z-0">
        <div className="absolute inset-0 grid-pattern" />
      </div>

      {/* Amber ambient glow */}
      <div className="fixed top-1/4 left-0 w-[600px] h-[600px] rounded-full bg-[hsl(var(--gold))] opacity-[0.02] blur-[200px] pointer-events-none" />

      <Header />

      <main className="flex-1 relative z-10">
        {/* Page Header */}
        <section className="w-full py-16 md:py-24 lg:py-32 border-b border-[hsl(var(--border))]/20">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="max-w-4xl mx-auto"
            >
              <div className="flex items-center gap-4 mb-6">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 bg-[hsl(var(--gold))] rounded-sm flex items-center justify-center amber-glow"
                >
                  <Shield className="w-8 h-8 text-[hsl(var(--charcoal))]" />
                </motion.div>
              </div>

              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                <CharReveal stagger={0.015}>
                  Privacy Policy
                </CharReveal>
              </h1>

              <p className="font-body text-lg md:text-xl text-[hsl(var(--muted-foreground))] max-w-3xl leading-relaxed mb-4">
                Your privacy is important to us. This policy explains how Luminary Lab collects,
                uses, and protects your personal information.
              </p>

              <p className="font-mono text-sm text-[hsl(var(--muted-foreground))]">
                Last updated: December 24, 2025
              </p>
            </motion.div>
          </div>
        </section>

        {/* Content Sections */}
        <section className="w-full py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Information We Collect */}
              <SectionCard
                title="Information We Collect"
                icon={Database}
                index={0}
              >
                <p className="mb-4">We collect information you provide directly, including:</p>
                <ul className="space-y-2 ml-6">
                  {[
                    'Account information (email, name, profile image)',
                    'Payment and billing information (processed securely via Stripe)',
                    'Uploaded images and photo files',
                    'Processing preferences and settings',
                    'Usage analytics and interaction data',
                    'Device and browser information',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[hsl(var(--gold))] mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {/* How We Use Your Information */}
              <SectionCard
                title="How We Use Your Information"
                icon={Eye}
                index={1}
              >
                <p className="mb-4">We use your information to:</p>
                <ul className="space-y-2 ml-6">
                  {[
                    'Provide, maintain, and improve our services',
                    'Process your photo editing requests using AI',
                    'Send you important notifications and updates',
                    'Process payments and manage subscriptions',
                    'Analyze usage patterns to enhance user experience',
                    'Detect and prevent fraud or abuse',
                    'Comply with legal obligations',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[hsl(var(--gold))] mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {/* Data Security */}
              <SectionCard
                title="Data Security"
                icon={Lock}
                index={2}
              >
                <p className="mb-4">We implement appropriate technical and organizational measures to protect your personal information:</p>
                <ul className="space-y-2 ml-6">
                  {[
                    'All data is encrypted in transit using HTTPS/TLS',
                    'Images are stored securely on AWS S3 with encryption at rest',
                    'Passwords are hashed and never stored in plain text',
                    'Payment data is processed by Stripe and never stored on our servers',
                    'Regular security audits and vulnerability assessments',
                    'Access controls and authentication for all systems',
                    'Data backups with redundancy and disaster recovery',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[hsl(var(--gold))] mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {/* Third-Party Services */}
              <SectionCard
                title="Third-Party Services"
                icon={Database}
                index={3}
              >
                <p className="mb-4">We use trusted third-party services to operate our platform:</p>
                <div className="space-y-4">
                  <div className="bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] p-4 rounded-sm">
                    <h4 className="font-display font-semibold text-sm mb-2 text-[hsl(var(--foreground))]">STRIPE (Payments)</h4>
                    <p className="font-body text-sm text-[hsl(var(--muted-foreground))]">
                      All payment processing is handled by Stripe. We do not store your credit card information.
                    </p>
                  </div>
                  <div className="bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] p-4 rounded-sm">
                    <h4 className="font-display font-semibold text-sm mb-2 text-[hsl(var(--foreground))]">AWS (Cloud Infrastructure)</h4>
                    <p className="font-body text-sm text-[hsl(var(--muted-foreground))]">
                      Images are stored on Amazon Web Services S3 with enterprise-grade security.
                    </p>
                  </div>
                  <div className="bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] p-4 rounded-sm">
                    <h4 className="font-display font-semibold text-sm mb-2 text-[hsl(var(--foreground))]">NEON (Database)</h4>
                    <p className="font-body text-sm text-[hsl(var(--muted-foreground))]">
                      User data is stored in Neon PostgreSQL database with encryption and access controls.
                    </p>
                  </div>
                </div>
              </SectionCard>

              {/* Your Rights */}
              <SectionCard
                title="Your Rights"
                icon={CheckCircle}
                index={4}
              >
                <p className="mb-4">You have the right to:</p>
                <ul className="space-y-2 ml-6">
                  {[
                    'Access, review, and update your personal information',
                    'Request deletion of your account and associated data',
                    'Opt-out of marketing communications (while keeping service access)',
                    'Export your data in a machine-readable format',
                    'Object to processing of your personal information',
                    'Withdraw consent at any time where processing is based on consent',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[hsl(var(--gold))] mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {/* Contact Us */}
              <Frame accent className="bg-[hsl(var(--card))] p-8 md:p-12 text-center max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <h3 className="font-display font-bold text-2xl mb-4 text-[hsl(var(--foreground))]">
                    Questions About Privacy?
                  </h3>
                  <p className="font-body text-[hsl(var(--muted-foreground))] mb-6 max-w-xl mx-auto">
                    If you have any questions about this Privacy Policy or how we handle your data,
                    please contact our privacy team.
                  </p>
                  <a
                    href="mailto:privacy@luminarylab.com"
                    className="inline-flex items-center gap-2 font-display font-semibold uppercase tracking-wider bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold-light))] px-8 py-4 rounded-sm transition-colors"
                  >
                    Contact Privacy Team
                    <CheckCircle className="w-4 h-4" />
                  </a>
                </motion.div>
              </Frame>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-[hsl(var(--border))] relative z-10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
            <div className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
              © 2025 Luminary Lab. All rights reserved.
            </div>
            <div className="flex gap-8">
              <a href="/privacy" className="font-body text-sm text-[hsl(var(--gold))]">
                Privacy
              </a>
              <a href="/terms" className="font-body text-sm text-[hsl(var(--foreground))] hover:text-[hsl(var(--gold))] transition-colors">
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
