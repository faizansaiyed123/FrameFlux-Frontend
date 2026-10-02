'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api/client';
import type { Media } from '@/types/api';
import { Loader2, RefreshCw, Image as ImageIcon, Plus, Trash2, GripVertical, Layers } from 'lucide-react';

interface OverlayItem {
  id: string;
  operation: 'text' | 'image' | 'watermark';
  text?: string;
  image_filename?: string;
  x: number;
  y: number;
  font_size: number;
  opacity: number;
}

export function OverlayTab({ media, onOverlay, setError }: { media: Media; onOverlay: () => void; setError: (e: string) => void }) {
  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const addOverlay = (operation: 'text' | 'image' | 'watermark') => {
    const newOverlay: OverlayItem = {
      id: Date.now().toString(),
      operation,
      text: operation === 'text' ? 'FrameFlux' : undefined,
      image_filename: operation !== 'text' ? '' : undefined,
      x: 40,
      y: 40,
      font_size: 24,
      opacity: 1,
    };
    setOverlays(prev => [...prev, newOverlay]);
    setSelectedIndex(overlays.length);
  };

  const removeOverlay = (id: string) => {
    setOverlays(prev => prev.filter(o => o.id !== id));
    setSelectedIndex(null);
  };

  const updateOverlay = (id: string, changes: Partial<OverlayItem>) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...changes } : o));
  };

  const handleApply = async () => {
    if (overlays.length === 0) return;
    setProcessing(true); setError('');
    try {
      const overlayData = overlays.map(o => ({
        operation: o.operation,
        text: o.operation === 'text' ? o.text : undefined,
        image_filename: o.image_filename,
        x: o.x,
        y: o.y,
        font_size: o.font_size,
        opacity: o.opacity,
      }));
      await api.overlayMedia(media.id, { overlays: overlayData });
      onOverlay();
    } catch (err) { setError(err instanceof Error ? err.message : 'Overlay failed'); }
    finally { setProcessing(false); }
  };

  const selectedOverlay = overlays.find((_, i) => i === selectedIndex);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-zinc-500">Overlays ({overlays.length})</Label>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-6 w-6 text-xs" onClick={() => addOverlay('text')} title="Add Text" aria-label="Add Text"><ImageIcon className="h-3 w-3" /></Button>
          <Button variant="outline" size="icon" className="h-6 w-6 text-xs" onClick={() => addOverlay('image')} title="Add Image" aria-label="Add Image"><ImageIcon className="h-3 w-3" /></Button>
          <Button variant="outline" size="icon" className="h-6 w-6 text-xs" onClick={() => addOverlay('watermark')} title="Add Watermark" aria-label="Add Watermark"><Layers className="h-3 w-3" /></Button>
        </div>
      </div>

      {overlays.length === 0 ? (
        <Alert className="border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <AlertDescription className="text-[10px]">No overlays added. Click the buttons above to add text, image, or watermark overlays.</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {overlays.map((overlay, index) => (
            <div key={overlay.id} className="rounded-lg border p-2 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-zinc-500 capitalize">{overlay.operation}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-[10px]" onClick={() => setSelectedIndex(selectedIndex === index ? null : index)} title="Edit">
                    <GripVertical className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-[10px] text-red-500" onClick={() => removeOverlay(overlay.id)} title="Remove">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {selectedIndex === index && (
                <div className="space-y-2">
                  {overlay.operation === 'text' && (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-500">Text</Label>
                      <Input
                        value={overlay.text || ''}
                        onChange={(e) => updateOverlay(overlay.id, { text: e.target.value })}
                        className="text-xs h-7"
                      />
                    </div>
                  )}
                  {overlay.operation !== 'text' && (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-500">Image Filename</Label>
                      <Input
                        value={overlay.image_filename || ''}
                        onChange={(e) => updateOverlay(overlay.id, { image_filename: e.target.value })}
                        placeholder="Stored filename"
                        className="text-xs h-7"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-[10px] text-zinc-500">X</Label><Input type="number" value={overlay.x} onChange={(e) => updateOverlay(overlay.id, { x: Number(e.target.value) })} className="text-xs h-7" /></div>
                    <div className="space-y-1"><Label className="text-[10px] text-zinc-500">Y</Label><Input type="number" value={overlay.y} onChange={(e) => updateOverlay(overlay.id, { y: Number(e.target.value) })} className="text-xs h-7" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-[10px] text-zinc-500">Font Size</Label><Input type="number" value={overlay.font_size} onChange={(e) => updateOverlay(overlay.id, { font_size: Number(e.target.value) })} className="text-xs h-7" /></div>
                    <div className="space-y-1"><Label className="text-[10px] text-zinc-500">Opacity</Label><Input type="number" step="0.1" min="0" max="1" value={overlay.opacity} onChange={(e) => updateOverlay(overlay.id, { opacity: Number(e.target.value) })} className="text-xs h-7" /></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Button onClick={handleApply} disabled={processing || overlays.length === 0} className="w-full text-xs">
        {processing ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Applying...</> : <><Layers className="mr-1 h-3.5 w-3.5" />Apply {overlays.length} Overlay{overlays.length !== 1 ? 's' : ''}</>}
      </Button>
      <Alert className="border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <AlertDescription className="text-[10px]">Click an overlay to edit. Image/watermark overlays require an uploaded image filename.</AlertDescription>
      </Alert>
    </div>
  );
}
