'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/client';
import type { JobStatusResponse } from '@/types/api';
import {
  Loader2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  queued: { icon: Clock, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', label: 'Queued' },
  started: { icon: Play, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', label: 'Started' },
  running: { icon: Loader2, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', label: 'Running' },
  complete: { icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', label: 'Complete' },
  failed: { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', label: 'Failed' },
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobStatusResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listJobs();
      setJobs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    const hasActiveJobs = jobs.some((job) => job.status === 'queued' || job.status === 'processing' || job.status === 'running');
    if (!hasActiveJobs) return;

    const interval = setInterval(() => {
      fetchJobs();
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs, fetchJobs]);

  const filtered = jobs.filter((job) => {
    if (filter !== 'all' && job.status !== filter) return false;
    if (search && !job.job_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Jobs</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">Monitor background processing jobs</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Jobs</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">Monitor background processing jobs</p>
        </div>
        <Button variant="outline" onClick={fetchJobs}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="all">All statuses</option>
          <option value="queued">Queued</option>
          <option value="started">Started</option>
          <option value="running">Running</option>
          <option value="complete">Complete</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 mb-4">
              <Clock className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">No jobs found</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm">
              {search || filter !== 'all' ? 'Try adjusting your search or filter criteria.' : 'Jobs will appear here when media processing starts.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((job) => {
            const statusInfo = statusConfig[job.status] || statusConfig.queued;

            return (
              <Card key={job.job_id} className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className={cn('capitalize', statusInfo.color)}>
                          {statusInfo.label}
                        </Badge>
                        <span className="text-sm font-mono text-zinc-500 dark:text-zinc-400">{job.job_id}</span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{job.stage}</p>
                      <div className="w-64">
                        <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{job.progress}%</p>
                      </div>
                    </div>
                  </div>
                  {job.error && (
                    <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900">
                      <p className="text-sm text-red-700 dark:text-red-300">{job.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}