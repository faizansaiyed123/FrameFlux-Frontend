'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api/client';
import type { Media } from '@/types/api';
import { Loader2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export function TransformTab({ media, onTransform, setError, onSpeedChange }: { media: Media; onTransform: () => void; setError: (e: string) => void; onSpeedChange?: (speed: number) => void }) {
  const [operation, setOperation] = useState('scale');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [angle, setAngle] = useState('');
  const [speed, setSpeed] = useState('1');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    onSpeedChange?.(parseFloat(speed) || 1);
  }, [speed, onSpeedChange]);

  const handleApply = async () => {
    setProcessing(true); setError('');
    try {
      const data: { operation: string; width?: number; height?: number; angle?: number; speed?: number } = { operation };
      if ((operation === 'scale' || operation === 'crop') && width && height) {
        data.width = Number(width); data.height = Number(height);
      }
      if (operation === 'rotate' && angle) {
        const a = Number(angle);
        if ([90, 180, 270, -90, -180, -270].includes(a)) data.angle = a;
        else setError('Rotate angle must be 90, 180, 270, -90, -180 or -270');
      }
      if (operation === 'speed') data.speed = Number(speed);
      await api.transformMedia(media.id, data);
      onTransform();
    } catch (err) { setError(err instanceof Error ? err.message : 'Transform failed'); }
    finally { setProcessing(false); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <div className="space-y-2">
        <Label className="text-[10px] text-zinc-500">Operation</Label>
        <Select value={operation} onValueChange={setOperation}>
          <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="scale">Scale</SelectItem>
            <SelectItem value="rotate">Rotate</SelectItem>
            <SelectItem value="crop">Crop</SelectItem>
            <SelectItem value="flip">Flip (Horizontal)</SelectItem>
            <SelectItem value="flop">Flop (Vertical)</SelectItem>
            <SelectItem value="speed">Speed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {operation !== 'speed' && (operation === 'scale' || operation === 'crop') && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label className="text-[10px] text-zinc-500">Width</Label><Input type="number" placeholder="1280" value={width} onChange={(e) => setWidth(e.target.value)} className="text-xs h-7" /></div>
          <div className="space-y-1"><Label className="text-[10px] text-zinc-500">Height</Label><Input type="number" placeholder="720" value={height} onChange={(e) => setHeight(e.target.value)} className="text-xs h-7" /></div>
        </div>
      )}
      {operation === 'rotate' && (
        <div className="space-y-1">
          <Label className="text-[10px] text-zinc-500">Angle</Label>
          <Select value={angle} onValueChange={setAngle}>
            <SelectTrigger className="text-xs h-7"><SelectValue placeholder="Select angle" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="90">90</SelectItem>
              <SelectItem value="180">180</SelectItem>
              <SelectItem value="270">270</SelectItem>
              <SelectItem value="-90">-90</SelectItem>
              <SelectItem value="-180">-180</SelectItem>
              <SelectItem value="-270">-270</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {operation === 'speed' && (
        <div className="space-y-1">
          <Label className="text-[10px] text-zinc-500">Speed</Label>
          <Input type="number" step="0.25" min="0.25" value={speed} onChange={(e) => setSpeed(e.target.value)} className="text-xs h-7" />
        </div>
      )}
      <Button onClick={handleApply} disabled={processing} className="w-full text-xs" variant="default">
        {processing ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Processing...</> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}Apply Transform
      </Button>
      <Alert className="border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <AlertDescription className="text-[10px]">Flip/Flop mirror the video horizontally or vertically. Speed changes playback rate.</AlertDescription>
      </Alert>
    </div>
  );
}
