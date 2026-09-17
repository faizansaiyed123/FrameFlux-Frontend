'use client';
import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api/client';
import { Loader2, Upload, FileText, Download, List, SlidersHorizontal } from 'lucide-react';

const ACCEPTED_EXTENSIONS = ['.srt', '.ass', '.vtt', '.sub', '.txt'];

interface Props {
  mediaId: string;
  onProcessed?: () => void;
}

interface SubtitleTrack {
  id: number | string;
  codec: string | null;
  language: string | null;
  title: string | null;
  is_default: boolean;
  is_forced: boolean;
}

interface SyncPreviewResponse {
  preview_url: string;
  offset: number;
  scale: number;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function SubtitleForm({ mediaId }: Props) {
  const [loading, setLoading] = useState(false);
  const [subtitleUploading, setSubtitleUploading] = useState(false);
  const [action, setAction] = useState<'burn' | 'mux' | 'tracks' | 'sync'>('burn');
  const [subtitlePath, setSubtitlePath] = useState('');
  const [subtitleFileName, setSubtitleFileName] = useState('');
  const [fontSize, setFontSize] = useState('24');
  const [fontColor, setFontColor] = useState('white');
  const [position, setPosition] = useState('bottom');
  const [dragActive, setDragActive] = useState(false);
  const [tracks, setTracks] = useState<SubtitleTrack[]>([]);
  const [syncPreviewUrl, setSyncPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File | undefined) => {
    if (!file) return;
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported format. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`);
      return;
    }
    setError(null);
    setSubtitleFileName(file.name);
    setSubtitlePath(file.name);
    setSubtitleUploading(true);
    
    // Upload subtitle file to backend
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await api.uploadSubtitleFile(formData);
      setSubtitlePath(result.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload subtitle file');
    } finally {
      setSubtitleUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files?.[0]);
  }, [handleFileSelect]);

  const handleAction = async () => {
    setLoading(true);
    setError(null);
    setSyncPreviewUrl(null);
    try {
      if (action === 'burn') {
        if (!subtitlePath.trim()) { setError('Subtitle path required'); return; }
        const version = await api.burnSubtitles(mediaId, subtitlePath, { font_size: parseInt(fontSize), font_color: fontColor, position });
        // Version created successfully, refresh versions
        if (onProcessed) onProcessed();
      } else if (action === 'mux') {
        if (!subtitlePath.trim()) { setError('Subtitle path required'); return; }
        const blob = await api.muxSubtitles(mediaId, subtitlePath, { language: 'und' });
        downloadBlob(blob, `subtitles_muxed_${mediaId}.mp4`);
      } else if (action === 'tracks') {
        const data = await api.listSubtitleTracks(mediaId);
        setTracks(data as SubtitleTrack[]);
      } else if (action === 'sync') {
        const result = await api.syncSubtitles(mediaId, { offset_seconds: 0, scale: 1, preview: true });
        const syncResult = result as SyncPreviewResponse | undefined;
        if (syncResult && syncResult.preview_url) {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${syncResult.preview_url}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
          });
          const b = await res.blob();
          setSyncPreviewUrl(URL.createObjectURL(b));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = () => {
    switch (action) {
      case 'burn':
      case 'mux':
        return Download;
      case 'tracks':
        return List;
      case 'sync':
        return SlidersHorizontal;
      default:
        return null;
    }
  };

  const getActionLabel = () => {
    switch (action) {
      case 'tracks':
        return 'List Tracks';
      case 'sync':
        return 'Preview Sync';
      default:
        return 'Run & Download';
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label>Action</Label>
        <Select value={action} onValueChange={(v) => setAction(v as 'burn' | 'mux' | 'tracks' | 'sync')}>
          <SelectTrigger>
            <SelectValue placeholder="Select action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="burn"><Download className="mr-2 h-3.5 w-3.5" /> Burn Subtitles</SelectItem>
            <SelectItem value="mux"><Download className="mr-2 h-3.5 w-3.5" /> Mux Soft Subtitles</SelectItem>
            <SelectItem value="tracks"><List className="mr-2 h-3.5 w-3.5" /> List Tracks</SelectItem>
            <SelectItem value="sync"><SlidersHorizontal className="mr-2 h-3.5 w-3.5" /> Sync Subtitles</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(action === 'burn' || action === 'mux') && (
        <div className="space-y-2">
          <Label>Subtitle File</Label>
          <div
            className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
              dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
            }`}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".srt,.ass,.vtt,.sub,.txt" onChange={(e) => handleFileSelect(e.target.files?.[0])} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0, cursor: 'pointer' }} />
            {subtitleFileName ? (
              <div className="flex items-center justify-center gap-2">
                {subtitleUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Uploading...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{subtitleFileName}</span>
                  </>
                )}
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-5 w-5 text-zinc-400 mb-1" />
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Drop subtitle file or click to browse</p>
              </>
            )}
          </div>
          {subtitlePath && subtitlePath !== subtitleFileName && (
            <Input value={subtitlePath} onChange={(e) => { setSubtitlePath(e.target.value); setSubtitleFileName(''); }} placeholder="or enter path manually" className="text-xs h-7" />
          )}
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
      <Button onClick={handleAction} disabled={loading || subtitleUploading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            {(function() { const Icon = getActionIcon(); return Icon ? <Icon className="mr-2 h-4 w-4" /> : null; })()}
            {getActionLabel()}
          </>
        )}
      </Button>
      {tracks.length > 0 && (
        <div className="space-y-2">
          {tracks.map((t, i) => (
            <div key={i} className="text-xs p-2 rounded border border-zinc-200 dark:border-zinc-800">
              <p className="font-medium">{t.language || 'Unknown'} {t.is_default ? '(Default)' : ''} {t.is_forced ? '(Forced)' : ''}</p>
              <p className="text-[10px] text-zinc-500">Codec: {t.codec || 'N/A'}</p>
            </div>
          ))}
        </div>
      )}
      {syncPreviewUrl && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <video src={syncPreviewUrl} controls className="w-full max-h-48" />
        </div>
      )}
    </div>
  );
}
