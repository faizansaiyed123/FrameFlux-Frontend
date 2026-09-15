'use client';
import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api/client';
import type { Media } from '@/types/api';
import { Loader2, AlertCircle, Type, CheckCircle2, Download, SlidersHorizontal, Upload, FileText } from 'lucide-react';

const ACCEPTED_EXTENSIONS = ['.srt', '.ass', '.vtt', '.sub', '.txt'];

export function SubtitlesTab({ media, setError }: { media: Media; setError: (e: string) => void }) {
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [subtitlePath, setSubtitlePath] = useState('');
  const [syncOffset, setSyncOffset] = useState('0');
  const [syncScale, setSyncScale] = useState('1');
  const [syncLanguage, setSyncLanguage] = useState('und');
  const [isDefault, setIsDefault] = useState(false);
  const [isForced, setIsForced] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [burning, setBurning] = useState(false);
  const [muxing, setMuxing] = useState(false);
  const [syncPreviewUrl, setSyncPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [subtitleFileName, setSubtitleFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File | undefined) => {
    if (!file) return;
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported subtitle format. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`);
      return;
    }
    setSubtitleFileName(file.name);
    setSubtitlePath(file.name);
    setError('');
  }, [setError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0]);
  }, [handleFileSelect]);

  const handleListTracks = async () => {
    setLoading(true); setError('');
    try {
      const data = await api.listSubtitleTracks(media.id);
      setTracks(data || []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to list tracks'); }
    finally { setLoading(false); }
  };

  const handleSync = async (preview?: boolean) => {
    setSyncing(true); setError(''); setSyncPreviewUrl(null);
    try {
      const blob = await api.syncSubtitles(media.id, {
        offset_seconds: parseFloat(syncOffset) || 0,
        scale: parseFloat(syncScale) || 1,
        preview: !!preview,
      });
      if (preview) {
        const data = blob as any;
        if (data.preview_url) {
          const res = await fetch(`${(window as any).__apiBaseUrl || 'http://localhost:8000'}${data.preview_url}`, {
            headers: { Authorization: `Bearer ${(window as any).__token__ || ''}` },
          });
          const b = await res.blob();
          setSyncPreviewUrl(URL.createObjectURL(b));
        }
      } else {
        const b = blob as Blob;
        const url = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = url; a.download = `${media.original_filename.replace(/\.[^/.]+$/, '')}_synced.mp4`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Sync failed'); }
    finally { setSyncing(false); }
  };

  const handleBurn = async () => {
    if (!subtitlePath.trim()) { setError('Subtitle path is required'); return; }
    setBurning(true); setError('');
    try {
      const blob = await api.burnSubtitles(media.id, subtitlePath, {
        font_size: 24, font_color: 'white', background_color: 'black@0.5', position: 'bottom',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${media.original_filename.replace(/\.[^/.]+$/, '')}_burned.mp4`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) { setError(err instanceof Error ? err.message : 'Burn failed'); }
    finally { setBurning(false); }
  };

  const handleMux = async () => {
    if (!subtitlePath.trim()) { setError('Subtitle path is required'); return; }
    setMuxing(true); setError('');
    try {
      const blob = await api.muxSubtitles(media.id, subtitlePath, {
        language: syncLanguage, is_default: isDefault, is_forced: isForced,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${media.original_filename.replace(/\.[^/.]+$/, '')}_mux.mp4`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) { setError(err instanceof Error ? err.message : 'Mux failed'); }
    finally { setMuxing(false); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Type className="h-3.5 w-3.5" />
        <span>Subtitle Management</span>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] text-zinc-500">Subtitle File</Label>
        <div
          className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt,.ass,.vtt,.sub,.txt"
            onChange={handleFileInput}
            className="hidden"
          />
          <Upload className="mx-auto h-6 w-6 text-zinc-400 mb-2" />
          {subtitleFileName ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{subtitleFileName}</span>
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Drop subtitle file here or click to browse</p>
              <p className="text-[10px] text-zinc-400 mt-1">Supports SRT, ASS, VTT, SUB, TXT</p>
            </>
          )}
        </div>
        {subtitlePath && subtitlePath !== subtitleFileName && (
          <div className="flex items-center gap-2">
            <Input value={subtitlePath} onChange={(e) => { setSubtitlePath(e.target.value); setSubtitleFileName(''); }} placeholder="or enter path manually" className="text-xs h-7" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={handleBurn} disabled={burning} variant="outline" size="sm" className="w-full justify-start">
          {burning ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
          Burn
        </Button>
        <Button onClick={handleMux} disabled={muxing} variant="outline" size="sm" className="w-full justify-start">
          {muxing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
          Mux
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] text-zinc-500">Mux Options</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[9px] text-zinc-500">Language</Label>
            <Select value={syncLanguage} onValueChange={setSyncLanguage}>
              <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="und">Undetermined</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="isDefault" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-3 h-3" />
            <Label htmlFor="isDefault" className="text-[9px] text-zinc-500">Default</Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isForced" checked={isForced} onChange={(e) => setIsForced(e.target.checked)} className="w-3 h-3" />
          <Label htmlFor="isForced" className="text-[9px] text-zinc-500">Forced</Label>
        </div>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 space-y-2">
        <Label className="text-[10px] text-zinc-500 flex items-center gap-1"><SlidersHorizontal className="h-3 w-3" /> Sync Subtitles</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[9px] text-zinc-500">Offset (s)</Label>
            <Input type="number" step="0.1" value={syncOffset} onChange={(e) => setSyncOffset(e.target.value)} className="text-xs h-7" />
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] text-zinc-500">Scale</Label>
            <Input type="number" step="0.1" value={syncScale} onChange={(e) => setSyncScale(e.target.value)} className="text-xs h-7" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => handleSync(true)} disabled={syncing} variant="outline" size="sm" className="w-full">
            {syncing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            Preview Sync
          </Button>
          <Button onClick={() => handleSync(false)} disabled={syncing} variant="outline" size="sm" className="w-full">
            Sync & Download
          </Button>
        </div>
      </div>

      {syncPreviewUrl && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <video src={syncPreviewUrl} controls className="w-full max-h-48" />
        </div>
      )}

      <Button onClick={handleListTracks} disabled={loading} variant="outline" size="sm" className="w-full justify-start">
        {loading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Type className="mr-2 h-3.5 w-3.5" />}
        List Tracks
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
      {tracks.length === 0 && !loading && (
        <Alert className="border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <AlertDescription className="text-[10px]">No subtitle tracks detected. Upload a subtitle file via the path field above.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
