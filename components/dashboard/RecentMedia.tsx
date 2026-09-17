'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Media } from '@/types/api';
import { Film, Plus, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  pending: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  queued: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  processing: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  failed: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface RecentMediaProps {
  media: Media[];
}

export function RecentMedia({ media }: RecentMediaProps) {
  return (
    <Card className="rounded-2xl border-zinc-200/80 bg-white/90 shadow-[0_10px_35px_-28px_rgba(24,24,27,.5)] dark:border-zinc-800/80 dark:bg-zinc-900/80">
      <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 px-5 py-5 dark:border-zinc-800/80 sm:px-6">
        <div>
          <CardTitle className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Recent Media</CardTitle>
          <p className="mt-1 text-xs text-zinc-400">Latest files in your workspace</p>
        </div>
        <Link href="/app/dashboard/media" className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-white">
          View all <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {media.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-zinc-400 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
              <Film className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">No media files yet</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-zinc-400">Upload a video, audio file, image, or subtitle to start working.</p>
            <Button size="sm" className="mt-5 cursor-pointer rounded-lg" asChild>
              <Link href="/app/dashboard/media">
                <Plus className="mr-2 h-4 w-4" />
                Upload media
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {media.map((item) => (
              <Link
                key={item.id}
                href={`/app/dashboard/media/${item.id}`}
                className="group flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-transparent px-3 py-3.5 outline-none transition-all hover:border-zinc-200 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:border-zinc-800 dark:hover:bg-zinc-950"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-400 dark:ring-violet-900/60">
                    <Film className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="max-w-[260px] truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{item.original_filename}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-400 dark:text-zinc-500">{formatFileSize(item.file_size)} <span className="px-1">•</span> {item.mime_type}</p>
                  </div>
                </div>
                <span className={cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ring-1 ring-inset ring-black/5 dark:ring-white/5', statusColors[item.processing_status] || statusColors.pending)}>
                  {item.processing_status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
