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
}

export function PreviewForm({ mediaId }: Props) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'video' | 'gif' | 'thumbnail'>('video');
  const [duration, setDuration] = useState('15');
  const [width, setWidth] = useState('480');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      let blob: Blob;
      let filename: string;
      if (type === 'video') {
        blob = await api.generateVideoPreview(mediaId, { duration: parseFloat(duration), width: parseInt(width) });
        filename = `preview_${mediaId}.mp4`;
      } else if (type === 'gif') {
        blob = await api.generateGifPreview(mediaId, { duration: parseFloat(duration), width: parseInt(width) });
        filename = `preview_${mediaId}.gif`;
      } else {
        blob = await api.generateThumbnailPreview(mediaId, { width: parseInt(width) });
        filename = `preview_${mediaId}.jpg`;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Preview Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as any)}>
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
        <Label>Width (px)</Label>
        <Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} min="100" max="1920" />
      </div>
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
