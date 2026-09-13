'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api/client';
import { Loader2, Play, Search } from 'lucide-react';

type BatchJob = {
  job_id: string;
  status: string;
  total: number;
  completed: number;
  failed: number;
  results: BatchJobItem[];
};

type BatchJobItem = {
  media_id: string;
  filename: string;
  status: string;
  progress: number;
  error?: string;
  output_filename?: string;
};

type MediaItem = {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  duration: number | null;
  processing_status: string;
};

export default function BatchPage() {
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [availableMedia, setAvailableMedia] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');
  const [operation, setOperation] = useState('convert');
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<BatchJob | null>(null);
  const [jobLoading, setJobLoading] = useState(false);

  const fetchAvailableMedia = useCallback(async () => {
    setMediaLoading(true);
    try {
      const data = await api.listMedia({ search: mediaSearch });
      setAvailableMedia(data);
    } catch {
      // silent
    } finally {
      setMediaLoading(false);
    }
  }, [mediaSearch]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAvailableMedia();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [fetchAvailableMedia]);

  const toggleMediaSelection = (id: string) => {
    setMediaIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleBatch = async () => {
    setLoading(true);
    try {
      if (mediaIds.length === 0) return;
      const result = await api.batchProcess(mediaIds, operation, {});
      setJob({
        job_id: result.job_id,
        status: result.status,
        total: result.total_items,
        completed: 0,
        failed: 0,
        results: result.results.map(r => ({ ...r, status: 'queued', progress: 0 })),
      });
      setMediaIds([]);
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
            <Label>Select Media Files</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search media files..."
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-64 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg p-2">
              {mediaLoading ? (
                <div className="text-center py-4 text-zinc-500 dark:text-zinc-400">Loading...</div>
              ) : availableMedia.length === 0 ? (
                <div className="text-center py-4 text-zinc-500 dark:text-zinc-400">No media files found</div>
              ) : (
                <div className="space-y-1">
                  {availableMedia.map((media) => (
                    <label key={media.id} className="flex items-center gap-3 p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                      <Checkbox
                        checked={mediaIds.includes(media.id)}
                        onCheckedChange={() => toggleMediaSelection(media.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{media.original_filename}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {media.mime_type} • {media.file_size > 0 ? `${(media.file_size / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'}
                          {media.duration ? ` • ${Math.floor(media.duration / 60)}:${(media.duration % 60).toFixed(0).padStart(2, '0')}` : ''}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{mediaIds.length} file(s) selected</p>
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
          <Button onClick={handleBatch} disabled={loading || mediaIds.length === 0} className="w-full">
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
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {job.results.map((result, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{result.filename}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{result.media_id}</p>
                    {result.error && <p className="text-xs text-red-600 dark:text-red-400">{result.error}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      result.status === 'completed' ? 'default' :
                      result.status === 'failed' ? 'destructive' :
                      result.status === 'processing' ? 'secondary' : 'outline'
                    }>
                      {result.status}
                    </Badge>
                    {result.status === 'processing' && (
                      <div className="w-24 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all"
                          style={{ width: `${result.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
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
