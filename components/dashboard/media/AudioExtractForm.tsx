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

export function AudioExtractForm({ mediaId }: Props) {
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState('mp3');
  const [bitrate, setBitrate] = useState('192k');
  const [sampleRate, setSampleRate] = useState('');
  const [channels, setChannels] = useState('2');
  const [quality, setQuality] = useState('medium');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const handleExtract = async () => {
    setLoading(true);
    try {
      const blob = await api.extractAudio(mediaId, {
        format, bitrate,
        sample_rate: sampleRate ? parseInt(sampleRate) : undefined,
        channels: channels ? parseInt(channels) : undefined,
        quality_preset: quality,
        start: start ? parseFloat(start) : undefined,
        end: end ? parseFloat(end) : undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio_${mediaId}.${format}`;
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
        <Label>Format</Label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger>
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mp3">MP3</SelectItem>
            <SelectItem value="wav">WAV</SelectItem>
            <SelectItem value="aac">AAC</SelectItem>
            <SelectItem value="flac">FLAC</SelectItem>
            <SelectItem value="ogg">OGG</SelectItem>
            <SelectItem value="m4a">M4A</SelectItem>
            <SelectItem value="opus">Opus</SelectItem>
            <SelectItem value="aiff">AIFF</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Bitrate</Label>
        <Select value={bitrate} onValueChange={setBitrate}>
          <SelectTrigger>
            <SelectValue placeholder="Select bitrate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="128k">128 kbps</SelectItem>
            <SelectItem value="192k">192 kbps</SelectItem>
            <SelectItem value="256k">256 kbps</SelectItem>
            <SelectItem value="320k">320 kbps</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Sample Rate (Hz, optional)</Label>
        <Input
          type="number"
          value={sampleRate}
          onChange={(e) => setSampleRate(e.target.value)}
          placeholder="e.g. 44100"
          min="8000"
          max="384000"
          className="text-xs h-7"
        />
      </div>
      <div className="space-y-2">
        <Label>Channels</Label>
        <Select value={channels} onValueChange={setChannels}>
          <SelectTrigger><SelectValue placeholder="Select channels" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Mono</SelectItem>
            <SelectItem value="2">Stereo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Quality</Label>
        <Select value={quality} onValueChange={setQuality}>
          <SelectTrigger><SelectValue placeholder="Select quality" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Start (optional)</Label>
          <Input type="number" min="0" step="0.01" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>End (optional)</Label>
          <Input type="number" min="0" step="0.01" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <Button onClick={handleExtract} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Extracting...
          </>
        ) : (
          'Extract Audio'
        )}
      </Button>
    </div>
  );
}
