"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { IndustrialCard, AmberButton, SectionHeader } from "@/components/ui/industrial-ui";
import { cn } from "@/lib/utils";

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
    id: "starter",
    name: "Starter",
    price: 19,
    interval: "month",
    priceId: "price_starter_monthly",
    features: [
      "20 uploads per month",
      "Basic AI presets",
      "Standard resolution exports",
      "Email support",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: 49,
    interval: "month",
    priceId: "price_professional_monthly",
    popular: true,
    features: [
      "Unlimited uploads",
      "All AI presets",
      "High-resolution exports",
      "Priority processing",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    interval: "month",
    priceId: "price_enterprise_monthly",
    features: [
      "Unlimited uploads",
      "Custom AI training",
      "RAW export options",
      "Dedicated processing",
      "Custom support",
      "API access",
    ],
  },
];

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string, planName: string) => {
    setLoadingPlan(planName);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      window.location.href = `https://checkout.stripe.com/pay/${data.sessionId}`;
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start subscription");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--charcoal))]">
      <div className="film-grain" />
      <div className="scanlines" />

      {/* Header */}
      <header className="px-6 h-16 flex items-center border-b border-[hsl(var(--border))] relative">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold-light))] to-transparent opacity-60" />
        <Link href="/" className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 bg-[hsl(var(--gold))] rounded-sm flex items-center justify-center"
          >
            <Sparkles className="w-4 h-4 text-[hsl(var(--charcoal))]" />
          </motion.div>
          <span className="font-display font-bold text-lg">LUMINARY LAB</span>
        </Link>

        <nav className="ml-auto flex gap-4 items-center">
          <Link
            href="/login"
            className="font-mono text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors"
          >
            Login
          </Link>
          <AmberButton size="sm" href="/register">
            Sign Up
          </AmberButton>
        </nav>
      </header>

      <main className="flex-1 w-full px-4 lg:px-8 py-12">
        {/* Back Link */}
        <div className="mb-8">
          <AmberButton variant="ghost" size="sm" href="/" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Home
          </AmberButton>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <SectionHeader
            label="Pricing"
            title="Simple, Transparent Pricing"
            description="Choose the perfect plan for your photography workflow"
            className="max-w-2xl mx-auto"
          />
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid gap-6 lg:grid-cols-3 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.3 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="px-3 py-1 bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] text-[10px] font-bold uppercase tracking-wider rounded-sm"
                  >
                    Most Popular
                  </span>
                </div>
              )}

              <div
                className={cn(
                  "h-full flex flex-col overflow-hidden rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl relative transition-all duration-300 hover:border-white/20 hover:bg-black/60",
                  plan.popular && "border-[hsl(var(--gold))]/40 hover:border-[hsl(var(--gold))]/60 shadow-[0_0_30px_-15px_hsl(var(--gold))]"
                )}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold-light))] to-transparent opacity-50" />
                )}
                <div className="p-6 flex-1">
                  <div className="text-center mb-6">
                    <h2 className="font-display text-xl font-bold mb-2">{plan.name}</h2>
                    <div className="flex items-baseline justify-center">
                      <span className="font-mono text-4xl font-bold text-[hsl(var(--gold))]">
                        ${plan.price}
                      </span>
                      <span className="text-sm text-[hsl(var(--muted-foreground))] ml-1">
                        /{plan.interval}
                      </span>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                      {plan.name === "Starter" && "Perfect for hobbyists"}
                      {plan.name === "Professional" && "Ideal for professionals"}
                      {plan.name === "Enterprise" && "For teams and studios"}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-sm bg-[hsl(var(--gold))]/10 flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-[hsl(var(--gold))]" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <AmberButton
                    variant={plan.popular ? "primary" : "secondary"}
                    className="w-full"
                    onClick={() => handleSubscribe(plan.priceId, plan.name)}
                    disabled={loadingPlan === plan.name}
                    icon={loadingPlan === plan.name ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                  >
                    {loadingPlan === plan.name ? "Processing..." : `Subscribe to ${plan.name}`}
                  </AmberButton>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            All plans include our core features.{" "}
            <Link href="/docs/features" className="text-[hsl(var(--gold))] hover:underline">
              Learn more
            </Link>
          </p>
        </motion.div>
      </main>

      <footer className="py-6 border-t border-[hsl(var(--border))]">
        <div className="w-full px-4 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            © 2024 LUMINARY LAB SYSTEM
          </p>
          <div className="flex gap-6 text-xs">
            <Link href="/privacy" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
