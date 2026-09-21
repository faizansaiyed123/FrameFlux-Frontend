'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api/client';
import { Loader2 } from 'lucide-react';

interface Props {
  mediaId: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PreviewForm({ mediaId }: Props) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'video' | 'gif' | 'thumbnail'>('video');
  const [duration, setDuration] = useState('15');
  const [width, setWidth] = useState('480');
  const [height, setHeight] = useState('');
  const [start, setStart] = useState('0');
  const [fps, setFps] = useState('30');
  const [fmt, setFmt] = useState('jpg');
  const [quality, setQuality] = useState('10');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      let blob: Blob;
      let filename: string;
      if (type === 'video') {
        blob = await api.generateVideoPreview(mediaId, {
          duration: parseFloat(duration),
          width: parseInt(width),
          start: parseFloat(start),
          fps: parseInt(fps),
        });
        filename = `preview_${mediaId}.mp4`;
      } else if (type === 'gif') {
        blob = await api.generateGifPreview(mediaId, {
          duration: parseFloat(duration),
          width: parseInt(width),
          start: parseFloat(start),
          fps: parseInt(fps),
          quality: parseInt(quality),
        });
        filename = `preview_${mediaId}.gif`;
      } else {
        blob = await api.generateThumbnailPreview(mediaId, {
          timestamp: parseFloat(start),
          width: parseInt(width),
          height: height ? parseInt(height) : undefined,
          fmt,
        });
        filename = `preview_${mediaId}.${fmt}`;
      }
      downloadBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview generation failed');
    } finally {
      setLoading(false);
    }
  };

  const isThumbnail = type === 'thumbnail';

  return (
    <div className="space-y-4">
      {error && (
        <Alert className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label>Preview Type</Label>
        <Select value={type} onValueChange={(v) => { if (v === 'video' || v === 'gif' || v === 'thumbnail') setType(v); }}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video Preview</SelectItem>
            <SelectItem value="gif">GIF Preview</SelectItem>
            <SelectItem value="thumbnail">Thumbnail</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Duration (seconds)</Label>
        <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="1" max="60" />
      </div>
      <div className="space-y-2">
        <Label>Start Time (seconds)</Label>
        <Input type="number" value={start} onChange={(e) => setStart(e.target.value)} min="0" step="0.1" />
      </div>
      <div className="space-y-2">
        <Label>Frame Rate (fps)</Label>
        <Input type="number" value={fps} onChange={(e) => setFps(e.target.value)} min="1" max="120" />
      </div>
      <div className="space-y-2">
        <Label>Width (px)</Label>
        <Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} min="100" max="1920" />
      </div>
      {!isThumbnail && (
        <div className="space-y-2">
          <Label>Height (px, auto if empty)</Label>
          <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} min="100" max="1080" placeholder="auto" />
        </div>
      )}
      {isThumbnail && (
        <>
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={fmt} onValueChange={setFmt}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jpg">JPG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      {type === 'gif' && (
        <div className="space-y-2">
          <Label>Quality</Label>
          <Select value={quality} onValueChange={setQuality}>
            <SelectTrigger>
              <SelectValue placeholder="Select quality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Low (fast)</SelectItem>
              <SelectItem value="10">Medium</SelectItem>
              <SelectItem value="15">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <Button onClick={handleGenerate} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          'Generate Preview'
        )}
      </Button>
    </div>
  );
}
