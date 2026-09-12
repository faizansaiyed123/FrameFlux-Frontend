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

  const handleCompress = async () => {
    setLoading(true);
    try {
      await api.compressMedia(mediaId, {
        format,
        compression_preset: quality,
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
