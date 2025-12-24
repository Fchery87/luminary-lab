'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { FormInput } from '@/components/ui/form-input';
import { FormValidator } from '@/lib/validation';
import { Aperture } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSocial, setIsLoadingSocial] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const emailError = FormValidator.required(formData.email, 'Email') || 
                     FormValidator.email(formData.email, 'Email');
    const passwordError = FormValidator.required(formData.password, 'Password') || 
                        FormValidator.minLength(formData.password, 8, 'Password');

    const newErrors: Record<string, string> = {};
    if (emailError) newErrors.email = emailError.message;
    if (passwordError) newErrors.password = passwordError.message;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setIsLoadingSocial(provider);
    try {
      const response = await fetch(`/api/auth/sign-in/${provider}`, {
        method: 'GET',
        redirect: 'manual',
      });

      if (response.status === 302 || response.status === 301) {
        const location = response.headers.get('location');
        if (location) {
          window.location.href = location;
        }
      }
    } catch (error) {
      console.error('Social login error:', error);
      setErrors({
        form: `Failed to sign in with ${provider}. Please try again.`,
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
      const response = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Login failed');
      }

      const data = await response.json();

      if (data.error) {
        setErrors({ form: data.error });
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field] || errors.form) {
      setErrors(prev => ({ ...prev, [field]: '', form: '' }));
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--foreground))] relative selection:bg-[hsl(var(--gold))]/20 overflow-hidden">
        {/* Texture overlays */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.02]">
          <div className="absolute inset-0 grid-pattern" />
        </div>
        
        {/* Amber ambient glow */}
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[hsl(var(--gold))] opacity-[0.02] blur-[200px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-sm w-full space-y-8 z-10 p-8 rounded-sm border border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 backdrop-blur-md shadow-2xl relative"
        >
          {/* Top amber accent line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold-light))] to-transparent opacity-60" />
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 rounded-sm bg-[hsl(var(--gold))] border border-[hsl(var(--gold))]/30 mb-4 relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 border-l-2 border-t-2 border-[hsl(var(--gold))]/30 rounded-tl-sm" />
              <Aperture className="h-6 w-6 text-[hsl(var(--charcoal))]" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              Welcome Back
            </h1>
            <p className="font-body text-[hsl(var(--muted-foreground))] text-sm">
              Sign in to your Luminary Lab account
            </p>
          </div>

          {errors.form && (
            <div className="bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 text-[hsl(var(--destructive))] px-4 py-3 rounded-sm text-sm font-body">
              {errors.form}
            </div>
          )}

          <div className="space-y-4 pt-2">
            <Button
              variant="outline"
              className="w-full h-11 bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--card))] border-[hsl(var(--border))]/50 transition-all hover:border-[hsl(var(--gold))]/40 rounded-sm font-body"
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={isLoadingSocial !== null}
            >
              {isLoadingSocial === 'google' ? (
                <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="mr-2 h-4 w-4" aria-hidden="true" result="0" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {isLoadingSocial === 'google' ? 'Connecting...' : 'Sign in with Google'}
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--card))] border-[hsl(var(--border))]/50 transition-all hover:border-[hsl(var(--gold))]/40 rounded-sm font-body"
              type="button"
              onClick={() => handleSocialLogin('github')}
              disabled={isLoadingSocial !== null}
            >
              {isLoadingSocial === 'github' ? (
                <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="mr-2 h-4 w-4 fill-[hsl(var(--foreground))]" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <title>GitHub</title>
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
              )}
              {isLoadingSocial === 'github' ? 'Connecting...' : 'Sign in with GitHub'}
            </Button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[hsl(var(--border))]/50"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase font-display">
              <span className="bg-[hsl(var(--card))]/80 backdrop-blur-md px-2 text-[hsl(var(--muted-foreground))]">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-4">
              <FormInput
                type="email"
                label="Email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={errors.email}
                required
                disabled={isSubmitting}
                placeholder="Enter your email"
                autoComplete="email"
                className="rounded-sm border-[hsl(var(--border))] bg-[hsl(var(--secondary))] focus:border-[hsl(var(--gold))] font-body"
              />
              
              <FormInput
                type="password"
                label="Password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                error={errors.password}
                required
                disabled={isSubmitting}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="rounded-sm border-[hsl(var(--border))] bg-[hsl(var(--secondary))] focus:border-[hsl(var(--gold))] font-body"
              />
              
              <Button
                type="submit"
                className="w-full h-11 bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold-light))] font-display font-semibold rounded-sm uppercase tracking-wider border border-transparent hover:border-[hsl(var(--gold))]"
                disabled={isSubmitting}
                aria-label="Sign in to your account"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </form>
          
          <p className="text-center text-sm text-[hsl(var(--muted-foreground))] font-body pt-4">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="underline hover:text-[hsl(var(--gold))] transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gold))] focus:ring-offset-2 rounded-sm">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </ErrorBoundary>
  );
}
