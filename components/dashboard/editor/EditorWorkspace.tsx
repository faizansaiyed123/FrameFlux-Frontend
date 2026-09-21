'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/client';
import type { Media } from '@/types/api';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Undo, Redo, Download, Loader2, AlertCircle, CheckCircle2, X,
  Music, Image as ImageIcon, Type, Scissors, Split,
  Trash2, RefreshCw,
} from 'lucide-react';
import { Timeline } from './Timeline';
import { AudioTrack } from './AudioTrack';
import { ToolPanel } from './ToolPanel';
import { AudioTab } from './AudioTab';
import { SubtitlesTab } from './SubtitlesTab';
import { TransformTab } from './TransformTab';
import { OverlayTab } from './OverlayTab';

export interface Clip {
  id: string;
  mediaId: string;
  storedFilename?: string;
  name: string;
  start: number;
  end: number;
  duration: number;
  color: string;
}

interface EditorWorkspaceProps {
  media: Media;
  onBack: () => void;
  onProcessed: () => void;
}

interface ExportConfig {
  format: string;
  resolution: string;
  fps: number | null;
  quality: 'low' | 'balanced' | 'high' | 'custom';
  videoCodec: string;
  bitrate: string;
  audioCodec: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins + ':' + secs.toString().padStart(2, '0');
}

