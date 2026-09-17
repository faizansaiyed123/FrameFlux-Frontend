'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ArrowUpRight, Circle } from 'lucide-react';

export function NavBar() {
  const { user, loading } = useAuth();

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/70 bg-white/75 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/75">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="FrameFlux home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-current" />
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.02em] text-zinc-950 dark:text-white">FrameFlux</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href="/#features" className="text-sm text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white">Features</Link>
          <Link href="/pricing" className="text-sm text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white">Pricing</Link>
          <Link href="/help-center" className="text-sm text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white">Docs</Link>
        </div>

        {loading ? (
          <div className="h-9 w-28 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        ) : user ? (
          <Link href="/app/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
            Dashboard <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="hidden text-sm font-medium text-zinc-600 transition hover:text-zinc-950 sm:block dark:text-zinc-400 dark:hover:text-white">Sign in</Link>
            <Button asChild size="sm" className="h-9 rounded-lg px-4 shadow-sm">
              <Link href="/auth/signup">Get started <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
