'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api/client';
import { Loader2 } from 'lucide-react';

interface Props {
  mediaId: string;
  onProcessed: () => void;
}

export function CompressForm({ mediaId, onProcessed }: Props) {
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('balanced');
  const [bitrate, setBitrate] = useState('');
  const [targetSize, setTargetSize] = useState('');
  const [resolution, setResolution] = useState('original');

  const handleCompress = async () => {
    setLoading(true);
    try {
      let width: number | undefined;
      let height: number | undefined;
      if (resolution !== 'original') {
        const [w, h] = resolution.split('x').map(Number);
        width = w;
        height = h;
      }
      await api.compressMedia(mediaId, {
        format,
        width,
        height,
        compression_preset: quality,
        video_bitrate: bitrate || undefined,
        target_size_mb: targetSize ? Number(targetSize) : undefined,
        resolution: resolution !== 'original' ? resolution : undefined,
      });
      onProcessed();
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Format</Label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger>
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mp4">MP4</SelectItem>
            <SelectItem value="webm">WebM</SelectItem>
            <SelectItem value="mkv">MKV</SelectItem>
            <SelectItem value="mov">MOV</SelectItem>
            <SelectItem value="avi">AVI</SelectItem>
            <SelectItem value="flv">FLV</SelectItem>
            <SelectItem value="mpeg">MPEG</SelectItem>
            <SelectItem value="ts">TS</SelectItem>
            <SelectItem value="m4v">M4V</SelectItem>
            <SelectItem value="3gp">3GP</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Resolution</Label>
        <Select value={resolution} onValueChange={setResolution}>
          <SelectTrigger>
            <SelectValue placeholder="Select resolution" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="original">Original</SelectItem>
            <SelectItem value="640x360">360p (640x360)</SelectItem>
            <SelectItem value="854x480">480p (854x480)</SelectItem>
            <SelectItem value="1280x720">720p (1280x720)</SelectItem>
            <SelectItem value="1920x1080">1080p (1920x1080)</SelectItem>
            <SelectItem value="3840x2160">4K (3840x2160)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Quality Preset</Label>
        <Select value={quality} onValueChange={setQuality}>
          <SelectTrigger>
            <SelectValue placeholder="Select quality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low (smaller file)</SelectItem>
            <SelectItem value="balanced">Balanced</SelectItem>
            <SelectItem value="high">High (better quality)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Target Bitrate (e.g. 2Mbps, optional)</Label>
        <Input value={bitrate} onChange={(e) => setBitrate(e.target.value)} placeholder="e.g. 2M" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="compress-target-size">Target Size (MB, optional)</Label>
        <Input id="compress-target-size" aria-label="Target Size (MB, optional)" type="number" value={targetSize} onChange={(e) => setTargetSize(e.target.value)} min="1" placeholder="e.g. 50" />
      </div>
      <Button onClick={handleCompress} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Compressing...
          </>
        ) : (
          'Compress'
        )}
      </Button>
    </div>
  );
}