export function EditorWorkspace({ media, onBack, onProcessed }: EditorWorkspaceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [clips, setClips] = useState<Clip[]>([
    { id: media.id, mediaId: media.id, name: media.original_filename, start: 0, end: media.duration || 0, duration: media.duration || 0, color: '#6366f1' },
  ]);
  const [history, setHistory] = useState<Clip[][]>([clips]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [fromUpload, setFromUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'audio' | 'subtitles' | 'transform' | 'overlay' | null>('edit');
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({ format: 'mp4', resolution: 'original', fps: null, quality: 'balanced', videoCodec: 'h264', bitrate: 'auto', audioCodec: 'keep' });
  const [exportResult, setExportResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [transformSpeed, setTransformSpeed] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('from_upload') === '1') setFromUpload(true);
  }, []);

  useEffect(() => {
    let objectUrl: string | null = null;
    api.getMediaFile(media.id)
      .then((blob) => { objectUrl = URL.createObjectURL(blob); setVideoUrl(objectUrl); setLoadingVideo(false); })
      .catch(() => { setError('Unable to load video preview.'); setLoadingVideo(false); });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [media.id]);

  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);

  const pushHistory = useCallback((newClips: Clip[]) => {
    setHistory((prev) => { const sliced = prev.slice(0, historyIndexRef.current + 1); return [...sliced, newClips]; });
    setHistoryIndex((prev) => prev + 1);
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) { const i = historyIndexRef.current - 1; setHistoryIndex(i); setClips(historyRef.current[i]); }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) { const i = historyIndexRef.current + 1; setHistoryIndex(i); setClips(historyRef.current[i]); }
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!videoRef.current) return;
    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
    else { await videoRef.current.play(); setIsPlaying(true); }
  }, [isPlaying]);

  const handleSeek = useCallback((time: number) => { if (!videoRef.current) return; videoRef.current.currentTime = time; setCurrentTime(time); }, []);
  const handleVolumeChange = useCallback((v: number) => { if (!videoRef.current) return; videoRef.current.volume = v; setVolume(v); setIsMuted(v === 0); }, []);
  const toggleMute = useCallback(() => { if (!videoRef.current) return; videoRef.current.muted = !isMuted; setIsMuted((p) => !p); }, [isMuted]);
  const handleTimeUpdate = useCallback(() => { if (!videoRef.current) return; setCurrentTime(videoRef.current.currentTime); }, []);
  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    const d = videoRef.current.duration || media.duration || 0;
    setDuration(d);
    if (clips.length === 1 && clips[0].duration !== d) { setClips((p) => p.map((c) => (c.id === media.id ? { ...c, end: d, duration: d } : c))); }
  }, [media.duration, media.id, clips]);
  const handleVideoError = useCallback(() => { setError('Unable to load video preview.'); }, []);

  const handleSplit = useCallback(() => {
    if (!selectedClipId || currentTime <= 0) return;
    setClips((prev) => {
      const clip = prev.find((c) => c.id === selectedClipId);
      if (!clip || currentTime <= clip.start || currentTime >= clip.end) return prev;
      const left = { ...clip, end: currentTime };
      const right = { id: clip.id + '-split-' + Date.now(), mediaId: clip.mediaId, name: clip.name + ' (2)', start: currentTime, end: clip.end, duration: clip.end - currentTime, color: clip.color };
      const next = prev.map((c) => c.id === selectedClipId ? [left, right] : c).flat();
      pushHistory(next); setSelectedClipId(null); return next;
    });
  }, [selectedClipId, currentTime, pushHistory]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedClipId) return;
    if (!confirm('Delete this clip?')) return;
    setClips((prev) => { const next = prev.filter((c) => c.id !== selectedClipId); pushHistory(next); setSelectedClipId(null); return next; });
  }, [selectedClipId, pushHistory]);

  const handleProcess = useCallback(async () => {
    setProcessing(true); setError(''); setSuccess('');
    try {
      const selectedClip = clips.find((c) => c.id === selectedClipId);
      if (activeTool === 'split') { await api.splitMedia(media.id, [currentTime]); }
      else if (activeTool === 'edit' && selectedClip) { await api.editMedia(media.id, { operation: 'trim', start: selectedClip.start, end: selectedClip.end }); }
      else if (activeTool === 'transform') {
        await api.transformMedia(media.id, { operation: 'speed', speed: transformSpeed });
      } else if (activeTool === 'freeze') { await api.freezeFrame(media.id, currentTime, 2); }
      else if (activeTool === 'overlay') { await api.overlayMedia(media.id, { operation: 'text', text: 'FrameFlux', x: 40, y: 40, font_size: 24, opacity: 1 }); }
      else if (activeTool === 'merge' && clips.length >= 2) { await api.mergeMedia(media.id, clips.map((c) => c.mediaId)); }
      else if (activeTool === 'clips') { await api.keepClips(media.id, clips.map((c) => ({ start: c.start, end: c.end }))); }
      setSuccess('Processing started.'); onProcessed();
    } catch (err) { setError(err instanceof Error ? err.message : 'Operation failed'); }
    finally { setProcessing(false); }
  }, [activeTool, clips, selectedClipId, currentTime, media.id, onProcessed]);

  const handleExportOpen = useCallback(() => { if (resultUrl) URL.revokeObjectURL(resultUrl); setExportOpen(true); setExportResult(null); setResultUrl(null); setError(''); }, [resultUrl]);

  const handleExport = useCallback(async () => {
    setExporting(true); setError('');
    try {
      const res = exportConfig.resolution === '4k' ? { w: 3840, h: 2160 } : exportConfig.resolution === '1080p' ? { w: 1920, h: 1080 } : exportConfig.resolution === '720p' ? { w: 1280, h: 720 } : exportConfig.resolution === '480p' ? { w: 854, h: 480 } : { w: undefined, h: undefined };
      await api.convertMedia(media.id, {
        format: exportConfig.format,
        width: res.w, height: res.h,
        fps: exportConfig.fps || undefined,
        video_bitrate: exportConfig.bitrate === 'auto' ? undefined : exportConfig.bitrate,
        video_codec: exportConfig.videoCodec,
        audio_codec: exportConfig.audioCodec === 'keep' ? undefined : exportConfig.audioCodec === 'no_audio' ? 'none' : exportConfig.audioCodec,
        quality: exportConfig.quality === 'low' ? 1 : exportConfig.quality === 'balanced' ? 5 : exportConfig.quality === 'high' ? 9 : undefined,
      });
      let status = await api.getMediaStatus(media.id);
      let attempts = 60;
      while (status.status !== 'completed' && status.status !== 'failed' && attempts > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        status = await api.getMediaStatus(media.id);
        attempts--;
      }
      if (status.status === 'completed' && status.processed_filename) {
        const blob = await api.getProcessedMedia(media.id);
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
        setExportResult({ blob, filename: media.original_filename.replace(/\.[^/.]+$/, '') + '_export.' + exportConfig.format });
        setExportOpen(false);
      } else {
        setError(status.error || 'Export failed'); setExporting(false);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Export failed'); setExporting(false); }
    setExporting(false);
  }, [exportConfig, media.id, media.original_filename]);

  const handleDownloadOriginal = useCallback(async () => {
    if (!media) return;
    try {
      const blob = await api.getMediaFile(media.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = media.original_filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) { setError(err instanceof Error ? err.message : 'Download failed'); }
  }, [media]);

  const handleDownloadProcessed = useCallback(async () => {
    if (!media) return;
    try {
      const blob = await api.getProcessedMedia(media.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = media.processed_filename || 'processed.mp4'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) { setError(err instanceof Error ? err.message : 'Download failed'); }
  }, [media]);

  const handleDownloadResult = useCallback(() => {
    if (!exportResult) return;
    const createdUrl = resultUrl ? null : URL.createObjectURL(exportResult.blob);
    const url = resultUrl || createdUrl!;
    const a = document.createElement('a'); a.href = url; a.download = exportResult.filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    if (createdUrl) URL.revokeObjectURL(createdUrl);
  }, [exportResult, resultUrl]);

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;
  const hasAudio = !!media.audio_codec;
  const isExporting = exporting || processing;

  const toolTabs = [
    { id: 'edit' as const, label: 'Edit', icon: Scissors },
    { id: 'audio' as const, label: 'Audio', icon: Music },
    { id: 'subtitles' as const, label: 'Subs', icon: Type },
    { id: 'transform' as const, label: 'Transform', icon: RefreshCw },
    { id: 'overlay' as const, label: 'Overlay', icon: ImageIcon },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {fromUpload && (
        <div className="flex items-center gap-3 rounded-b-lg border-b border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 px-4 py-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-xs font-medium text-green-700 dark:text-green-300">Media uploaded successfully</p>
          <Button variant="ghost" size="sm" onClick={() => setFromUpload(false)} className="ml-auto shrink-0">Dismiss</Button>
        </div>
      )}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate max-w-[120px] sm:max-w-[260px]">{media.original_filename}</h1>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
              <span>{media.mime_type}</span>
              {media.duration && <span>{formatTime(media.duration)}</span>}
              {media.width && media.height && <span>{media.width}x{media.height}</span>}
              {media.file_size && <span>{(media.file_size / 1024 / 1024).toFixed(1)}MB</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={handleDownloadOriginal} className="hidden sm:flex h-8"><Download className="mr-1 h-3.5 w-3.5" />Original</Button>
          <Button variant="ghost" size="sm" onClick={handleDownloadProcessed} disabled={!media.processed_filename} className="hidden md:flex h-8"><Download className="mr-1 h-3.5 w-3.5" />Processed</Button>
          <Button onClick={handleExportOpen} disabled={isExporting} className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs sm:text-sm">
            {exporting ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Exporting...</> : <><Download className="mr-1 h-3.5 w-3.5" />Export</>}
          </Button>
        </div>
      </div>
      <div className="flex flex-1 overflow-y-auto flex-col lg:flex-row">
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex-1 bg-black flex items-center justify-center relative min-h-[120px]">
            {loadingVideo && (<div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10"><div className="text-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto mb-3" /><p className="text-xs text-zinc-300">Loading video...</p></div></div>)}
            {videoUrl && !error && (<video ref={videoRef} src={videoUrl} className="max-h-full max-w-full" onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} onError={handleVideoError} playsInline />)}
            {error && !loadingVideo && (<div className="absolute inset-0 flex items-center justify-center bg-black/80"><div className="text-center p-6"><AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" /><p className="text-sm text-red-300">{error}</p></div></div>)}
          </div>
          <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => handleSeek(Math.max(0, currentTime - 5))} title="Skip back"><SkipBack className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</Button>
              <Button variant="ghost" size="icon" onClick={() => handleSeek(Math.min(duration, currentTime + 5))} title="Skip forward"><SkipForward className="h-4 w-4" /></Button>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono min-w-[90px]">{formatTime(currentTime)} / {formatTime(duration)}</span>
              <div className="flex-1" />
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'} className="h-7 w-7">{isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}</Button>
                <input type="range" min="0" max="1" step="0.1" value={isMuted ? 0 : volume} onChange={(e) => handleVolumeChange(Number(e.target.value))} className="w-16 sm:w-20" title="Volume" />
              </div>
            </div>
          </div>
          <div className="h-44 sm:h-48 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
            <Timeline clips={clips} selectedClipId={selectedClipId} currentTime={currentTime} duration={duration} onSelectClip={setSelectedClipId} onSeek={handleSeek} onClipChange={(clip, changes) => { setClips((prev) => { const next = prev.map((c) => (c.id === clip.id ? { ...c, ...changes } : c)); pushHistory(next); return next; }); }} />
          </div>
          {hasAudio && (
            <div className="h-14 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
              <div className="px-3 py-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1"><Music className="h-3 w-3" />Audio Track</div>
              <AudioTrack duration={duration} currentTime={currentTime} onSeek={handleSeek} />
            </div>
          )}
          <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
            <div className="flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
              {toolTabs.map((tab) => { const Icon = tab.icon; const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(isActive ? null : tab.id)} className={cn('flex items-center gap-1 px-3 py-2 text-[11px] font-medium whitespace-nowrap transition-colors', isActive ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-500 dark:text-zinc-400')}><Icon className="h-3.5 w-3.5" />{tab.label}</button>); })}
            </div>
            {activeTab === 'edit' && <ToolPanel activeTool={activeTool} onSelectTool={setActiveTool} selectedClip={selectedClip} clips={clips} currentTime={currentTime} onSplit={handleSplit} onDelete={handleDeleteSelected} onApply={handleProcess} processing={processing} />}
            {activeTab === 'audio' && <AudioTab media={media} setError={setError} onProcessed={onProcessed} />}
            {activeTab === 'subtitles' && <SubtitlesTab media={media} setError={setError} />}
            {activeTab === 'transform' && <TransformTab media={media} onTransform={handleProcess} setError={setError} onSpeedChange={setTransformSpeed} />}
            {activeTab === 'overlay' && <OverlayTab media={media} onOverlay={handleProcess} setError={setError} />}
          </div>
        </div>
      </div>
      {error && !success && (<div className="fixed bottom-4 right-4 z-50 max-w-sm"><Alert className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert></div>)}
      {success && (<div className="fixed bottom-4 right-4 z-50 max-w-sm"><Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"><CheckCircle2 className="h-4 w-4" /><AlertDescription>{success}</AlertDescription></Alert></div>)}
      {exportOpen && (<ExportModal config={exportConfig} onChange={setExportConfig} onExport={handleExport} exporting={exporting} onClose={() => setExportOpen(false)} />)}
      {resultUrl && exportResult && (<ResultOverlay url={resultUrl} filename={exportResult.filename} onContinue={() => { setResultUrl(null); setExportResult(null); }} onDownload={handleDownloadResult} />)}
    </div>
  );
}

function ExportModal({ config, onChange, onExport, exporting, onClose }: { config: ExportConfig; onChange: (c: ExportConfig) => void; onExport: () => void; exporting: boolean; onClose: () => void }) {
  const update = (patch: Partial<ExportConfig>) => onChange({ ...config, ...patch });
  const applyQuality = (q: 'low' | 'balanced' | 'high') => { const p = q === 'low' ? { bitrate: '500k' } : q === 'balanced' ? { bitrate: '2Mbps' } : { bitrate: '8Mbps' }; update({ quality: q, bitrate: p.bitrate }); };
  const resolutions = [{ value: 'original', label: 'Original' }, { value: '4k', label: '4K' }, { value: '1080p', label: '1080p' }, { value: '720p', label: '720p' }, { value: '480p', label: '480p' }];
  const formats = [{ value: 'mp4', label: 'MP4' }, { value: 'mov', label: 'MOV' }, { value: 'mkv', label: 'MKV' }, { value: 'avi', label: 'AVI' }, { value: 'webm', label: 'WebM' }, { value: 'flv', label: 'FLV' }, { value: 'mpeg', label: 'MPEG' }, { value: 'ts', label: 'TS' }, { value: 'm4v', label: 'M4V' }, { value: '3gp', label: '3GP' }];
  const fpsOptions = [{ value: 'null', label: 'Original' }, { value: '24', label: '24 fps' }, { value: '30', label: '30 fps' }, { value: '60', label: '60 fps' }];
  const codecs = [{ value: 'h264', label: 'H.264' }, { value: 'h265', label: 'H.265' }, { value: 'vp8', label: 'VP8' }, { value: 'vp9', label: 'VP9' }, { value: 'av1', label: 'AV1' }];
  const bitrates = [{ value: 'auto', label: 'Auto' }, { value: '500k', label: '500 kbps' }, { value: '1M', label: '1 Mbps' }, { value: '2M', label: '2 Mbps' }, { value: '5M', label: '5 Mbps' }, { value: '8M', label: '8 Mbps' }];
  const audioCodecs = [{ value: 'keep', label: 'Keep Original' }, { value: 'aac', label: 'AAC' }, { value: 'mp3', label: 'MP3' }, { value: 'no_audio', label: 'No Audio' }];
  const selectedRes = resolutions.find((r) => r.value === config.resolution) || resolutions[0];
  const selectedFps = fpsOptions.find((f) => f.value === (config.fps === null ? 'null' : String(config.fps))) || fpsOptions[0];
  const selectedCodec = codecs.find((c) => c.value === config.videoCodec) || codecs[0];
  const selectedBitrate = bitrates.find((b) => b.value === config.bitrate) || bitrates[0];
  const selectedAudioCodec = audioCodecs.find((a) => a.value === config.audioCodec) || audioCodecs[0];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Export Settings</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div><Label>Format</Label>
            <Select value={config.format} onValueChange={(v) => update({ format: v, ...(v === 'webm' ? { videoCodec: 'vp9', audioCodec: 'keep' } : {}) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{formats.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div><Label>Resolution</Label>
            <Select value={config.resolution} onValueChange={(v) => { update({ resolution: v }); if (v !== 'original') update({ quality: 'custom' }); }}>
              <SelectTrigger><SelectValue />{selectedRes.label}</SelectTrigger>
              <SelectContent>{resolutions.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div><Label>Frame Rate</Label>
            <Select value={config.fps === null ? 'null' : String(config.fps)} onValueChange={(v) => update({ fps: v === 'null' ? null : Number(v) })}>
              <SelectTrigger><SelectValue />{selectedFps.label}</SelectTrigger>
              <SelectContent>{fpsOptions.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div><Label>Quality</Label>
            <div className="grid grid-cols-4 gap-1.5">
              <Button variant={config.quality === 'low' ? 'default' : 'outline'} size="sm" onClick={() => applyQuality('low')} className={cn(config.quality === 'low' && 'bg-amber-600 hover:bg-amber-700')}>Low</Button>
              <Button variant={config.quality === 'balanced' ? 'default' : 'outline'} size="sm" onClick={() => applyQuality('balanced')} className={cn(config.quality === 'balanced' && 'bg-green-600 hover:bg-green-700')}>Balanced</Button>
              <Button variant={config.quality === 'high' ? 'default' : 'outline'} size="sm" onClick={() => applyQuality('high')} className={cn(config.quality === 'high' && 'bg-indigo-600 hover:bg-indigo-700')}>High</Button>
              <Button variant={config.quality === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => update({ quality: 'custom' })}>Custom</Button>
            </div>
          </div>
          <div><Label>Codec</Label>
            <Select value={config.videoCodec} onValueChange={(v) => update({ videoCodec: v })}>
              <SelectTrigger><SelectValue />{selectedCodec.label}</SelectTrigger>
              <SelectContent>{codecs.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div><Label>Video Bitrate</Label>
            <Select value={config.bitrate} onValueChange={(v) => { update({ bitrate: v }); if (v !== 'auto') update({ quality: 'custom' }); }}>
              <SelectTrigger><SelectValue />{selectedBitrate.label}</SelectTrigger>
              <SelectContent>{bitrates.map((b) => (<SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div><Label>Audio</Label>
            <Select value={config.audioCodec} onValueChange={(v) => update({ audioCodec: v })}>
              <SelectTrigger><SelectValue />{selectedAudioCodec.label}</SelectTrigger>
              <SelectContent>{audioCodecs.map((a) => (<SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={exporting}>Cancel</Button>
          <Button onClick={onExport} disabled={exporting} className="bg-indigo-600 hover:bg-indigo-700">
            {exporting ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Exporting...</> : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResultOverlay({ url, filename, onContinue, onDownload }: { url: string; filename: string; onContinue: () => void; onDownload: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" /><h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Export Complete</h2></div>
          <Button variant="ghost" size="icon" onClick={onContinue}><X className="h-4 w-4" /></Button>
        </div>
        <div className="bg-black rounded-lg overflow-hidden mb-4 flex items-center justify-center h-64">
          <video src={url} controls className="max-h-full max-w-full" />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{filename}</p>
        <div className="flex items-center gap-2">
          <Button onClick={onDownload} className="bg-indigo-600 hover:bg-indigo-700"><Download className="mr-2 h-4 w-4" />Download</Button>
          <Button variant="outline" onClick={onContinue}>Continue Editing</Button>
        </div>
      </div>
    </div>
  );
}
