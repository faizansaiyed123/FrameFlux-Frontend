'use client';

import { useState, useEffect } from 'react';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { RecentMedia } from '@/components/dashboard/RecentMedia';
import { api } from '@/lib/api/client';
import type { DashboardOverviewResponse } from '@/types/api';

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Overview of your media processing activity</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="h-4 w-24 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded mb-4" />
            <div className="h-8 w-16 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded" />
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="h-5 w-32 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-12 w-full animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded" />
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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Dashboard</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">Overview of your media processing activity</p>
        </div>
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-6">
          <p className="text-sm text-red-700 dark:text-red-300">{error || 'Failed to load dashboard'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Overview of your media processing activity</p>
      </div>

      <StatsCards overview={overview} />
      <div className="grid gap-8 lg:grid-cols-2">
        <RecentProjects projects={overview.recent_projects} />
        <RecentMedia media={overview.recent_media} />
      </div>
    </div>
  );
}