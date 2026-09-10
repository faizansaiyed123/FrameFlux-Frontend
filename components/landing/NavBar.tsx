'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export function NavBar() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="text-xl font-semibold">FrameFlux</span>
          <div className="flex items-center gap-4">
            <div className="h-8 w-24 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-8 w-24 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded" />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          FrameFlux
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/app/dashboard"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
              >
                Dashboard
              </Link>
              <Button variant="ghost" size="sm" onClick={() => {}} className="text-sm">
                {user.full_name || user.email}
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
              >
                Sign in
              </Link>
              <Button size="sm" asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}