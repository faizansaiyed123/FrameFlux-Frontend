'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar/Sidebar';
import { useAuthStore } from '@/hooks/useAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading your workspace...</p>
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
        <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.055),transparent_34%)] dark:bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.075),transparent_32%)]">
          <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
