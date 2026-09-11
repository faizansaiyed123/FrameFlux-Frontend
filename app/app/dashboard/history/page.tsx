'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/client';
import type { ProcessingHistoryResponse } from '@/types/api';
import { Loader2, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<string, { color: string; label: string }> = {
  completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', label: 'Completed' },
  failed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', label: 'Failed' },
  processing: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', label: 'Processing' },
  queued: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', label: 'Queued' },
  pending: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Pending' },
};

export default function HistoryPage() {
  const [history, setHistory] = useState<ProcessingHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listHistory();
      setHistory(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded" />
        <div className="h-64 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Processing History</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">View all past processing operations</p>
      </div>

      {history.length === 0 ? (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-6 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">No processing history yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {history.map((entry) => {
            const info = statusConfig[entry.status] || statusConfig.pending;
            return (
              <Card key={entry.id} className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    <History className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 capitalize">{entry.operation}</p>
                      <Badge variant="secondary" className={`${info.color} border-0`}>{info.label}</Badge>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Media ID: {entry.media_id} • {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </p>
                    {entry.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{entry.error}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
