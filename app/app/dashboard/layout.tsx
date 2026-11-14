'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar/Sidebar';
import { useAuthStore } from '@/hooks/useAuth';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const isDemo = useAuthStore((state) => state.isDemo);
  const demoExpiresAt = useAuthStore((state) => state.demoExpiresAt);
  const endDemo = useAuthStore((state) => state.endDemo);
  const [endingDemo, setEndingDemo] = useState(false);
  const [endError, setEndError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  const handleEndDemo = async () => {
    if (endingDemo) return;
    setEndingDemo(true);
    setEndError('');
    try {
      await endDemo();
      router.replace('/');
    } catch (error) {
      setEndError(
        error instanceof Error
          ? error.message
          : 'The demo session could not be ended cleanly.',
      );
      router.replace('/');
    } finally {
      setEndingDemo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div
            className={`
            h-8 w-8 animate-spin rounded-full border-2 border-indigo-600
            border-t-transparent
          `}
          />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Sidebar className="hidden w-[272px] shrink-0 md:flex" />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div
          className={`
          min-h-full
          bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.055),transparent_34%)]
          dark:bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.075),transparent_32%)]
        `}
        >
          {isDemo && (
            <div className="border-b border-indigo-200 bg-indigo-50/90 px-5 py-3 dark:border-indigo-900/60 dark:bg-indigo-950/35 sm:px-7 lg:px-10">
              <div className="mx-auto flex max-w-[1440px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-indigo-950 dark:text-indigo-100">
                      Recruiter demo workspace
                    </p>
                    <p className="mt-0.5 text-[11px] leading-5 text-indigo-800/80 dark:text-indigo-200/75">
                      Synthetic data only. This temporary workspace expires
                      {demoExpiresAt
                        ? ` ${new Date(demoExpiresAt).toLocaleString()}`
                        : ' automatically'}.
                      End it to revoke access and start deleting its data.
                    </p>
                    {endError && (
                      <p role="status" className="mt-1 text-[11px] text-red-700 dark:text-red-300">
                        {endError} The session will still expire automatically.
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 cursor-pointer border-indigo-300 bg-white/80 text-indigo-800 hover:bg-white dark:border-indigo-800 dark:bg-zinc-950/60 dark:text-indigo-200 dark:hover:bg-zinc-950"
                  onClick={handleEndDemo}
                  disabled={endingDemo}
                >
                  {endingDemo ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Ending session…
                    </>
                  ) : (
                    'End demo & delete data'
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
