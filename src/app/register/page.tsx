"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Sparkles, Github } from "lucide-react";

import { IndustrialCard, AmberButton, SectionHeader } from "@/components/ui/industrial-ui";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSocial, setIsLoadingSocial] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSocialLogin = async (provider: "google" | "github") => {
    setIsLoadingSocial(provider);
    try {
      const response = await fetch(`/api/auth/sign-in/${provider}`, {
        method: "GET",
        credentials: "include",
        redirect: "manual",
      });

      if (response.status === 302 || response.status === 301) {
        const location = response.headers.get("location");
        if (location) {
          window.location.href = location;
        }
      }
    } catch (error) {
      setErrors({
        form: `Failed to sign up with ${provider}. Please try again.`,
      });
    } finally {
      setIsLoadingSocial(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Registration failed");
      }

      const data = await response.json();

      if (data.error) {
        setErrors({ form: data.error });
      } else {
        window.location.href = "/dashboard";
      }
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--charcoal))] p-4">
      <div className="film-grain" />
      <div className="scanlines" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 bg-[hsl(var(--gold))] rounded-sm flex items-center justify-center"
            >
              <Sparkles className="w-5 h-5 text-[hsl(var(--charcoal))]" />
            </motion.div>
            <span className="font-display font-bold text-xl">LUMINARY LAB</span>
          </Link>
        </div>

        <IndustrialCard accent>
          <div className="p-6">
            <SectionHeader
              label="Get Started"
              title="Create Account"
              description="Join Luminary Lab for AI-powered editing"
              className="mb-6 text-center"
            />

            {errors.form && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-sm text-sm text-red-400">
                {errors.form}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                  className={cn(
                    "w-full px-4 py-3 bg-[hsl(var(--secondary))] border rounded-sm text-sm focus:outline-none transition-colors",
                    errors.name
                      ? "border-red-500 focus:border-red-500"
                      : "border-[hsl(var(--border))] focus:border-[hsl(var(--gold))]"
                  )}
                  placeholder="Enter your full name"
                />
                {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: "" });
                  }}
                  className={cn(
                    "w-full px-4 py-3 bg-[hsl(var(--secondary))] border rounded-sm text-sm focus:outline-none transition-colors",
                    errors.email
                      ? "border-red-500 focus:border-red-500"
                      : "border-[hsl(var(--border))] focus:border-[hsl(var(--gold))]"
                  )}
                  placeholder="you@example.com"
                />
                {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password) setErrors({ ...errors, password: "" });
                  }}
                  className={cn(
                    "w-full px-4 py-3 bg-[hsl(var(--secondary))] border rounded-sm text-sm focus:outline-none transition-colors",
                    errors.password
                      ? "border-red-500 focus:border-red-500"
                      : "border-[hsl(var(--border))] focus:border-[hsl(var(--gold))]"
                  )}
                  placeholder="Create a password (min 8 characters)"
                />
                {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
                  }}
                  className={cn(
                    "w-full px-4 py-3 bg-[hsl(var(--secondary))] border rounded-sm text-sm focus:outline-none transition-colors",
                    errors.confirmPassword
                      ? "border-red-500 focus:border-red-500"
                      : "border-[hsl(var(--border))] focus:border-[hsl(var(--gold))]"
                  )}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-400">{errors.confirmPassword}</p>
                )}
              </div>

              <AmberButton
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {isSubmitting ? "Creating account..." : "Create Account"}
              </AmberButton>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[hsl(var(--border))]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSocialLogin("google")}
                  disabled={!!isLoadingSocial}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[hsl(var(--border))] rounded-sm hover:border-[hsl(var(--gold))] transition-colors disabled:opacity-50"
                >
                  {isLoadingSocial === "google" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span className="text-sm">Google</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialLogin("github")}
                  disabled={!!isLoadingSocial}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[hsl(var(--border))] rounded-sm hover:border-[hsl(var(--gold))] transition-colors disabled:opacity-50"
                >
                  {isLoadingSocial === "github" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Github className="w-4 h-4" />
                      <span className="text-sm">GitHub</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Already have an account?{" "}
                <Link href="/login" className="text-[hsl(var(--gold))] hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </IndustrialCard>
      </motion.div>
    </div>
  );
}
