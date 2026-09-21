'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
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
  const [action, setAction] = useState<'burn' | 'mux' | 'tracks' | 'sync' | 'edit_text' | 'edit_timing' | 'add_entry' | 'delete_entry' | 'split_entry' | 'merge_entries'>('burn');
  const [subtitlePath, setSubtitlePath] = useState('');
  const [subtitleFileName, setSubtitleFileName] = useState('');
  const [fontSize, setFontSize] = useState('24');
  const [fontColor, setFontColor] = useState('white');
  const [position, setPosition] = useState('bottom');
  const [dragActive, setDragActive] = useState(false);
  const [tracks, setTracks] = useState<SubtitleTrack[]>([]);
  const [syncPreviewUrl, setSyncPreviewUrl] = useState<string | null>(null);
  const [syncOffset, setSyncOffset] = useState('0');
  const [syncScale, setSyncScale] = useState('1');
  const [editEntryIndex, setEditEntryIndex] = useState('1');
  const [editText, setEditText] = useState('');
  const [editStart, setEditStart] = useState('0.5');
  const [editEnd, setEditEnd] = useState('1');
  const [addStart, setAddStart] = useState('0');
  const [addEnd, setAddEnd] = useState('1');
  const [addText, setAddText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (syncPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(syncPreviewUrl);
    };
  }, [syncPreviewUrl]);

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
    if (syncPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(syncPreviewUrl);
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
        if (!subtitlePath.trim()) { setError('Subtitle path required'); return; }
        const result = await api.syncSubtitles(mediaId, {
          subtitle_path: subtitlePath,
          offset_seconds: Number(syncOffset),
          scale: Number(syncScale),
          preview: true,
        });
        if (result instanceof Blob) {
          setSyncPreviewUrl(URL.createObjectURL(result));
        } else if (result.preview_url) {
          setSyncPreviewUrl(result.preview_url);
        }
      } else if (action === 'edit_text') {
        if (!subtitlePath.trim()) { setError('Subtitle path required'); return; }
        const entryIndex = Number(editEntryIndex) - 1;
        if (!Number.isInteger(entryIndex) || entryIndex < 0) { setError('Subtitle entry must be a positive number'); return; }
        if (!editText.trim()) { setError('Subtitle text required'); return; }
        const blob = await api.editSubtitle(mediaId, {
          subtitle_path: subtitlePath,
          operation: 'update_text',
          entry_index: entryIndex,
          text: editText,
        });
        downloadBlob(blob, subtitleFileName ? 'edited_' + subtitleFileName : 'edited_subtitles' + (subtitlePath.includes('.') ? '.' + subtitlePath.split('.').pop() : '.srt'));
      } else if (action === 'edit_timing') {
        if (!subtitlePath.trim()) { setError('Subtitle path required'); return; }
        const entryIndex = Number(editEntryIndex) - 1;
        const start = Number(editStart);
        const end = Number(editEnd);
        if (!Number.isInteger(entryIndex) || entryIndex < 0) { setError('Subtitle entry must be a positive number'); return; }
        if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
          setError('End time must be greater than start time');
          return;
        }
        const blob = await api.editSubtitle(mediaId, {
          subtitle_path: subtitlePath,
          operation: 'update_timing',
          entry_index: entryIndex,
          start,
          end,
        });
        downloadBlob(blob, subtitleFileName ? 'timed_' + subtitleFileName : 'timed_subtitles' + (subtitlePath.includes('.') ? '.' + subtitlePath.split('.').pop() : '.srt'));
      } else if (action === 'add_entry') {
        if (!subtitlePath.trim()) { setError('Subtitle path required'); return; }
        const start = Number(addStart);
        const end = Number(addEnd);
        if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
          setError('End time must be greater than start time');
          return;
        }
        if (!addText.trim()) { setError('Subtitle text required'); return; }
        const insertAfter = editEntryIndex.trim() ? Number(editEntryIndex) - 1 : undefined;
        if (insertAfter !== undefined && (!Number.isInteger(insertAfter) || insertAfter < -1)) {
          setError('Insert-after entry must be zero or greater');
          return;
        }
        const blob = await api.editSubtitle(mediaId, {
          subtitle_path: subtitlePath,
          operation: 'add_entry',
          entry_index: insertAfter,
          start,
          end,
          text: addText,
        });
        downloadBlob(blob, subtitleFileName ? 'added_' + subtitleFileName : 'added_subtitles' + (subtitlePath.includes('.') ? '.' + subtitlePath.split('.').pop() : '.srt'));
      } else if (action === 'delete_entry') {
        if (!subtitlePath.trim()) { setError('Subtitle path required'); return; }
        const entryIndex = Number(editEntryIndex) - 1;
        if (!Number.isInteger(entryIndex) || entryIndex < 0) { setError('Subtitle entry must be a positive number'); return; }
        const blob = await api.editSubtitle(mediaId, {
          subtitle_path: subtitlePath,
          operation: 'delete_entry',
          entry_index: entryIndex,
        });
        downloadBlob(blob, subtitleFileName ? 'deleted_' + subtitleFileName : 'deleted_subtitles' + (subtitlePath.includes('.') ? '.' + subtitlePath.split('.').pop() : '.srt'));
      } else if (action === 'split_entry') {
        if (!subtitlePath.trim()) { setError('Subtitle path required'); return; }
        const entryIndex = Number(editEntryIndex) - 1;
        const splitTime = Number(addStart);
        if (!Number.isInteger(entryIndex) || entryIndex < 0) { setError('Subtitle entry must be a positive number'); return; }
        if (!Number.isFinite(splitTime) || splitTime < 0) { setError('Split time is required'); return; }
        const blob = await api.editSubtitle(mediaId, {
          subtitle_path: subtitlePath,
          operation: 'split_entry',
          entry_index: entryIndex,
          start: splitTime,
        });
        downloadBlob(blob, subtitleFileName ? 'split_' + subtitleFileName : 'split_subtitles' + (subtitlePath.includes('.') ? '.' + subtitlePath.split('.').pop() : '.srt'));
      } else if (action === 'merge_entries') {
        if (!subtitlePath.trim()) { setError('Subtitle path required'); return; }
        const entryIndex = Number(editEntryIndex) - 1;
        if (!Number.isInteger(entryIndex) || entryIndex < 0) { setError('Subtitle entry must be a positive number'); return; }
        const blob = await api.editSubtitle(mediaId, {
          subtitle_path: subtitlePath,
          operation: 'merge_entries',
          entry_index: entryIndex,
        });
        downloadBlob(blob, subtitleFileName ? 'merged_' + subtitleFileName : 'merged_subtitles' + (subtitlePath.includes('.') ? '.' + subtitlePath.split('.').pop() : '.srt'));
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
      case 'edit_text':
      case 'edit_timing':
      case 'add_entry':
      case 'delete_entry':
      case 'split_entry':
      case 'merge_entries':
        return Download;
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
      case 'edit_text':
        return 'Edit & Download';
      case 'edit_timing':
        return 'Update Timing & Download';
      case 'add_entry':
        return 'Add Entry & Download';
      case 'delete_entry':
        return 'Delete Entry & Download';
      case 'split_entry':
        return 'Split Entry & Download';
      case 'merge_entries':
        return 'Merge Entries & Download';
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
        <Select value={action} onValueChange={(v) => setAction(v as 'burn' | 'mux' | 'tracks' | 'sync' | 'edit_text' | 'edit_timing' | 'add_entry' | 'delete_entry' | 'split_entry' | 'merge_entries')}>
          <SelectTrigger>
            <SelectValue placeholder="Select action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="burn"><Download className="mr-2 h-3.5 w-3.5" /> Burn Subtitles</SelectItem>
            <SelectItem value="mux"><Download className="mr-2 h-3.5 w-3.5" /> Mux Soft Subtitles</SelectItem>
            <SelectItem value="tracks"><List className="mr-2 h-3.5 w-3.5" /> List Tracks</SelectItem>
            <SelectItem value="sync"><SlidersHorizontal className="mr-2 h-3.5 w-3.5" /> Sync Subtitles</SelectItem>
            <SelectItem value="edit_text"><FileText className="mr-2 h-3.5 w-3.5" /> Edit Subtitle Text</SelectItem>
            <SelectItem value="edit_timing"><SlidersHorizontal className="mr-2 h-3.5 w-3.5" /> Edit Subtitle Timing</SelectItem>
            <SelectItem value="add_entry"><FileText className="mr-2 h-3.5 w-3.5" /> Add Subtitle Entry</SelectItem>
            <SelectItem value="delete_entry"><FileText className="mr-2 h-3.5 w-3.5" /> Delete Subtitle Entry</SelectItem>
            <SelectItem value="split_entry"><FileText className="mr-2 h-3.5 w-3.5" /> Split Subtitle Entry</SelectItem>
            <SelectItem value="merge_entries"><FileText className="mr-2 h-3.5 w-3.5" /> Merge Subtitle Entries</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(action === 'burn' || action === 'mux' || action === 'sync' || action === 'edit_text') && (
        <div className="space-y-2">
          <Label>Subtitle File</Label>
          <div
            className={`relative border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
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
      {action === 'sync' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Timing Offset (seconds)</Label>
            <Input aria-label="Timing Offset" type="number" step="0.001" value={syncOffset} onChange={(e) => setSyncOffset(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Timing Scale</Label>
            <Input aria-label="Timing Scale" type="number" step="0.001" min="0.001" value={syncScale} onChange={(e) => setSyncScale(e.target.value)} />
          </div>
        </div>
      )}

      {action === 'edit_text' && (
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label>Subtitle Entry (1-based)</Label>
            <Input
              aria-label="Subtitle Entry"
              type="number"
              min="1"
              step="1"
              value={editEntryIndex}
              onChange={(e) => setEditEntryIndex(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Subtitle Text</Label>
            <Input
              aria-label="Subtitle Text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Enter replacement subtitle text"
            />
          </div>
        </div>
      )}





      {action === 'merge_entries' && (
        <div className="space-y-2">
          <Label>Subtitle Entry (1-based)</Label>
          <Input
            aria-label="Merge Subtitle Entry"
            type="number"
            min="1"
            step="1"
            value={editEntryIndex}
            onChange={(e) => setEditEntryIndex(e.target.value)}
          />
          <p className="text-xs text-zinc-500">Merges this entry with the following entry.</p>
        </div>
      )}
      {action === 'split_entry' && (
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label>Subtitle Entry (1-based)</Label>
            <Input
              aria-label="Split Subtitle Entry"
              type="number"
              min="1"
              step="1"
              value={editEntryIndex}
              onChange={(e) => setEditEntryIndex(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Split Time (seconds)</Label>
            <Input
              aria-label="Split Time"
              type="number"
              min="0"
              step="0.001"
              value={addStart}
              onChange={(e) => setAddStart(e.target.value)}
            />
          </div>
        </div>
      )}
      {action === 'delete_entry' && (
        <div className="space-y-2">
          <Label>Subtitle Entry (1-based)</Label>
          <Input
            aria-label="Delete Subtitle Entry"
            type="number"
            min="1"
            step="1"
            value={editEntryIndex}
            onChange={(e) => setEditEntryIndex(e.target.value)}
          />
        </div>
      )}
      {action === 'add_entry' && (
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label>Insert After Entry (optional)</Label>
            <Input
              aria-label="Insert After Entry"
              type="number"
              min="1"
              step="1"
              value={editEntryIndex}
              onChange={(e) => setEditEntryIndex(e.target.value)}
              placeholder="Append when empty"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time (seconds)</Label>
              <Input aria-label="Add Start Time" type="number" min="0" step="0.001" value={addStart} onChange={(e) => setAddStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time (seconds)</Label>
              <Input aria-label="Add End Time" type="number" min="0" step="0.001" value={addEnd} onChange={(e) => setAddEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subtitle Text</Label>
            <Input aria-label="Add Subtitle Text" value={addText} onChange={(e) => setAddText(e.target.value)} placeholder="New subtitle text" />
          </div>
        </div>
      )}
      {action === 'edit_timing' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Start Time (seconds)</Label>
            <Input
              aria-label="Edit Start Time"
              type="number"
              min="0"
              step="0.001"
              value={editStart}
              onChange={(e) => setEditStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>End Time (seconds)</Label>
            <Input
              aria-label="Edit End Time"
              type="number"
              min="0"
              step="0.001"
              value={editEnd}
              onChange={(e) => setEditEnd(e.target.value)}
            />
          </div>
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
