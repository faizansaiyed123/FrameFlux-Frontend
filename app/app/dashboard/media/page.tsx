'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { ResumableUploader } from '@/lib/api/resumable';
import type { Media } from '@/types/api';
import {
  Film,
  Upload,
  Loader2,
  MoreHorizontal,
  Trash2,
  Play,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  FileVideo,
  Music,
  ImageIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300', label: 'Pending' },
  queued: { icon: Clock, color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300', label: 'Queued' },
  processing: { icon: Loader2, color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', label: 'Processing' },
  completed: { icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', label: 'Completed' },
  failed: { icon: XCircle, color: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300', label: 'Failed' },
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getMediaIcon(type: string) {
  if (type.startsWith('video')) return FileVideo;
  if (type.startsWith('audio')) return Music;
  if (type.startsWith('image')) return ImageIcon;
  return Film;
}

export default function MediaPage() {
  const router = useRouter();
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      const validTypes = ['video/', 'audio/', 'image/'];
      const isValid = validTypes.some((type) => selectedFile.type.startsWith(type));
      if (!isValid) {
        setError('Invalid file type. Please select a video, audio, or image file.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const fetchMedia = useCallback(async () => {
    try {
      const data = await api.listMedia({
        search: search || undefined,
        media_type: filter !== 'all' ? filter : undefined,
      });
      setMedia(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMedia();
  }, [fetchMedia]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const uploader = new ResumableUploader();
      await uploader.init(file);
      await uploader.uploadAll((progress) => {
        setUploadProgress(progress);
      });
      const media = await uploader.finalize();
      setUploadOpen(false);
      setFile(null);
      router.push(`/app/dashboard/media/${media.id}?from_upload=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMedia) return;
    if (!confirm('Delete this media file?')) return;
    setDeleting(true);
    try {
      await api.deleteMedia(selectedMedia.id);
      setDeleteOpen(false);
      setSelectedMedia(null);
      await fetchMedia();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete media');
    } finally {
      setDeleting(false);
    }
  };

  const openDelete = (item: Media) => {
    setSelectedMedia(item);
    setDeleteOpen(true);
  };

  const filtered = media.filter((item) => {
    if (filter !== 'all' && item.processing_status !== filter) return false;
    if (search && !item.original_filename.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Media Library</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Upload and manage your media files</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">Library</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">Media</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Upload, organize, and process your media files.</p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="h-10 shrink-0 rounded-lg px-4 shadow-sm" style={{ cursor: 'pointer' }}>
          <Upload className="mr-2 h-4 w-4" />
          Upload media
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50/80 dark:border-red-900/70 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-sm leading-5 text-red-700 dark:text-red-300">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white/70 p-3 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50 sm:flex-row">
        <Input
          placeholder="Search media..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 sm:max-w-xs"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-10 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 sm:max-w-xs" style={{ cursor: 'pointer' }}>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-zinc-200/80 dark:border-zinc-800/80">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900">
              <Film className="h-7 w-7 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">No media files</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {search || filter !== 'all' ? 'Try adjusting your search or filter criteria.' : 'Upload videos, audio, or images to start processing with FrameFlux.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => {
            const MediaIcon = getMediaIcon(item.mime_type);
            const statusInfo = statusConfig[item.processing_status] || statusConfig.pending;

            return (
              <Card key={item.id} className="group border-zinc-200/80 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900 dark:hover:border-zinc-700">
                <CardContent className="p-4">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                      <MediaIcon className="h-5 w-5" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white" style={{ cursor: 'pointer' }}>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/app/dashboard/media/${item.id}`}>
                            <Play className="mr-2 h-4 w-4" />
                            View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDelete(item)} className="text-red-600 dark:text-red-400">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3">
                    <p className="truncate font-medium text-zinc-950 dark:text-white" title={item.original_filename}>
                      {item.original_filename}
                    </p>
                    <div className="flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{formatFileSize(item.file_size)}</span>
                      <span className="truncate">{item.mime_type}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium capitalize',
                          statusInfo.color
                        )}
                      >
                        {statusInfo.label}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl border-zinc-200 bg-white p-0 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:w-full">
          <div className="border-b border-zinc-200/80 px-5 py-5 dark:border-zinc-800/80 sm:px-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">Upload media</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5 text-zinc-500 dark:text-zinc-400">Upload a video, audio, or image file to process.</DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-5 py-5 sm:px-6">
            {uploading ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-950 dark:text-white">Uploading media</p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{file?.name}</p>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div className="h-full rounded-full bg-indigo-600 transition-all duration-300 dark:bg-indigo-500" style={{ width: `${uploadProgress}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-zinc-400">
                  <span>Uploading</span>
                  <span>{uploadProgress}%</span>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'rounded-xl border-2 border-dashed p-6 text-center transition-all sm:p-8',
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/20'
                    : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  id="file"
                  type="file"
                  accept="video/*,audio/*,image/*"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  disabled={uploading}
                  className="hidden"
                  ref={(el) => {
                    if (el && file === null) el.value = '';
                  }}
                />
                <label
                  htmlFor="file"
                  className="block cursor-pointer"
                  onClick={() => document.getElementById('file')?.click()}
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-sm dark:bg-zinc-900 dark:text-zinc-200">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-base font-semibold tracking-tight text-zinc-950 dark:text-white">
                    Drag & drop a file here
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    or click to browse your computer
                  </p>
                  <span className="mt-4 inline-flex h-9 items-center rounded-lg border border-zinc-200 bg-white px-3.5 text-xs font-medium text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                    Choose file
                  </span>
                  <p className="mt-4 text-[11px] text-zinc-400">Video · Audio · Image</p>
                </label>

                {file && (
                  <div className="mt-5 flex min-w-0 items-center gap-3 rounded-xl border border-indigo-200/80 bg-white p-3 text-left shadow-sm dark:border-indigo-900/60 dark:bg-zinc-950">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                      <Film className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">{file.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 border-t border-zinc-200/80 px-5 py-4 dark:border-zinc-800/80 sm:flex-row sm:justify-end sm:px-6">
            <Button variant="outline" onClick={() => { setUploadOpen(false); setFile(null); }} disabled={uploading} className="h-10 w-full rounded-lg sm:w-auto" style={{ cursor: 'pointer' }}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !file} className="h-10 w-full rounded-lg sm:w-auto" style={{ cursor: 'pointer' }}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl border-zinc-200 dark:border-zinc-800 sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">Delete media</DialogTitle>
            <DialogDescription className="leading-6">
              Are you sure you want to delete &quot;{selectedMedia?.original_filename}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting} className="w-full sm:w-auto" style={{ cursor: 'pointer' }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="w-full sm:w-auto" style={{ cursor: 'pointer' }}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
