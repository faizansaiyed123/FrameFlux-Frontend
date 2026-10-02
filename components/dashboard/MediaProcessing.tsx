'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wand2, Scissors, Merge, RefreshCw, Snowflake, Image, Split, ClipboardList } from 'lucide-react';

interface MediaProcessingProps {
  mediaId: string;
  onProcessed?: () => void;
}

type OperationType = 'convert' | 'edit' | 'merge' | 'transform' | 'freeze' | 'overlay' | 'split' | 'clips';

const tools = [
  { id: 'convert', label: 'Convert', icon: Wand2, description: 'Change format, resolution, or bitrate' },
  { id: 'edit', label: 'Trim / Cut', icon: Scissors, description: 'Cut or extract segments' },
  { id: 'merge', label: 'Merge', icon: Merge, description: 'Combine multiple media files' },
  { id: 'transform', label: 'Transform', icon: RefreshCw, description: 'Scale, rotate, crop, or speed' },
  { id: 'freeze', label: 'Freeze Frame', icon: Snowflake, description: 'Pause at a specific moment' },
  { id: 'overlay', label: 'Overlay', icon: Image, description: 'Add text or watermark' },
  { id: 'split', label: 'Split', icon: Split, description: 'Divide into multiple parts' },
  { id: 'clips', label: 'Clips', icon: ClipboardList, description: 'Keep, delete, reorder, or append' },
] as const;

export function MediaProcessing({ mediaId, onProcessed }: MediaProcessingProps) {
  const [operation, setOperation] = useState<OperationType>('convert');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      switch (operation) {
        case 'convert':
          await api.convertMedia(mediaId, data as Parameters<typeof api.convertMedia>[1]);
          break;
        case 'edit':
          await api.editMedia(mediaId, data as Parameters<typeof api.editMedia>[1]);
          break;
        case 'merge':
          await api.mergeMedia(mediaId, data.media_ids as string[]);
          break;
        case 'transform':
          await api.transformMedia(mediaId, data as Parameters<typeof api.transformMedia>[1]);
          break;
        case 'freeze':
          await api.freezeFrame(mediaId, data.timestamp as number, data.duration as number);
          break;
        case 'overlay':
          await api.overlayMedia(mediaId, data as Parameters<typeof api.overlayMedia>[1]);
          break;
        case 'split':
          await api.splitMedia(mediaId, data.split_points as number[]);
          break;
        case 'clips':
          if (data.sub_operation === 'keep') {
            await api.keepClips(mediaId, data.clips as { start: number; end: number }[]);
          } else if (data.sub_operation === 'delete') {
            await api.deleteClips(mediaId, data.clips as { start: number; end: number }[]);
          } else if (data.sub_operation === 'reorder') {
            await api.reorderClips(mediaId, data.media_ids as string[]);
          } else if (data.sub_operation === 'append') {
            await api.appendClips(mediaId, data.media_ids as string[]);
          }
          break;
      }

      setSuccess('Processing started. This may take a few minutes.');
      onProcessed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    switch (operation) {
      case 'convert':
        return <ConvertForm onSubmit={handleSubmit} loading={loading} />;
      case 'edit':
        return <EditForm onSubmit={handleSubmit} loading={loading} />;
      case 'merge':
        return <MergeForm onSubmit={handleSubmit} loading={loading} />;
      case 'transform':
        return <TransformForm onSubmit={handleSubmit} loading={loading} />;
      case 'freeze':
        return <FreezeForm onSubmit={handleSubmit} loading={loading} />;
      case 'overlay':
        return <OverlayForm onSubmit={handleSubmit} loading={loading} />;
      case 'split':
        return <SplitForm onSubmit={handleSubmit} loading={loading} />;
      case 'clips':
        return <ClipsForm onSubmit={handleSubmit} loading={loading} />;
      default:
        return null;
    }
  };

  const activeTool = tools.find((t) => t.id === operation);

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Video Editor</CardTitle>
        <CardDescription>Select a tool below to edit or enhance your media</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = operation === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => { setOperation(tool.id as OperationType); resetForm(); }}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{tool.label}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{tool.description}</span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
          <div className="flex items-center gap-2 mb-4">
            {activeTool && <activeTool.icon className="h-4 w-4 text-zinc-500" />}
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {activeTool?.label} Settings
            </h3>
          </div>
          {renderForm()}
        </div>
      </CardContent>
    </Card>
  );
}

function ConvertForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading: boolean }) {
  const [format, setFormat] = useState('mp4');
  const [resolution, setResolution] = useState('');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [fpsPreset, setFpsPreset] = useState('');
  const [customFps, setCustomFps] = useState('');
  const [aspectRatioPreset, setAspectRatioPreset] = useState('');
  const [customAspectRatio, setCustomAspectRatio] = useState('');
  const [videoBitrate, setVideoBitrate] = useState('');
  const [audioBitrate, setAudioBitrate] = useState('');
  const [videoCodec, setVideoCodec] = useState('');
  const [audioCodec, setAudioCodec] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = { format };
    if (resolution) data.resolution = resolution;
    if (customWidth && customHeight) {
      data.width = Number(customWidth);
      data.height = Number(customHeight);
    }
    if (fpsPreset) data.fps_preset = fpsPreset;
    if (customFps) data.fps = Number(customFps);
    if (aspectRatioPreset) data.aspect_ratio_preset = aspectRatioPreset;
    if (customAspectRatio) data.aspect_ratio = customAspectRatio;
    if (videoBitrate) data.video_bitrate = videoBitrate;
    if (audioBitrate) data.audio_bitrate = audioBitrate;
    if (videoCodec) data.video_codec = videoCodec;
    if (audioCodec) data.audio_codec = audioCodec;
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="format">Output Format</Label>
          <Select value={format} onValueChange={(v) => { setFormat(v); if (v === 'webm') { setVideoCodec('vp9'); setAudioCodec(''); } }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mp4">MP4</SelectItem>
              <SelectItem value="webm">WebM</SelectItem>
              <SelectItem value="mov">MOV</SelectItem>
              <SelectItem value="avi">AVI</SelectItem>
              <SelectItem value="mkv">MKV</SelectItem>
              <SelectItem value="flv">FLV</SelectItem>
              <SelectItem value="mpeg">MPEG</SelectItem>
              <SelectItem value="ts">TS</SelectItem>
              <SelectItem value="m4v">M4V</SelectItem>
              <SelectItem value="3gp">3GP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="resolution">Resolution Preset</Label>
          <Select value={resolution} onValueChange={setResolution}>
            <SelectTrigger>
              <SelectValue placeholder="Keep original" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Keep original</SelectItem>
              <SelectItem value="144p">144p</SelectItem>
              <SelectItem value="240p">240p</SelectItem>
              <SelectItem value="360p">360p</SelectItem>
              <SelectItem value="480p">480p</SelectItem>
              <SelectItem value="720p">720p</SelectItem>
              <SelectItem value="1080p">1080p</SelectItem>
              <SelectItem value="1440p">1440p</SelectItem>
              <SelectItem value="2160p">4K (2160p)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="videoCodec">Video Codec</Label>
          <Select value={videoCodec} onValueChange={setVideoCodec}>
            <SelectTrigger>
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Default</SelectItem>
              <SelectItem value="h264">H.264</SelectItem>
              <SelectItem value="h265">H.265</SelectItem>
              <SelectItem value="vp8">VP8</SelectItem>
              <SelectItem value="vp9">VP9</SelectItem>
              <SelectItem value="av1">AV1</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customWidth">Custom Width</Label>
          <Input id="customWidth" type="number" placeholder="e.g. 1920" value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customHeight">Custom Height</Label>
          <Input id="customHeight" type="number" placeholder="e.g. 1080" value={customHeight} onChange={(e) => setCustomHeight(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="audioCodec">Audio Codec</Label>
          <Select value={audioCodec} onValueChange={setAudioCodec}>
            <SelectTrigger>
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Default</SelectItem>
              <SelectItem value="aac">AAC</SelectItem>
              <SelectItem value="mp3">MP3</SelectItem>
              <SelectItem value="opus">Opus</SelectItem>
              <SelectItem value="ac3">AC3</SelectItem>
              <SelectItem value="no_audio">No Audio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fpsPreset">Frame Rate Preset</Label>
          <Select value={fpsPreset} onValueChange={setFpsPreset}>
            <SelectTrigger>
              <SelectValue placeholder="Keep original" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Keep original</SelectItem>
              <SelectItem value="24">24 FPS (Cinema)</SelectItem>
              <SelectItem value="25">25 FPS (PAL)</SelectItem>
              <SelectItem value="30">30 FPS (NTSC)</SelectItem>
              <SelectItem value="50">50 FPS</SelectItem>
              <SelectItem value="60">60 FPS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customFps">Custom Frame Rate</Label>
          <Input id="customFps" type="number" step="0.01" min="1" placeholder="e.g. 29.97" value={customFps} onChange={(e) => setCustomFps(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="aspectRatioPreset">Aspect Ratio Preset</Label>
          <Select value={aspectRatioPreset} onValueChange={setAspectRatioPreset}>
            <SelectTrigger>
              <SelectValue placeholder="Keep original" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Keep original</SelectItem>
              <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
              <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
              <SelectItem value="4:3">4:3 (Standard)</SelectItem>
              <SelectItem value="1:1">1:1 (Square)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customAspectRatio">Custom Aspect Ratio</Label>
          <Input id="customAspectRatio" placeholder="e.g. 2.35:1 or 16:10" value={customAspectRatio} onChange={(e) => setCustomAspectRatio(e.target.value)} />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Format: W:H or decimal (e.g. 16:9, 2.35:1)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="videoBitrate">Video Bitrate</Label>
          <Input id="videoBitrate" placeholder="e.g. 2M" value={videoBitrate} onChange={(e) => setVideoBitrate(e.target.value)} />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="audioBitrate">Audio Bitrate</Label>
          <Input id="audioBitrate" placeholder="e.g. 128k" value={audioBitrate} onChange={(e) => setAudioBitrate(e.target.value)} />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Start Conversion
      </Button>
    </form>
  );
}

function EditForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading: boolean }) {
  const [operation, setOperation] = useState('trim');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      operation: operation as 'trim' | 'cut' | 'extract',
      start: Number(start),
      end: Number(end),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Operation</Label>
        <Select value={operation} onValueChange={setOperation}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trim">Trim</SelectItem>
            <SelectItem value="cut">Cut</SelectItem>
            <SelectItem value="extract">Extract</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start">Start Time (seconds)</Label>
          <Input id="start" type="number" step="0.1" placeholder="0" value={start} onChange={(e) => setStart(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end">End Time (seconds)</Label>
          <Input id="end" type="number" step="0.1" placeholder="10" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Apply Edit
      </Button>
    </form>
  );
}

function MergeForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading: boolean }) {
  const [mediaIds, setMediaIds] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ids = mediaIds.split(',').map((id) => id.trim()).filter(Boolean);
    onSubmit({ media_ids: ids });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="mediaIds">Media Files to Merge</Label>
        <Input
          id="mediaIds"
          placeholder="Enter file names or IDs, separated by commas"
          value={mediaIds}
          onChange={(e) => setMediaIds(e.target.value)}
          required
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Enter media filenames or IDs in the order you want them merged.
        </p>
      </div>

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Merge Media
      </Button>
    </form>
  );
}

function TransformForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading: boolean }) {
  const [op, setOp] = useState('scale');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [angle, setAngle] = useState('');
  const [speed, setSpeed] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = { operation: op };
    if (op === 'scale' && width && height) {
      data.width = Number(width);
      data.height = Number(height);
    } else if (op === 'rotate' && angle) {
      data.angle = Number(angle);
    } else if (op === 'speed' && speed) {
      data.speed = Number(speed);
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Transform Type</Label>
        <Select value={op} onValueChange={setOp}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scale">Scale</SelectItem>
            <SelectItem value="rotate">Rotate</SelectItem>
            <SelectItem value="crop">Crop</SelectItem>
            <SelectItem value="speed">Speed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {op === 'scale' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="width">Width</Label>
            <Input id="width" type="number" placeholder="1280" value={width} onChange={(e) => setWidth(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Height</Label>
            <Input id="height" type="number" placeholder="720" value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
        </div>
      )}

      {op === 'rotate' && (
        <div className="space-y-2">
          <Label htmlFor="angle">Angle (degrees)</Label>
          <Input id="angle" type="number" placeholder="90" value={angle} onChange={(e) => setAngle(e.target.value)} />
        </div>
      )}

      {op === 'speed' && (
        <div className="space-y-2">
          <Label htmlFor="speed">Speed Multiplier</Label>
          <Input id="speed" type="number" step="0.1" placeholder="1.5" value={speed} onChange={(e) => setSpeed(e.target.value)} />
          <p className="text-xs text-zinc-500 dark:text-zinc-500">1.0 = normal, 2.0 = double speed, 0.5 = half speed</p>
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Apply Transform
      </Button>
    </form>
  );
}

function FreezeForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading: boolean }) {
  const [timestamp, setTimestamp] = useState('');
  const [duration, setDuration] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      timestamp: Number(timestamp),
      duration: Number(duration) || 1,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="timestamp">Timestamp (seconds)</Label>
          <Input id="timestamp" type="number" step="0.1" placeholder="5.5" value={timestamp} onChange={(e) => setTimestamp(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (seconds)</Label>
          <Input id="duration" type="number" step="0.1" placeholder="2" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Freeze Frame
      </Button>
    </form>
  );
}

function OverlayForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading: boolean }) {
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [imageFilename, setImageFilename] = useState('');
  const [x, setX] = useState('40');
  const [y, setY] = useState('40');
  const [fontSize, setFontSize] = useState('24');
  const [opacity, setOpacity] = useState('1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'text') {
      onSubmit({
        operation: 'text',
        text,
        x: Number(x),
        y: Number(y),
        font_size: Number(fontSize),
        font_color: 'white',
      });
    } else {
      onSubmit({
        operation: 'watermark',
        image_filename: imageFilename,
        x: Number(x),
        y: Number(y),
        opacity: Number(opacity),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Overlay Type</Label>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="watermark">Image Watermark</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === 'text' && (
        <div className="space-y-2">
          <Label htmlFor="text">Text Content</Label>
          <Input id="text" placeholder="Live Broadcast" value={text} onChange={(e) => setText(e.target.value)} required />
        </div>
      )}

      {mode === 'watermark' && (
        <div className="space-y-2">
          <Label htmlFor="imageFilename">Image Filename</Label>
          <Input id="imageFilename" placeholder="logo.png" value={imageFilename} onChange={(e) => setImageFilename(e.target.value)} required />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="x">X Position</Label>
          <Input id="x" type="number" value={x} onChange={(e) => setX(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="y">Y Position</Label>
          <Input id="y" type="number" value={y} onChange={(e) => setY(e.target.value)} />
        </div>
        {mode === 'text' && (
          <div className="space-y-2">
            <Label htmlFor="fontSize">Font Size</Label>
            <Input id="fontSize" type="number" value={fontSize} onChange={(e) => setFontSize(e.target.value)} />
          </div>
        )}
        {mode === 'watermark' && (
          <div className="space-y-2">
            <Label htmlFor="opacity">Opacity</Label>
            <Input id="opacity" type="number" step="0.1" min="0" max="1" value={opacity} onChange={(e) => setOpacity(e.target.value)} />
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Apply Overlay
      </Button>
    </form>
  );
}

function SplitForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading: boolean }) {
  const [splitPoints, setSplitPoints] = useState('10, 25.5, 60');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const points = splitPoints.split(',').map((p) => Number(p.trim())).filter((n) => !isNaN(n));
    onSubmit({ split_points: points });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="splitPoints">Split Points (seconds)</Label>
        <Input id="splitPoints" placeholder="10, 25.5, 60" value={splitPoints} onChange={(e) => setSplitPoints(e.target.value)} required />
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Enter timestamps where the video should be split, separated by commas.
        </p>
      </div>

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Split Media
      </Button>
    </form>
  );
}

function ClipsForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading: boolean }) {
  const [subOperation, setSubOperation] = useState('keep');
  const [clipsInput, setClipsInput] = useState('0-10, 20-30');
  const [mediaIds, setMediaIds] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subOperation === 'reorder' || subOperation === 'append') {
      const ids = mediaIds.split(',').map((id) => id.trim()).filter(Boolean);
      onSubmit({ sub_operation: subOperation, media_ids: ids });
    } else {
      const clips = clipsInput.split(',').map((clip) => {
        const [start, end] = clip.split('-').map((n) => Number(n.trim()));
        return { start, end };
      }).filter((c) => !isNaN(c.start) && !isNaN(c.end));
      onSubmit({ sub_operation: subOperation, clips });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Clip Operation</Label>
        <Select value={subOperation} onValueChange={setSubOperation}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="keep">Keep Clips</SelectItem>
            <SelectItem value="delete">Delete Clips</SelectItem>
            <SelectItem value="reorder">Reorder Clips</SelectItem>
            <SelectItem value="append">Append Clips</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(subOperation === 'keep' || subOperation === 'delete') && (
        <div className="space-y-2">
          <Label htmlFor="clips">Clip Ranges (start-end)</Label>
          <Input id="clips" placeholder="0-10, 20-30" value={clipsInput} onChange={(e) => setClipsInput(e.target.value)} required />
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Enter time ranges in seconds, separated by commas.
          </p>
        </div>
      )}

      {(subOperation === 'reorder' || subOperation === 'append') && (
        <div className="space-y-2">
          <Label htmlFor="mediaIds">Media IDs</Label>
          <Input id="mediaIds" placeholder="clip2.mp4, clip1.mp4" value={mediaIds} onChange={(e) => setMediaIds(e.target.value)} required />
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Enter media filenames or IDs in the desired order, separated by commas.
          </p>
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Apply Clip Operation
      </Button>
    </form>
  );
}
