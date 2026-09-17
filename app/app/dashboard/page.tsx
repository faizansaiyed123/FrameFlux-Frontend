'use client';

import { useState, useEffect } from 'react';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { RecentMedia } from '@/components/dashboard/RecentMedia';
import { api } from '@/lib/api/client';
import type { DashboardOverviewResponse } from '@/types/api';

function DashboardSkeleton() {
  return (
    <div className="space-y-7">
      <div>
        <div className="h-8 w-36 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-zinc-200/80 bg-white p-6 dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="flex justify-between">
              <div>
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-4 h-9 w-16 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="h-11 w-11 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-zinc-200/80 bg-white p-6 dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="h-5 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-5 space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-14 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/70" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOverview() {
      try {
        const data = await api.getDashboardOverview();
        setOverview(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchOverview();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !overview) {
    return (
      <div className="space-y-7">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">Dashboard</h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">Overview of your media processing activity</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/60 dark:bg-red-950/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error || 'Failed to load dashboard'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">Workspace overview</p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 dark:text-zinc-50">Dashboard</h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">Overview of your media processing activity</p>
        </div>
      </header>

      <StatsCards overview={overview} />
      <div className="grid gap-5 lg:grid-cols-2">
        <RecentProjects projects={overview.recent_projects} />
        <RecentMedia media={overview.recent_media} />
      </div>
    </div>
  );
}
