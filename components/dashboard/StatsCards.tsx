'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { DashboardOverviewResponse } from '@/types/api';
import { FolderOpen, Film, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  overview: DashboardOverviewResponse;
}

export function StatsCards({ overview }: StatsCardsProps) {
  const processing = overview.processing_status_counts.processing + overview.processing_status_counts.queued;
  const completed = overview.processing_status_counts.completed;

  const cards = [
    {
      title: 'Total Projects',
      value: overview.total_projects,
      icon: FolderOpen,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      title: 'Media Files',
      value: overview.total_media,
      icon: Film,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/40',
    },
    {
      title: 'Processing',
      value: processing,
      icon: Zap,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
    },
    {
      title: 'Completed',
      value: completed,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="group rounded-2xl border-zinc-200/80 bg-white/90 shadow-[0_8px_30px_-22px_rgba(24,24,27,.45)] transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_14px_34px_-24px_rgba(24,24,27,.5)] dark:border-zinc-800/80 dark:bg-zinc-900/80 dark:hover:border-zinc-700">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">{card.title}</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">{card.value}</p>
              </div>
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105', card.bg, card.color)}>
                <card.icon className="h-[19px] w-[19px]" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
