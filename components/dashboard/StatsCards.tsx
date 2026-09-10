'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { DashboardOverviewResponse } from '@/types/api';
import {
  FolderOpen,
  Film,
  Zap,
  TrendingUp,
} from 'lucide-react';
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
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Media Files',
      value: overview.total_media,
      icon: Film,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Processing',
      value: processing,
      icon: Zap,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      title: 'Completed',
      value: completed,
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{card.title}</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">{card.value}</p>
              </div>
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', card.bg, card.color)}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}