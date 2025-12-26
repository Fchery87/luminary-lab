'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OnboardingStep = 'name' | 'upload' | 'preview' | 'complete';

export interface OnboardingStepConfig {
  id: OnboardingStep;
  label: string;
  description: string;
  optional?: boolean;
}

const STEPS: OnboardingStepConfig[] = [
  {
    id: 'name',
    label: 'Name Your Project',
    description: 'Give your photo a name (optional)',
    optional: true,
  },
  {
    id: 'upload',
    label: 'Upload RAW File',
    description: 'Drag & drop your RAW image',
  },
  {
    id: 'preview',
    label: 'See the Magic',
    description: 'Preview your enhanced photo',
  },
];

interface OnboardingChecklistProps {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  onStepClick?: (step: OnboardingStep) => void;
  className?: string;
  isComplete?: boolean;
}

export function OnboardingChecklist({
  currentStep,
  completedSteps,
  onStepClick,
  className,
  isComplete = false,
}: OnboardingChecklistProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('w-full space-y-4', className)}
    >
      {/* Header */}
      <div className="space-y-1">
        <h3 className="font-display text-lg font-semibold text-[hsl(var(--foreground))] tracking-tight">
          {isComplete ? '🎉 Amazing!' : 'Quick Start Guide'}
        </h3>
        <p className="font-body text-sm text-[hsl(var(--muted-foreground))]">
          {isComplete
            ? "You've created your first enhanced photo!"
            : 'Follow these steps to create your first masterpiece'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-1 bg-[hsl(var(--border))] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-light))]"
          />
        </div>
        <div className="flex justify-between text-xs font-mono text-[hsl(var(--muted-foreground))]">
          <span>Step {currentIndex + 1} of {STEPS.length}</span>
          <span>{Math.round((currentIndex / (STEPS.length - 1)) * 100)}%</span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = step.id === currentStep;
            const isUpcoming = index > currentIndex;
            const isClickable = onStepClick && (isCompleted || isUpcoming && index === currentIndex + 1);

            return (
              <motion.div
                key={step.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => isClickable && onStepClick?.(step.id)}
                className={cn(
                  'relative flex items-start gap-3 p-3 rounded-sm border transition-all duration-300',
                  isCurrent
                    ? 'border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/5'
                    : isCompleted
                    ? 'border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/50'
                    : 'border-[hsl(var(--border))] bg-transparent',
                  isClickable && 'cursor-pointer hover:border-[hsl(var(--gold))]/50'
                )}
              >
                {/* Step Indicator */}
                <div
                  className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-sm flex items-center justify-center text-xs font-medium transition-all duration-300',
                    isCompleted
                      ? 'bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))]'
                      : isCurrent
                      ? 'bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] ring-2 ring-[hsl(var(--gold))]/30'
                      : 'bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        'text-sm font-medium truncate',
                        isCurrent && 'text-[hsl(var(--gold))]'
                      )}
                    >
                      {step.label}
                    </p>
                    {step.optional && !isCompleted && !isCurrent && (
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-mono">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                    {step.description}
                  </p>
                </div>

                {/* Current Step Indicator */}
                {isCurrent && (
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex-shrink-0 text-[hsl(var(--gold))]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Completion Celebration */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative mt-6 p-4 rounded-sm bg-gradient-to-br from-[hsl(var(--gold))]/10 to-[hsl(var(--gold-light))]/5 border border-[hsl(var(--gold))]/20 overflow-hidden"
          >
            {/* Sparkle effects */}
            <div className="absolute top-2 right-2">
              <motion.div
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="w-5 h-5 text-[hsl(var(--gold))]" />
              </motion.div>
            </div>

            <div className="space-y-2">
              <h4 className="font-display text-base font-semibold text-[hsl(var(--gold))]">
                🎉 Aha Moment!
              </h4>
              <p className="font-body text-sm text-[hsl(var(--foreground))]">
                You&apos;ve successfully enhanced your first photo. Use the slider below to compare the before &amp; after!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
