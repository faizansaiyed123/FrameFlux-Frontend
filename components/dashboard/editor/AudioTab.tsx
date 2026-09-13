'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api/client';
import type { Media } from '@/types/api';
import { Download, Loader2, AlertCircle, Music, Scissors, Split, Gauge, Sliders, Ban, Waves, Film, Volume2, VolumeX, RotateCcw, Link, Eye, X } from 'lucide-react';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

type EditOp = 'trim' | 'cut' | 'split' | 'merge' | 'speed' | 'normalize' | 'fade' | 'silence';

const editOps: { id: EditOp; label: string; icon: typeof Scissors }[] = [
  { id: 'trim', label: 'Trim', icon: Scissors },
  { id: 'cut', label: 'Cut', icon: Scissors },
  { id: 'split', label: 'Split', icon: Split },
  { id: 'speed', label: 'Speed', icon: Gauge },
  { id: 'normalize', label: 'Normalize', icon: Sliders },
  { id: 'fade', label: 'Fade', icon: Waves },
  { id: 'silence', label: 'Silence', icon: Ban },
];

export function AudioTab({ media, setError, onProcessed }: { media: Media; setError: (e: string) => void; onProcessed?: () => void; }) {
  const [extracting, setExtracting] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertFormat, setConvertFormat] = useState('mp3');
  const [extractFormat, setExtractFormat] = useState('mp3');

  const [editOp, setEditOp] = useState<EditOp>('trim');
  const [editStart, setEditStart] = useState('0');
  const [editEnd, setEditEnd] = useState('');
  const [editSpeed, setEditSpeed] = useState('1');
  const [fadeIn, setFadeIn] = useState('');
  const [fadeOut, setFadeOut] = useState('');
  const [silenceDuration, setSilenceDuration] = useState('');
  const [mergeFiles, setMergeFiles] = useState('');
  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState('');

  const [atoVideoOpen, setAtoVideoOpen] = useState(false);
  const [atoVideoBgColor, setAtoVideoBgColor] = useState('#000000');
  const [atoVideoTitle, setAtoVideoTitle] = useState('');
  const [atoVideoText, setAtoVideoText] = useState('');
  const [atoVideoWaveform, setAtoVideoWaveform] = useState(false);
  const [atoVideoVisualizer, setAtoVideoVisualizer] = useState('');
  const [atoVideoResolution, setAtoVideoResolution] = useState('1920x1080');
  const [atoVideoFps, setAtoVideoFps] = useState('30');
  const [atoVideoDuration, setAtoVideoDuration] = useState('');
  const [atoVideoFormat, setAtoVideoFormat] = useState('mp4');
  const [atoVideoProcessing, setAtoVideoProcessing] = useState(false);

  const [volumeValue, setVolumeValue] = useState('1');
  const [volumeFadeIn, setVolumeFadeIn] = useState('');
  const [volumeFadeOut, setVolumeFadeOut] = useState('');
  const [adjustingVolume, setAdjustingVolume] = useState(false);

  const [replaceAudioFile, setReplaceAudioFile] = useState('');
  const [replaceFadeIn, setReplaceFadeIn] = useState('');
  const [replaceFadeOut, setReplaceFadeOut] = useState('');
  const [replacingAudio, setReplacingAudio] = useState(false);

  const [syncAudioOpen, setSyncAudioOpen] = useState(false);
  const [syncAudioFile, setSyncAudioFile] = useState('');
  const [syncOffset, setSyncOffset] = useState('0');
  const [syncVideoDuration, setSyncVideoDuration] = useState('');
  const [syncAudioDuration, setSyncAudioDuration] = useState('');
  const [syncFadeIn, setSyncFadeIn] = useState('');
  const [syncFadeOut, setSyncFadeOut] = useState('');
  const [syncVolume, setSyncVolume] = useState('1');
  const [syncMix, setSyncMix] = useState(false);
  const [syncMixVolume, setSyncMixVolume] = useState('0.5');
  const [syncOutputFormat, setSyncOutputFormat] = useState('mp4');
  const [syncProcessing, setSyncProcessing] = useState(false);
  const [syncPreviewOpen, setSyncPreviewOpen] = useState(false);
  const [syncPreviewUrl, setSyncPreviewUrl] = useState<string | null>(null);

  const handleExtract = async () => {
    setExtracting(true); setError('');
    try {
      const blob = await api.extractAudio(media.id, { format: extractFormat, quality_preset: 'medium' });
      downloadBlob(blob as Blob, media.original_filename.replace(/\.[^/.]+$/, '') + '.' + extractFormat);
    } catch (err) { setError(err instanceof Error ? err.message : 'Extract failed'); }
    finally { setExtracting(false); }
  };

  const handleConvert = async () => {
    setConverting(true); setError('');
    try {
      const blob = await api.convertAudio(media.id, { format: convertFormat });
      downloadBlob(blob as Blob, media.original_filename.replace(/\.[^/.]+$/, '') + '.' + convertFormat);
    } catch (err) { setError(err instanceof Error ? err.message : 'Convert failed'); }
    finally { setConverting(false); }
  };

  const handleEdit = async () => {
    setEditing(true); setError('');
    try {
      const data: Parameters<typeof api.editAudio>[1] = { operation: editOp };
      if ((editOp === 'trim' || editOp === 'cut' || editOp === 'split') && editStart && editEnd) {
        data.start = parseFloat(editStart);
        data.end = parseFloat(editEnd);
      }
      if (editOp === 'speed' && editSpeed) {
        data.speed = parseFloat(editSpeed);
      }
      if (editOp === 'fade') {
        if (fadeIn) data.fade_in = parseFloat(fadeIn);
        if (fadeOut) data.fade_out = parseFloat(fadeOut);
      }
      if (editOp === 'silence' && silenceDuration) {
        data.silence_duration = parseFloat(silenceDuration);
      }
      if (editOp === 'merge' && mergeFiles.trim()) {
        data.target_files = mergeFiles.split(',').map((f) => f.trim()).filter(Boolean);
      }
      const result = await api.editAudio(media.id, data);
      setSuccess(`Audio ${editOp} complete: ${result.output_filename}`);
      onProcessed?.();
    } catch (err) { setError(err instanceof Error ? err.message : 'Edit failed'); }
    finally { setEditing(false); }
  };

  const handleAudioToVideo = async () => {
    setAtoVideoProcessing(true); setError('');
    try {
      const blob = await api.audioToVideo(media.id, {
        background_color: atoVideoBgColor,
        title: atoVideoTitle || undefined,
        text: atoVideoText || undefined,
        show_waveform: atoVideoWaveform,
        visualizer_style: atoVideoVisualizer || undefined,
        resolution: atoVideoResolution,
        fps: parseInt(atoVideoFps),
        aspect_ratio: '16:9',
        duration: atoVideoDuration ? parseFloat(atoVideoDuration) : undefined,
        output_format: atoVideoFormat,
      });
      downloadBlob(blob as Blob, media.original_filename.replace(/\.[^/.]+$/, '') + '_video.mp4');
      setAtoVideoOpen(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Audio to video failed'); }
    finally { setAtoVideoProcessing(false); }
  };

  const handleAdjustVolume = async () => {
    setAdjustingVolume(true); setError('');
    try {
      const data: { volume: number; fade_in?: number; fade_out?: number } = { volume: parseFloat(volumeValue) || 1 };
      if (volumeFadeIn) data.fade_in = parseFloat(volumeFadeIn);
      if (volumeFadeOut) data.fade_out = parseFloat(volumeFadeOut);
      await api.adjustVolume(media.id, data.volume, data.fade_in, data.fade_out);
      setSuccess(`Volume adjusted to ${volumeValue}x`);
      onProcessed?.();
    } catch (err) { setError(err instanceof Error ? err.message : 'Volume adjust failed'); }
    finally { setAdjustingVolume(false); }
  };

  const handleReplaceAudio = async () => {
    if (!replaceAudioFile.trim()) { setError('Select an audio file'); return; }
    setReplacingAudio(true); setError('');
    try {
      const data: { audio_path: string; fade_in?: number; fade_out?: number } = { audio_path: replaceAudioFile };
      if (replaceFadeIn) data.fade_in = parseFloat(replaceFadeIn);
      if (replaceFadeOut) data.fade_out = parseFloat(replaceFadeOut);
      const result = await api.replaceAudio(media.id, data.audio_path, data.fade_in, data.fade_out);
      setSuccess(`Audio replaced: ${result.output_filename}`);
      onProcessed?.();
    } catch (err) { setError(err instanceof Error ? err.message : 'Replace audio failed'); }
    finally { setReplacingAudio(false); }
  };

  const handleSyncAudioVideo = async () => {
    if (!syncAudioFile.trim()) { setError('Select an audio file'); return; }
    setSyncProcessing(true); setError('');
    try {
      const data: Parameters<typeof api.syncAudioVideo>[1] = {
        audio_path: syncAudioFile,
        audio_offset: parseFloat(syncOffset) || 0,
        volume: parseFloat(syncVolume) || 1,
        mix: syncMix,
        mix_volume: parseFloat(syncMixVolume) || 0.5,
        output_format: syncOutputFormat as 'mp4' | 'webm',
      };
      if (syncVideoDuration) data.video_duration = parseFloat(syncVideoDuration);
      if (syncAudioDuration) data.audio_duration = parseFloat(syncAudioDuration);
      if (syncFadeIn) data.fade_in = parseFloat(syncFadeIn);
      if (syncFadeOut) data.fade_out = parseFloat(syncFadeOut);
      const result = await api.syncAudioVideo(media.id, data);
      setSuccess(`Audio synced: ${result.output_filename}`);
      onProcessed?.();
    } catch (err) { setError(err instanceof Error ? err.message : 'Sync failed'); }
    finally { setSyncProcessing(false); }
  };

  const handleSyncPreview = async () => {
    if (!syncAudioFile.trim()) { setError('Select an audio file'); return; }
    setError('');
    try {
      // Create a short preview (5 seconds) for quick feedback
      const data: Parameters<typeof api.syncAudioVideo>[1] = {
        audio_path: syncAudioFile,
        audio_offset: parseFloat(syncOffset) || 0,
        video_duration: 5,
        audio_duration: 5,
        volume: parseFloat(syncVolume) || 1,
        mix: syncMix,
        mix_volume: parseFloat(syncMixVolume) || 0.5,
        output_format: 'mp4',
      };
      if (syncFadeIn) data.fade_in = parseFloat(syncFadeIn);
      if (syncFadeOut) data.fade_out = parseFloat(syncFadeOut);
      
      const result = await api.syncAudioVideo(media.id, data);
      const blob = await api.getProcessedMedia(media.id, result.output_filename);
      const url = URL.createObjectURL(blob);
      setSyncPreviewUrl(url);
      setSyncPreviewOpen(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Preview failed'); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Music className="h-3.5 w-3.5" />
        <span>Audio: {media.audio_codec || 'Unknown'}</span>
      </div>

      <div>
        <Label className="text-[10px] text-zinc-500">Extract Audio Format</Label>
        <Select value={extractFormat} onValueChange={setExtractFormat}>
          <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
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
      <div>
        <Button onClick={handleExtract} disabled={extracting} className="w-full justify-start" variant="outline" size="sm">
          {extracting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
          Extract Audio ({extractFormat.toUpperCase()})
        </Button>
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] text-zinc-500">Convert Audio</Label>
        <Select value={convertFormat} onValueChange={setConvertFormat}>
          <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="aac">AAC</SelectItem>
            <SelectItem value="mp3">MP3</SelectItem>
            <SelectItem value="wav">WAV</SelectItem>
            <SelectItem value="flac">FLAC</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleConvert} disabled={converting} className="w-full text-xs">
          {converting ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Converting...</> : 'Convert & Download'}
        </Button>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3">
        <Label className="text-[10px] text-zinc-500">Edit Audio</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {editOps.map((op) => {
            const Icon = op.icon;
            const isActive = editOp === op.id;
            return (
              <button
                key={op.id}
                onClick={() => setEditOp(op.id)}
                className={`flex flex-col items-center gap-1 rounded-md border p-1.5 text-center transition-colors ${
                  isActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[9px] font-medium leading-tight">{op.label}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(editOp === 'trim' || editOp === 'cut' || editOp === 'split') && (
            <>
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500">Start (s)</Label>
                <Input type="number" step="0.1" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="text-xs h-7" />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500">End (s)</Label>
                <Input type="number" step="0.1" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="text-xs h-7" />
              </div>
            </>
          )}
          {editOp === 'speed' && (
            <div className="space-y-1">
              <Label className="text-[9px] text-zinc-500">Speed (x)</Label>
              <Select value={editSpeed} onValueChange={setEditSpeed}>
                <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="0.75">0.75x</SelectItem>
                  <SelectItem value="1">1x (Normal)</SelectItem>
                  <SelectItem value="1.25">1.25x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {editOp === 'fade' && (
            <>
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500">Fade In (s)</Label>
                <Input type="number" step="0.1" value={fadeIn} onChange={(e) => setFadeIn(e.target.value)} className="text-xs h-7" />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500">Fade Out (s)</Label>
                <Input type="number" step="0.1" value={fadeOut} onChange={(e) => setFadeOut(e.target.value)} className="text-xs h-7" />
              </div>
            </>
          )}
          {editOp === 'silence' && (
            <div className="space-y-1">
              <Label className="text-[9px] text-zinc-500">Silence Duration (s)</Label>
              <Input type="number" step="0.1" value={silenceDuration} onChange={(e) => setSilenceDuration(e.target.value)} className="text-xs h-7" />
            </div>
          )}
          {editOp === 'merge' && (
            <div className="col-span-2 space-y-1">
              <Label className="text-[9px] text-zinc-500">Target Files (comma-separated stored filenames)</Label>
              <Input placeholder="e.g. audio1.mp3, audio2.mp3" value={mergeFiles} onChange={(e) => setMergeFiles(e.target.value)} className="text-xs h-7" />
            </div>
          )}
        </div>
        <Button onClick={handleEdit} disabled={editing} className="w-full text-xs">
          {editing ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Processing...</> : `Edit Audio: ${editOp}`}</Button>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <Button onClick={() => setAtoVideoOpen(!atoVideoOpen)} variant="outline" className="w-full justify-start text-xs">
          <Film className="mr-2 h-3.5 w-3.5" />
          Audio to Video
        </Button>
        {atoVideoOpen && (
          <div className="space-y-2 mt-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="space-y-1">
              <Label className="text-[9px] text-zinc-500">Background Color</Label>
              <Input type="color" value={atoVideoBgColor} onChange={(e) => setAtoVideoBgColor(e.target.value)} className="h-7" />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] text-zinc-500">Title</Label>
              <Input value={atoVideoTitle} onChange={(e) => setAtoVideoTitle(e.target.value)} placeholder="Optional title" className="text-xs h-7" />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] text-zinc-500">Text</Label>
              <Input value={atoVideoText} onChange={(e) => setAtoVideoText(e.target.value)} placeholder="Optional text overlay" className="text-xs h-7" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="waveform" checked={atoVideoWaveform} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAtoVideoWaveform(e.target.checked)} className="w-3 h-3" />
              <Label htmlFor="waveform" className="text-[9px] text-zinc-500">Show Waveform</Label>
            </div>
            {atoVideoWaveform && (
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500">Visualizer Style</Label>
                <Select value={atoVideoVisualizer} onValueChange={setAtoVideoVisualizer}>
                  <SelectTrigger className="text-xs h-7"><SelectValue placeholder="Select style" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bars">Bars</SelectItem>
                    <SelectItem value="wave">Wave</SelectItem>
                    <SelectItem value="circle">Circle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500">Resolution</Label>
                <Select value={atoVideoResolution} onValueChange={setAtoVideoResolution}>
                  <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1280x720">720p</SelectItem>
                    <SelectItem value="1920x1080">1080p</SelectItem>
                    <SelectItem value="3840x2160">4K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500">FPS</Label>
                <Select value={atoVideoFps} onValueChange={setAtoVideoFps}>
                  <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500">Max Duration (s)</Label>
                <Input type="number" value={atoVideoDuration} onChange={(e) => setAtoVideoDuration(e.target.value)} placeholder="Optional" className="text-xs h-7" />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500">Output Format</Label>
                <Select value={atoVideoFormat} onValueChange={setAtoVideoFormat}>
                  <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp4">MP4</SelectItem>
                    <SelectItem value="webm">WebM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAudioToVideo} disabled={atoVideoProcessing} className="w-full text-xs">
              {atoVideoProcessing ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Generating...</> : 'Generate Video'}
            </Button>
          </div>
        )}

        {/* Volume Control */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <Button onClick={() => setAtoVideoOpen(!atoVideoOpen)} variant="outline" className="w-full justify-start text-xs">
            <Volume2 className="mr-2 h-3.5 w-3.5" />
            Volume & Fade
          </Button>
          <div className="space-y-2 mt-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500">Volume (x)</Label>
                <Select value={volumeValue} onValueChange={setVolumeValue}>
                  <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Mute</SelectItem>
                    <SelectItem value="0.25">0.25x</SelectItem>
                    <SelectItem value="0.5">0.5x</SelectItem>
                    <SelectItem value="0.75">0.75x</SelectItem>
                    <SelectItem value="1">1x (Normal)</SelectItem>
                    <SelectItem value="1.5">1.5x</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                    <SelectItem value="3">3x</SelectItem>
                    <SelectItem value="4">4x</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500">Fade In (s)</Label>
                <Input type="number" step="0.1" value={volumeFadeIn} onChange={(e) => setVolumeFadeIn(e.target.value)} placeholder="Optional" className="text-xs h-7" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500">Fade Out (s)</Label>
                <Input type="number" step="0.1" value={volumeFadeOut} onChange={(e) => setVolumeFadeOut(e.target.value)} placeholder="Optional" className="text-xs h-7" />
              </div>
            </div>
            <Button onClick={handleAdjustVolume} disabled={adjustingVolume} className="w-full text-xs">
              {adjustingVolume ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Applying...</> : <><Volume2 className="mr-1 h-3.5 w-3.5" />Apply Volume</>}
            </Button>
          </div>
        </div>

        {/* Replace Audio */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <Button onClick={() => setAtoVideoOpen(!atoVideoOpen)} variant="outline" className="w-full justify-start text-xs">
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Replace Audio
          </Button>
          <div className="space-y-2 mt-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="space-y-1">
              <Label className="text-[9px] text-zinc-500">Audio File (stored filename)</Label>
              <Input value={replaceAudioFile} onChange={(e) => setReplaceAudioFile(e.target.value)} placeholder="e.g. music.mp3" className="text-xs h-7" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500">Fade In (s)</Label>
                <Input type="number" step="0.1" value={replaceFadeIn} onChange={(e) => setReplaceFadeIn(e.target.value)} placeholder="Optional" className="text-xs h-7" />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500">Fade Out (s)</Label>
                <Input type="number" step="0.1" value={replaceFadeOut} onChange={(e) => setReplaceFadeOut(e.target.value)} placeholder="Optional" className="text-xs h-7" />
              </div>
            </div>
            <Button onClick={handleReplaceAudio} disabled={replacingAudio || !replaceAudioFile.trim()} className="w-full text-xs">
              {replacingAudio ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Replacing...</> : <><RotateCcw className="mr-1 h-3.5 w-3.5" />Replace Audio</>}
            </Button>
          </div>
        </div>

        {/* Sync Audio Video */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <Button onClick={() => setSyncAudioOpen(!syncAudioOpen)} variant="outline" className="w-full justify-start text-xs">
            <Link className="mr-2 h-3.5 w-3.5" />
            Sync External Audio
          </Button>
          {syncAudioOpen && (
            <div className="space-y-2 mt-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500">External Audio File (stored filename)</Label>
                <Input value={syncAudioFile} onChange={(e) => setSyncAudioFile(e.target.value)} placeholder="e.g. soundtrack.mp3" className="text-xs h-7" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[9px] text-zinc-500">Offset (s)</Label>
                  <Input type="number" step="0.1" value={syncOffset} onChange={(e) => setSyncOffset(e.target.value)} placeholder="0 (negative = advance)" className="text-xs h-7" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] text-zinc-500">Volume (x)</Label>
                  <Input type="number" step="0.1" value={syncVolume} onChange={(e) => setSyncVolume(e.target.value)} className="text-xs h-7" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[9px] text-zinc-500">Video Duration (s)</Label>
                  <Input type="number" step="0.1" value={syncVideoDuration} onChange={(e) => setSyncVideoDuration(e.target.value)} placeholder="Optional" className="text-xs h-7" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] text-zinc-500">Audio Duration (s)</Label>
                  <Input type="number" step="0.1" value={syncAudioDuration} onChange={(e) => setSyncAudioDuration(e.target.value)} placeholder="Optional" className="text-xs h-7" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[9px] text-zinc-500">Fade In (s)</Label>
                  <Input type="number" step="0.1" value={syncFadeIn} onChange={(e) => setSyncFadeIn(e.target.value)} placeholder="Optional" className="text-xs h-7" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] text-zinc-500">Fade Out (s)</Label>
                  <Input type="number" step="0.1" value={syncFadeOut} onChange={(e) => setSyncFadeOut(e.target.value)} placeholder="Optional" className="text-xs h-7" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="syncMix" checked={syncMix} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSyncMix(e.target.checked)} className="w-3 h-3" />
                <Label htmlFor="syncMix" className="text-[9px] text-zinc-500">Mix with original audio</Label>
              </div>
              {syncMix && (
                <div className="space-y-1">
                  <Label className="text-[9px] text-zinc-500">Original Audio Volume</Label>
                  <Input type="number" step="0.1" min="0" max="1" value={syncMixVolume} onChange={(e) => setSyncMixVolume(e.target.value)} className="text-xs h-7" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[9px] text-zinc-500">Output Format</Label>
                  <Select value={syncOutputFormat} onValueChange={setSyncOutputFormat}>
                    <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp4">MP4</SelectItem>
                      <SelectItem value="webm">WebM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSyncPreview} disabled={syncProcessing || !syncAudioFile.trim()} variant="outline" className="flex-1 text-xs">
                  <Eye className="mr-1 h-3.5 w-3.5" />
                  Preview (5s)
                </Button>
                <Button onClick={handleSyncAudioVideo} disabled={syncProcessing || !syncAudioFile.trim()} className="flex-1 text-xs">
                  {syncProcessing ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Syncing...</> : <><Link className="mr-1 h-3.5 w-3.5" />Sync & Export</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {success && (
        <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      <Alert className="border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400">
        <AlertDescription className="text-[10px]">Volume and fade controls are available during playback using the main controls.</AlertDescription>
      </Alert>

      {syncPreviewOpen && syncPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><Film className="h-5 w-5 text-indigo-600" /><h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Sync Preview (5s)</h2></div>
              <Button variant="ghost" size="icon" onClick={() => { setSyncPreviewOpen(false); setSyncPreviewUrl(null); }}><X className="h-4 w-4" /></Button>
            </div>
            <div className="bg-black rounded-lg overflow-hidden mb-4 flex items-center justify-center h-64">
              <video src={syncPreviewUrl} controls className="max-h-full max-w-full" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { setSyncPreviewOpen(false); setSyncPreviewUrl(null); }}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
