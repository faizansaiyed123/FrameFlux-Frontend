'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/client';
import { Loader2, GitCompare, RefreshCw } from 'lucide-react';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface MediaItem {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  duration: number | null;
  width: number | null;
  height: number | null;
  video_codec: string | null;
  audio_codec: string | null;
  processing_status: string;
}

interface ComparisonResult {
  media_a_id: string;
  media_b_id: string;
  size_diff: number;
  duration_diff: number | null;
  resolution_match: boolean;
  video_codec_match: boolean;
  audio_codec_match: boolean;
  storage_saved: number;
}

export default function ComparisonsPage() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaA, setMediaA] = useState<string>('');
  const [mediaB, setMediaB] = useState<string>('');
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [comparing, setComparing] = useState(false);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listMedia();
      setMediaList(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchMedia();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [fetchMedia]);

  const handleCompare = async () => {
    if (!mediaA || !mediaB || mediaA === mediaB) return;
    setComparing(true);
    try {
      const result = await api.compareMedia(mediaA, mediaB);
      setComparison(result);
    } catch {
      // silent
    } finally {
      setComparing(false);
    }
  };

  const handleSwap = () => {
    const temp = mediaA;
    setMediaA(mediaB);
    setMediaB(temp);
  };

  const handleClear = () => {
    setComparison(null);
    setMediaA('');
    setMediaB('');
  };

  const mediaAData = mediaList.find(m => m.id === mediaA);
  const mediaBData = mediaList.find(m => m.id === mediaB);

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
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Media Comparisons</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Compare two media files to see differences in size, quality, and format</p>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Select Files to Compare</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-4">
              <div className="space-y-2">
                <Label>File A</Label>
                <Select value={mediaA} onValueChange={setMediaA}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select first file" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediaList.map((media) => (
                      <SelectItem key={media.id} value={media.id}>{media.original_filename}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>File B</Label>
                <Select value={mediaB} onValueChange={setMediaB}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select second file" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediaList.map((media) => (
                      <SelectItem key={media.id} value={media.id}>{media.original_filename}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-center">
                <Button variant="ghost" size="icon" onClick={handleSwap} title="Swap files">
                  <RefreshCw className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-4">
              <div className="space-y-2">
                <Label>File A Details</Label>
                {mediaAData ? (
                  <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 space-y-2">
                    <p className="text-sm font-medium truncate">{mediaAData.original_filename}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatFileSize(mediaAData.file_size)}</p>
                    {mediaAData.duration && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{Math.floor(mediaAData.duration / 60)}:{(mediaAData.duration % 60).toFixed(0).padStart(2, '0')}</p>
                    )}
                    {mediaAData.width && mediaAData.height && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{mediaAData.width} × {mediaAData.height}</p>
                    )}
                    {mediaAData.video_codec && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">V: {mediaAData.video_codec}</p>
                    )}
                    {mediaAData.audio_codec && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">A: {mediaAData.audio_codec}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 text-center text-zinc-500 dark:text-zinc-400">
                    Select a file
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1 space-y-4">
              <div className="space-y-2">
                <Label>File B Details</Label>
                {mediaBData ? (
                  <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 space-y-2">
                    <p className="text-sm font-medium truncate">{mediaBData.original_filename}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatFileSize(mediaBData.file_size)}</p>
                    {mediaBData.duration && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{Math.floor(mediaBData.duration / 60)}:{(mediaBData.duration % 60).toFixed(0).padStart(2, '0')}</p>
                    )}
                    {mediaBData.width && mediaBData.height && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{mediaBData.width} × {mediaBData.height}</p>
                    )}
                    {mediaBData.video_codec && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">V: {mediaBData.video_codec}</p>
                    )}
                    {mediaBData.audio_codec && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">A: {mediaBData.audio_codec}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 text-center text-zinc-500 dark:text-zinc-400">
                    Select a file
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button onClick={handleCompare} disabled={comparing || !mediaA || !mediaB || mediaA === mediaB} className="gap-2">
              {comparing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <GitCompare className="h-4 w-4" />
                  Compare
                </>
              )}
            </Button>
            {comparison && (
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {comparison && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Comparison Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ComparisonCard
                title="File Size Difference"
                value={comparison.size_diff > 0 ? `+${formatFileSize(comparison.size_diff)}` : formatFileSize(comparison.size_diff)}
                description={comparison.size_diff > 0 ? 'A is larger' : 'B is larger'}
                color={comparison.size_diff > 0 ? 'red' : 'green'}
              />
              <ComparisonCard
                title="Storage Saved"
                value={formatFileSize(comparison.storage_saved)}
                description={comparison.storage_saved > 0 ? 'Potential savings' : 'No savings'}
                color={comparison.storage_saved > 0 ? 'green' : 'gray'}
              />
              <ComparisonCard
                title="Duration Difference"
                value={comparison.duration_diff !== null ? `${comparison.duration_diff > 0 ? '+' : ''}${comparison.duration_diff.toFixed(1)}s` : 'N/A'}
                description={comparison.duration_diff !== null && comparison.duration_diff > 0 ? 'A is longer' : comparison.duration_diff !== null && comparison.duration_diff < 0 ? 'B is longer' : 'Same'}
                color="blue"
              />
              <ComparisonCard
                title="Total Comparisons"
                value="4 checks"
                description="Resolution, Video, Audio, Size"
                color="indigo"
              />
            </div>

            <div className="space-y-4">
              <ComparisonRow
                label="Resolution Match"
                match={comparison.resolution_match}
                details={mediaAData && mediaBData && mediaAData.width && mediaAData.height && mediaBData.width && mediaBData.height
                  ? `${mediaAData.width}×${mediaAData.height} vs ${mediaBData.width}×${mediaBData.height}`
                  : 'N/A'}
              />
              <ComparisonRow
                label="Video Codec Match"
                match={comparison.video_codec_match}
                details={mediaAData && mediaBData && mediaAData.video_codec && mediaBData.video_codec
                  ? `${mediaAData.video_codec} vs ${mediaBData.video_codec}`
                  : 'N/A'}
              />
              <ComparisonRow
                label="Audio Codec Match"
                match={comparison.audio_codec_match}
                details={mediaAData && mediaBData && mediaAData.audio_codec && mediaBData.audio_codec
                  ? `${mediaAData.audio_codec} vs ${mediaBData.audio_codec}`
                  : 'N/A'}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ComparisonCard({ title, value, description, color }: { title: string; value: string; description: string; color: string }) {
  const colorMap: Record<string, string> = {
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900 text-green-700 dark:text-green-300',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300',
    gray: 'bg-zinc-50 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorMap[color] || colorMap.gray}`}>
      <p className="text-xs font-medium uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs mt-1 opacity-70">{description}</p>
    </div>
  );
}

function ComparisonRow({ label, match, details }: { label: string; match: boolean; details: string }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${match ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
          <span className={`text-sm font-medium ${match ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            {match ? '✓' : '✗'}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-500">{label}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{details}</p>
        </div>
      </div>
      <Badge variant={match ? 'default' : 'destructive'} className="capitalize">
        {match ? 'Match' : 'Mismatch'}
      </Badge>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{children}</label>;
}