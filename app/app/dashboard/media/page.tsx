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
  pending: { icon: Clock, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Pending' },
  queued: { icon: Clock, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', label: 'Queued' },
  processing: { icon: Loader2, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', label: 'Processing' },
  completed: { icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', label: 'Completed' },
  failed: { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', label: 'Failed' },
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
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const data = await api.listMedia();
      setMedia(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMedia();
  }, [fetchMedia]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await api.uploadMedia(file);
      setUploadOpen(false);
      setFile(null);
      router.push(`/app/dashboard/media/${uploaded.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMedia) return;
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
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">Upload and manage your media files</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Media Library</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">Upload and manage your media files</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Media
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search media..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="sm:max-w-xs">
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
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 mb-4">
              <Film className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">No media files</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm">
              {search || filter !== 'all' ? 'Try adjusting your search or filter criteria.' : 'Upload videos, audio, or images to start processing with FrameFlux.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => {
            const MediaIcon = getMediaIcon(item.mime_type);
            const statusInfo = statusConfig[item.processing_status] || statusConfig.pending;

            return (
              <Card key={item.id} className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      <MediaIcon className="h-5 w-5" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/app/dashboard/media/${item.id}`}>
                            <Play className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDelete(item)} className="text-red-600 dark:text-red-400">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50 truncate" title={item.original_filename}>
                      {item.original_filename}
                    </p>
                    <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                      <span>{formatFileSize(item.file_size)}</span>
                      <span>{item.mime_type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                          statusInfo.color
                        )}
                      >
                        {statusInfo.label}
                      </span>
                      <span className="text-xs text-zinc-400">
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

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
            <DialogDescription>Upload a video, audio, or image file to process.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                accept="video/*,audio/*,image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={uploading}
              />
              {file && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !file}>
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

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedMedia?.original_filename}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
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