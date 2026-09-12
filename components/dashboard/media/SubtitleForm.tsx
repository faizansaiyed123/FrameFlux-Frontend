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

export function SubtitleForm({ mediaId }: Props) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'burn' | 'mux' | 'tracks' | 'sync'>('burn');
  const [subtitlePath, setSubtitlePath] = useState('');
  const [fontSize, setFontSize] = useState('24');
  const [fontColor, setFontColor] = useState('white');
  const [position, setPosition] = useState('bottom');

  const handleAction = async () => {
    setLoading(true);
    try {
      if (action === 'burn') {
        await api.burnSubtitles(mediaId, subtitlePath, { font_size: parseInt(fontSize), font_color: fontColor, position });
      } else if (action === 'mux') {
        await api.muxSubtitles(mediaId, subtitlePath, { language: 'und' });
      } else if (action === 'tracks') {
        const tracks = await api.listSubtitleTracks(mediaId);
        console.log('Subtitle tracks:', tracks);
      } else if (action === 'sync') {
        await api.syncSubtitles(mediaId, { offset_seconds: 0, scale: 1 });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Action</Label>
        <Select value={action} onValueChange={(v) => setAction(v as any)}>
          <SelectTrigger>
            <SelectValue placeholder="Select action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="burn">Burn Subtitles</SelectItem>
            <SelectItem value="mux">Mux Soft Subtitles</SelectItem>
            <SelectItem value="tracks">List Tracks</SelectItem>
            <SelectItem value="sync">Sync Subtitles</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(action === 'burn' || action === 'mux') && (
        <div className="space-y-2">
          <Label>Subtitle Path</Label>
          <Input value={subtitlePath} onChange={(e) => setSubtitlePath(e.target.value)} placeholder="e.g. subs.srt" />
        </div>
      )}
      {action === 'burn' && (
        <>
          <div className="space-y-2">
            <Label>Font Size</Label>
            <Input type="number" value={fontSize} onChange={(e) => setFontSize(e.target.value)} min="12" max="72" />
          </div>
          <div className="space-y-2">
            <Label>Font Color</Label>
            <Select value={fontColor} onValueChange={setFontColor}>
              <SelectTrigger>
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="white">White</SelectItem>
                <SelectItem value="yellow">Yellow</SelectItem>
                <SelectItem value="cyan">Cyan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Position</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
                <SelectItem value="center">Center</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      <Button onClick={handleAction} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Run'
        )}
      </Button>
    </div>
  );
}
