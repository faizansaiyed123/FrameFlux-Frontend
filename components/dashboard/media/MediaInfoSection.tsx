'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import { Loader2 } from 'lucide-react';

interface Props {
  mediaId: string;
}

export function MediaInfoSection({ mediaId }: Props) {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMediaInfo(mediaId);
      setInfo(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [mediaId]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded" />
        <div className="h-4 w-48 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded" />
        <div className="h-4 w-40 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
    );
  }

  if (!info) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No media info available.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">File</p>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{info.file_name}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Size</p>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{(info.file_size / 1024 / 1024).toFixed(1)} MB</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Duration</p>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{info.duration ? `${Math.floor(info.duration / 60)}:${(info.duration % 60).toFixed(0).padStart(2, '0')}` : 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Resolution</p>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{info.resolution || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Video Codec</p>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{info.video_codec || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Audio Codec</p>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{info.audio_codec || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Frame Rate</p>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{info.fps || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Audio Channels</p>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{info.audio_channels || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}
