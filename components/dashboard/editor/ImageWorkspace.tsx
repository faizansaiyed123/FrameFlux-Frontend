'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api/client';
import type { Media } from '@/types/api';
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Download,
} from 'lucide-react';

interface ImageWorkspaceProps {
  media: Media;
  onBack: () => void;
  onProcessed: () => void;
}

export function ImageWorkspace({ media, onBack, onProcessed }: ImageWorkspaceProps) {
  const [operation, setOperation] = useState('scale');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [angle, setAngle] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError('');

    api.getMediaFile(media.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => {
        setError('Unable to load image preview.');
      });

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [media.id]);

  const handleProcess = useCallback(async () => {
    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const data: Record<string, unknown> = { operation };
      if (operation === 'scale' && width && height) {
        data.width = Number(width);
        data.height = Number(height);
      } else if (operation === 'rotate' && angle) {
        data.angle = Number(angle);
      }

      await api.transformMedia(media.id, data as Parameters<typeof api.transformMedia>[1]);
      setSuccess('Image transformation started.');
      onProcessed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setProcessing(false);
    }
  }, [operation, width, height, angle, media.id, onProcessed]);

  const handleDownload = useCallback(async () => {
    try {
      const blob = await api.getMediaFile(media.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = media.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download');
    }
  }, [media.id, media.original_filename]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate max-w-[200px] sm:max-w-[400px]">
              {media.original_filename}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Image Editor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button onClick={handleProcess} disabled={processing} className="bg-indigo-600 hover:bg-indigo-700">
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Apply Transform
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center p-8">
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt={media.original_filename}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              onError={() => setError('Unable to load image preview.')}
            />
          ) : (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto mb-3" />
              <p className="text-xs text-zinc-400">Loading image...</p>
            </div>
          )}
        </div>

        <div className="w-72 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Transform</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Operation</Label>
                <Select value={operation} onValueChange={setOperation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scale">Scale</SelectItem>
                    <SelectItem value="rotate">Rotate</SelectItem>
                    <SelectItem value="crop">Crop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {operation === 'scale' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Width</Label>
                    <Input
                      type="number"
                      placeholder="Width"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Height</Label>
                    <Input
                      type="number"
                      placeholder="Height"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {operation === 'rotate' && (
                <div className="space-y-1">
                  <Label className="text-xs">Angle (degrees)</Label>
                  <Input
                    type="number"
                    placeholder="90"
                    value={angle}
                    onChange={(e) => setAngle(e.target.value)}
                  />
                </div>
              )}

              {operation === 'crop' && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Crop will be applied based on the specified dimensions.
                </p>
              )}
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Image Info</h3>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-zinc-500 dark:text-zinc-400">Dimensions</Label>
                <p className="text-sm text-zinc-900 dark:text-zinc-50">
                  {media.width && media.height ? `${media.width} x ${media.height}` : 'Unknown'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500 dark:text-zinc-400">Type</Label>
                <p className="text-sm text-zinc-900 dark:text-zinc-50">{media.mime_type}</p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500 dark:text-zinc-400">Size</Label>
                <p className="text-sm text-zinc-900 dark:text-zinc-50">
                  {(media.file_size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      {success && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
