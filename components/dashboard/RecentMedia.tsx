'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Media } from '@/types/api';
import { Film, MoreHorizontal, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  queued: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
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
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Recent Media</CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">More options</span>
        </Button>
      </CardHeader>
      <CardContent>
        {media.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 mb-4">
              <Film className="h-6 w-6 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">No media files yet</p>
            <Button size="sm" asChild>
              <Link href="/app/dashboard/media">
                <Plus className="mr-2 h-4 w-4" />
                Upload Media
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {media.map((item) => (
              <Link
                key={item.id}
                href={`/app/dashboard/media/${item.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    <Film className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50 truncate max-w-[200px]">
                      {item.original_filename}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {formatFileSize(item.file_size)} • {item.mime_type}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                    statusColors[item.processing_status] || statusColors.pending
                  )}
                >
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