'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Aperture, LogOut } from 'lucide-react';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { authClient } from '@/lib/auth-client';

interface HeaderProps {
  navigation?: ReactNode;
  showUserMenu?: boolean;
  variant?: 'default' | 'minimal';
}

export function Header({
  navigation,
  showUserMenu = true,
  variant = 'default'
}: HeaderProps) {
  const session = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
  };
  return (
    <header className="px-6 h-16 flex items-center border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur-md sticky top-0 z-50">
      {/* Top amber accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold-light))] to-transparent opacity-60" />
      
      <Link href="/" className="flex items-center gap-3 group">
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 8, ease: "linear" }}
          className="relative w-8 h-8 bg-[hsl(var(--gold))] rounded-sm flex items-center justify-center"
        >
          <Aperture className="h-4 w-4 text-[hsl(var(--charcoal))]" />
        </motion.div>
        <span className="font-display font-bold text-lg tracking-tight uppercase text-[hsl(var(--foreground))]">
          Luminary Lab
        </span>
      </Link>
      
      <div className="ml-auto flex items-center gap-6">
        {navigation}
        
        {showUserMenu && (
          <nav className="flex gap-8 items-center">
            <Link
              href="/dashboard"
              className="font-body text-xs font-medium uppercase tracking-widest text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors h-9 flex items-center relative group"
            >
              Dashboard
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[hsl(var(--gold))] group-hover:w-full transition-all duration-300" />
            </Link>
            <Link
              href="/pricing"
              className="font-body text-xs font-medium uppercase tracking-widest text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors h-9 flex items-center relative group"
            >
              Pricing
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[hsl(var(--gold))] group-hover:w-full transition-all duration-300" />
            </Link>

            {session.isPending ? (
              // Loading state
              <div className="h-9 w-20 bg-[hsl(var(--muted))] animate-pulse rounded-sm" />
            ) : session.data ? (
              // User is logged in - show user menu
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                  {session.data.user.image && (
                    <img
                      src={session.data.user.image}
                      alt={session.data.user.name || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="font-display font-semibold text-sm">
                    {session.data.user.name || session.data.user.email}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSignOut}
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] h-9 px-3"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              // User is not logged in - show sign in button
              <Link href="/login">
                <Button
                  size="sm"
                  className="bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold-light))] font-display font-semibold rounded-sm h-9 px-6 uppercase tracking-wide text-xs border border-transparent hover:border-[hsl(var(--gold))]"
                >
                  Sign In
                </Button>
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
