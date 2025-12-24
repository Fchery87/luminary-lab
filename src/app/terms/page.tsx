'use client';

import { Header } from '@/components/ui/header';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { motion } from 'framer-motion';
import { FileText, AlertTriangle, Scale, Zap, CheckCircle } from 'lucide-react';

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

export default function TermsPage() {
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
                  <FileText className="w-8 h-8 text-[hsl(var(--charcoal))]" />
                </motion.div>
              </div>

              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                <CharReveal stagger={0.015}>
                  Terms of Service
                </CharReveal>
              </h1>

              <p className="font-body text-lg md:text-xl text-[hsl(var(--muted-foreground))] max-w-3xl leading-relaxed mb-4">
                By using Luminary Lab, you agree to these terms. Please read them carefully.
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
              {/* Acceptance of Terms */}
              <SectionCard
                title="Acceptance of Terms"
                icon={CheckCircle}
                index={0}
              >
                <p className="mb-4">By accessing or using Luminary Lab, you agree to be bound by these Terms of Service:</p>
                <ul className="space-y-2 ml-6">
                  {[
                    'If you do not agree to these terms, please do not use our service',
                    'We reserve the right to modify these terms at any time',
                    'Continued use of the service after changes constitutes acceptance',
                    'It is your responsibility to review these terms periodically',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[hsl(var(--gold))] mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {/* Account Responsibilities */}
              <SectionCard
                title="Account Responsibilities"
                icon={Scale}
                index={1}
              >
                <p className="mb-4">You are responsible for maintaining the security of your account:</p>
                <ul className="space-y-2 ml-6">
                  {[
                    'Keep your password secure and confidential',
                    'Notify us immediately of any unauthorized use',
                    'Provide accurate and complete information',
                    'Maintain and update your account information',
                    'Accept responsibility for all activities under your account',
                    'Do not share your account with others',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[hsl(var(--gold))] mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {/* Usage Rules */}
              <SectionCard
                title="Usage Rules"
                icon={AlertTriangle}
                index={2}
              >
                <p className="mb-4">You agree not to use the service for any unlawful or prohibited purpose:</p>
                <ul className="space-y-2 ml-6">
                  {[
                    'Do not upload illegal, offensive, or inappropriate content',
                    'Do not attempt to circumvent usage limits or subscription tiers',
                    'Do not use automated scripts to abuse the service',
                    'Do not reverse-engineer or attempt to extract our AI models',
                    'Do not share your account credentials with others',
                    'Do not use the service to harass, abuse, or harm others',
                    'Do not infringe on intellectual property rights',
                    'Do not violate any applicable laws or regulations',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[hsl(var(--gold))] mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {/* Subscription and Payment */}
              <SectionCard
                title="Subscription and Payment"
                icon={Zap}
                index={3}
              >
                <p className="mb-4">Subscription terms and payment conditions:</p>
                <ul className="space-y-2 ml-6">
                  {[
                    'Paid subscriptions auto-renew unless cancelled',
                    'You can cancel anytime from your account settings',
                    'Refunds are handled on a case-by-case basis',
                    'Prices are subject to change with notice',
                    'All payments are processed securely through Stripe',
                    'We do not store your payment card information',
                    'Unused credits do not carry over between billing periods',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[hsl(var(--gold))] mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {/* Intellectual Property */}
              <SectionCard
                title="Intellectual Property"
                icon={FileText}
                index={4}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className="font-display font-semibold text-sm mb-2 text-[hsl(var(--foreground))]">YOUR CONTENT</h4>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      You retain ownership of all images and content you upload. Luminary Lab does not claim any rights to your original photographs.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-sm mb-2 text-[hsl(var(--foreground))]">PROCESSED OUTPUT</h4>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      Enhanced images are owned by you. We provide a license to use our AI processing technology.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-sm mb-2 text-[hsl(var(--foreground))]">PLATFORM CONTENT</h4>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      All trademarks, logos, and service marks displayed on Luminary Lab are our property or licensed to us.
                    </p>
                  </div>
                </div>
              </SectionCard>

              {/* Limitation of Liability */}
              <SectionCard
                title="Limitation of Liability"
                icon={AlertTriangle}
                index={5}
              >
                <p className="mb-4">To the fullest extent permitted by law, Luminary Lab shall not be liable for:</p>
                <ul className="space-y-2 ml-6">
                  {[
                    'Any indirect, incidental, special, or consequential damages',
                    'Loss of data, photos, or other content',
                    'Service interruptions or downtime',
                    'Third-party service failures (Stripe, AWS, etc.)',
                    'Accuracy or quality of AI-enhanced outputs',
                    'Damages exceeding the amount you paid in the past 12 months',
                    'Viruses or other harmful code transmitted via the service',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[hsl(var(--gold))] mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {/* Termination */}
              <SectionCard
                title="Termination"
                icon={Scale}
                index={6}
              >
                <p className="mb-4">We reserve the right to terminate or suspend your account:</p>
                <ul className="space-y-2 ml-6">
                  {[
                    'If you violate these Terms of Service',
                    'For extended periods of inactivity (90+ days)',
                    'If we suspect fraudulent or illegal activity',
                    'At our sole discretion with or without cause',
                    'Upon termination, your access to the service will be revoked',
                    'We may delete your account data after a reasonable grace period',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[hsl(var(--gold))] mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {/* Contact */}
              <Frame accent className="bg-[hsl(var(--card))] p-8 md:p-12 text-center max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                >
                  <h3 className="font-display font-bold text-2xl mb-4 text-[hsl(var(--foreground))]">
                    Questions About These Terms?
                  </h3>
                  <p className="font-body text-[hsl(var(--muted-foreground))] mb-6 max-w-xl mx-auto">
                    If you have any questions about these Terms of Service or our services,
                    please contact our legal team.
                  </p>
                  <a
                    href="mailto:legal@luminarylab.com"
                    className="inline-flex items-center gap-2 font-display font-semibold uppercase tracking-wider bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold-light))] px-8 py-4 rounded-sm transition-colors"
                  >
                    Contact Legal Team
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
              <a href="/privacy" className="font-body text-sm text-[hsl(var(--foreground))] hover:text-[hsl(var(--gold))] transition-colors">
                Privacy
              </a>
              <a href="/terms" className="font-body text-sm text-[hsl(var(--gold))]">
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
