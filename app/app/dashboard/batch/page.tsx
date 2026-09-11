'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/client';
import { Loader2, Play, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type BatchJob = {
  job_id: string;
  status: string;
  total: number;
  completed: number;
  failed: number;
  results: any[];
};

export default function BatchPage() {
  const [mediaIds, setMediaIds] = useState('');
  const [operation, setOperation] = useState('convert');
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<BatchJob | null>(null);
  const [jobLoading, setJobLoading] = useState(false);

  const handleBatch = async () => {
    setLoading(true);
    try {
      const ids = mediaIds.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length === 0) return;
      const result = await api.batchProcess(ids, operation);
      setJob({
        job_id: result.job_id,
        status: result.status,
        total: result.total_items,
        completed: 0,
        failed: 0,
        results: result.results,
      });
      setMediaIds('');
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const fetchJobStatus = useCallback(async () => {
    if (!job) return;
    setJobLoading(true);
    try {
      const status = await api.getBatchStatus(job.job_id);
      setJob({ ...job, ...status });
    } catch {
      // silent
    } finally {
      setJobLoading(false);
    }
  }, [job]);

  useEffect(() => {
    if (!job || job.status === 'completed' || job.status === 'failed') return;
    const interval = setInterval(fetchJobStatus, 2000);
    return () => clearInterval(interval);
  }, [job, fetchJobStatus]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Batch Processing</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Apply the same operation to multiple media files</p>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>New Batch Job</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Media IDs (comma-separated)</Label>
            <Input
              value={mediaIds}
              onChange={(e) => setMediaIds(e.target.value)}
              placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000, 123e4567-e89b-12d3-a456-426614174001"
            />
          </div>
          <div className="space-y-2">
            <Label>Operation</Label>
            <Select value={operation} onValueChange={setOperation}>
              <SelectTrigger>
                <SelectValue placeholder="Select operation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="convert">Convert</SelectItem>
                <SelectItem value="compress">Compress</SelectItem>
                <SelectItem value="extract_audio">Extract Audio</SelectItem>
                <SelectItem value="generate_thumbnail">Generate Thumbnail</SelectItem>
                <SelectItem value="generate_preview">Generate Preview</SelectItem>
                <SelectItem value="trim">Trim</SelectItem>
                <SelectItem value="cut">Cut</SelectItem>
                <SelectItem value="crop">Crop</SelectItem>
                <SelectItem value="resize">Resize</SelectItem>
                <SelectItem value="rotate">Rotate</SelectItem>
                <SelectItem value="remove_audio">Remove Audio</SelectItem>
                <SelectItem value="replace_audio">Replace Audio</SelectItem>
                <SelectItem value="add_subtitles">Add Subtitles</SelectItem>
                <SelectItem value="create_gif">Create GIF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleBatch} disabled={loading || !mediaIds.trim()} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Batch Job
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {job && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Batch Job Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Job ID: {job.job_id}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {job.total} total • {job.completed} completed • {job.failed} failed
                </p>
              </div>
              <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                {job.status}
              </Badge>
            </div>
            <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all"
                style={{ width: `${job.total > 0 ? (job.completed / job.total) * 100 : 0}%` }}
              />
            </div>
            <div className="space-y-2">
              {job.results.map((result: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Media: {result.media_id}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{result.filename}</p>
                  </div>
                  <Badge variant="secondary">Queued</Badge>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={fetchJobStatus} disabled={jobLoading}>
              {jobLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh Status
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
