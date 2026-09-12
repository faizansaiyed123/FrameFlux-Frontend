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

export function ThumbnailForm({ mediaId }: Props) {
  const [loading, setLoading] = useState(false);
  const [timestamp, setTimestamp] = useState('0');
  const [fmt, setFmt] = useState('jpg');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const blob = await api.getThumbnail(mediaId, parseFloat(timestamp), undefined, undefined, fmt);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thumbnail_${mediaId}.${fmt}`;
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
        <Label>Timestamp (seconds)</Label>
        <Input type="number" value={timestamp} onChange={(e) => setTimestamp(e.target.value)} min="0" step="0.1" />
      </div>
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
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleGenerate} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          'Generate Thumbnail'
        )}
      </Button>
    </div>
  );
}
