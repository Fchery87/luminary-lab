'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  priceId: string;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    interval: 'month',
    priceId: 'price_starter_monthly',
    features: [
      '20 uploads per month',
      'Basic AI presets',
      'Standard resolution exports',
      'Email support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 49,
    interval: 'month',
    priceId: 'price_professional_monthly',
    popular: true,
    features: [
      'Unlimited uploads',
      'All AI presets',
      'High-resolution exports',
      'Priority processing',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    interval: 'month',
    priceId: 'price_enterprise_monthly',
    features: [
      'Unlimited uploads',
      'Custom AI training',
      'RAW export options',
      'Dedicated processing',
      'Custom support',
      'API access',
    ],
  },
];

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string, planName: string) => {
    setLoadingPlan(planName);
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      window.location.href = `https://checkout.stripe.com/pay/${data.sessionId}`;
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start subscription');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))] relative overflow-x-hidden">
      {/* Texture overlays */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] z-0">
        <div className="absolute inset-0 grid-pattern" />
      </div>
      
      {/* Amber ambient glow */}
      <div className="fixed top-1/4 left-0 w-[600px] h-[600px] rounded-full bg-[hsl(var(--gold))] opacity-[0.02] blur-[200px] pointer-events-none" />

      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur-md sticky top-0 z-50 relative">
        {/* Top amber accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold-light))] to-transparent opacity-60" />
        
        <Link href="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 8, ease: "linear" }}
            className="relative w-8 h-8 bg-[hsl(var(--gold))] rounded-sm flex items-center justify-center"
          >
            <Sparkles className="h-4 w-4 text-[hsl(var(--charcoal))]" />
          </motion.div>
          <span className="font-display font-bold text-xl tracking-tight text-[hsl(var(--foreground))]">
            Luminary Lab
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link href="/login" className="font-body text-sm font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors flex items-center h-8 relative group">
            Login
            <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[hsl(var(--gold))] group-hover:w-full transition-all duration-300" />
          </Link>
          <Link href="/register">
            <Button 
              size="sm" 
              className="bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold-light))] font-display font-semibold rounded-sm h-8 px-4 uppercase tracking-wide text-xs border border-transparent hover:border-[hsl(var(--gold))]"
            >
              Sign Up
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1 relative z-10">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
            >
              <div className="space-y-2 relative">
                <div className="absolute -left-6 top-0 w-12 h-12 border-l-2 border-t-2 border-[hsl(var(--gold))]/30 rounded-tl-sm" />
                <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter text-[hsl(var(--foreground))]">
                  Simple, <span className="text-shimmer">Transparent Pricing</span>
                </h1>
                <p className="font-body mx-auto max-w-[700px] text-[hsl(var(--muted-foreground))] md:text-xl">
                  Choose the perfect plan for your photography workflow
                </p>
              </div>
            </motion.div>
            
            <div className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto w-full">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                  className="relative h-full"
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                      <Badge className="bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold-light))] uppercase tracking-widest text-[10px] py-1 px-3 shadow-sm whitespace-nowrap rounded-sm">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <div
                    className={`relative h-full flex flex-col border rounded-sm p-0 ${
                      plan.popular 
                        ? 'border-[hsl(var(--gold))]/50 shadow-[0_0_20px_-4px_rgba(212,175,55,0.1)] bg-[hsl(var(--card))]' 
                        : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
                    } backdrop-blur-sm`}
                  >
                    {/* Top amber accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--gold-light))]/50 to-transparent opacity-40" />
                    
                    <CardHeader className="text-center pt-8 pb-4 border-b border-[hsl(var(--border))]/10">
                      <CardTitle className="font-display text-2xl font-bold text-[hsl(var(--foreground))]">
                        {plan.name}
                      </CardTitle>
                      <div className="mt-4 flex items-baseline justify-center relative">
                        <div className="absolute -top-2 -left-3 w-8 h-[1px] bg-[hsl(var(--gold))]/30" />
                        <span className="font-mono text-4xl font-black tracking-tight text-[hsl(var(--gold))]">${plan.price}</span>
                        <span className="font-body text-[hsl(var(--muted-foreground))] ml-1">/{plan.interval}</span>
                      </div>
                      <CardDescription className="font-body pt-2 text-[hsl(var(--muted-foreground))]/80">
                        {plan.name === 'Starter' && 'Perfect for hobbyists and beginners'}
                        {plan.name === 'Professional' && 'Ideal for professional photographers'}
                        {plan.name === 'Enterprise' && 'For teams and studios'}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="flex-1 p-6">
                      <ul className="space-y-4">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start">
                            <div className="mr-3 mt-1 bg-[hsl(var(--gold))]/10 rounded-sm p-0.5">
                              <Check className="h-3 w-3 text-[hsl(var(--gold))]" />
                            </div>
                            <span className="font-body text-sm text-[hsl(var(--foreground))]/80 font-medium">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <div className="p-6 pt-0 mt-auto">
                      <Button
                        className={`w-full h-11 font-display uppercase tracking-wider font-semibold rounded-sm ${
                          plan.popular 
                            ? 'bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold-light))] shadow-sm' 
                            : 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]/80'
                        }`}
                        variant={plan.popular ? 'default' : 'outline'}
                        onClick={() => handleSubscribe(plan.priceId, plan.name)}
                        disabled={loadingPlan === plan.name}
                      >
                        {loadingPlan === plan.name ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          `Subscribe to ${plan.name}`
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-16 text-center"
            >
              <p className="font-body text-[hsl(var(--muted-foreground))]">
                All plans include our core features.{' '}
                <Link href="/docs/features" className="underline hover:text-[hsl(var(--gold))] transition-colors">
                  Learn more
                </Link>
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      
      <footer className="py-6 md:px-8 border-t border-[hsl(var(--border))] relative z-10 bg-[hsl(var(--background))]/50 backdrop-blur">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="font-mono text-center text-xs leading-loose text-[hsl(var(--muted-foreground))] md:text-left">
             © 2024 LUMINARY LAB SYSTEM. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center space-x-6 text-xs font-body font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            <Link href="/privacy" className="hover:text-[hsl(var(--gold))] transition-colors relative group">
              Privacy
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[hsl(var(--gold))] group-hover:w-full transition-all duration-300" />
            </Link>
            <Link href="/terms" className="hover:text-[hsl(var(--gold))] transition-colors relative group">
              Terms
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[hsl(var(--gold))] group-hover:w-full transition-all duration-300" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
