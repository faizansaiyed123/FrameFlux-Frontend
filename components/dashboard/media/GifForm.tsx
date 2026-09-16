'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api/client';
import { Loader2, Download } from 'lucide-react';

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

export function GifForm({ mediaId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState('0');
  const [duration, setDuration] = useState('5');
  const [width, setWidth] = useState('480');
  const [fps, setFps] = useState('15');
  const [quality, setQuality] = useState('10');

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const blob = await api.generateGif(mediaId, {
        start: parseFloat(start),
        duration: parseFloat(duration),
        width: parseInt(width),
        fps: parseInt(fps),
        quality: parseInt(quality),
      });
      downloadBlob(blob, `gif_${mediaId}.gif`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GIF generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label>Start Time (seconds)</Label>
        <Input type="number" step="0.1" value={start} onChange={(e) => setStart(e.target.value)} min="0" />
      </div>
      <div className="space-y-2">
        <Label>Duration (seconds)</Label>
        <Input type="number" step="0.1" value={duration} onChange={(e) => setDuration(e.target.value)} min="0.5" max="30" />
      </div>
      <div className="space-y-2">
        <Label>Width (px)</Label>
        <Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} min="100" max="1280" />
      </div>
      <div className="space-y-2">
        <Label>Frame Rate (fps)</Label>
        <Select value={fps} onValueChange={setFps}>
          <SelectTrigger>
            <SelectValue placeholder="Select fps" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 FPS</SelectItem>
            <SelectItem value="12">12 FPS</SelectItem>
            <SelectItem value="15">15 FPS</SelectItem>
            <SelectItem value="20">20 FPS</SelectItem>
            <SelectItem value="24">24 FPS</SelectItem>
            <SelectItem value="30">30 FPS</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Quality (1-31, lower = better)</Label>
        <Select value={quality} onValueChange={setQuality}>
          <SelectTrigger>
            <SelectValue placeholder="Select quality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">High Quality (5)</SelectItem>
            <SelectItem value="10">Medium (10)</SelectItem>
            <SelectItem value="15">Low (15)</SelectItem>
            <SelectItem value="20">Fast (20)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Lower = better quality, larger file</p>
      </div>
      <Button onClick={handleGenerate} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating GIF...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Generate & Download GIF
          </>
        )}
      </Button>
    </div>
  );
}