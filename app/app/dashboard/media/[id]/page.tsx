'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Media, MediaProcessingStatusResponse, MediaVersion, ShareResponse } from '@/types/api';
import {
  ArrowLeft,
  Film,
  Loader2,
  Play,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Share2,
  Trash2,
  Copy,
  History,
  Settings2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MediaProcessing } from '@/components/dashboard/MediaProcessing';
import { EditorWorkspace } from '@/components/dashboard/editor/EditorWorkspace';
import { AudioWorkspace } from '@/components/dashboard/editor/AudioWorkspace';
import { ImageWorkspace } from '@/components/dashboard/editor/ImageWorkspace';
import { CompressForm } from '@/components/dashboard/media/CompressForm';
import { AudioExtractForm } from '@/components/dashboard/media/AudioExtractForm';
import { ThumbnailForm } from '@/components/dashboard/media/ThumbnailForm';
import { PreviewForm } from '@/components/dashboard/media/PreviewForm';
import { SubtitleForm } from '@/components/dashboard/media/SubtitleForm';
import { GifForm } from '@/components/dashboard/media/GifForm';
import { MediaInfoSection } from '@/components/dashboard/media/MediaInfoSection';

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

export default function MediaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mediaId = params.id as string;

  useEffect(() => {
    if (searchParams.get('from_upload') === '1') {
      setUploadSuccess(true);
    }
  }, [searchParams]);

  const [media, setMedia] = useState<Media | null>(null);
  const [status, setStatus] = useState<MediaProcessingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [downloading, setDownloading] = useState(false);
  const [versions, setVersions] = useState<MediaVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [shares, setShares] = useState<ShareResponse[]>([]);
  const [shareLoading, setShareLoading] = useState(false);

  const fetchMedia = useCallback(async () => {
    try {
      const [mediaData, statusData] = await Promise.all([
        api.getMedia(mediaId),
        api.getMediaStatus(mediaId).catch(() => null),
      ]);
      setMedia(mediaData);
      setStatus(statusData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [mediaId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMedia();
  }, [fetchMedia]);

  useEffect(() => {
    if (!media || media.processing_status !== 'processing' && media.processing_status !== 'queued') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const progressData = await api.getMediaProgress(mediaId);
        setStatus(progressData);
      } catch {
        // silent poll failure
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [media, mediaId]);

  const fetchVersions = useCallback(async () => {
    setVersionsLoading(true);
    try {
      const data = await api.listMediaVersions(mediaId);
      setVersions(data);
    } catch {
      // silent
    } finally {
      setVersionsLoading(false);
    }
  }, [mediaId]);

  const fetchShares = useCallback(async () => {
    setShareLoading(true);
    try {
      const data = await api.listShares();
      setShares(data.filter(s => s.media_id === mediaId));
    } catch {
      // silent
    } finally {
      setShareLoading(false);
    }
  }, [mediaId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const handleProcess = async () => {
    setProcessing(true);
    try {
      await api.processMedia(mediaId);
      await fetchMedia();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process media');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadOriginal = async () => {
    if (!media) return;
    setDownloading(true);
    try {
      const blob = await api.getMediaFile(mediaId);
      downloadBlob(blob, media.original_filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadProcessed = async () => {
    if (!media || !media.processed_filename) return;
    setDownloading(true);
    try {
      const blob = await api.getProcessedMedia(mediaId);
      downloadBlob(blob, media.processed_filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download processed file');
    } finally {
      setDownloading(false);
    }
  };

  const handleCreateShare = async () => {
    try {
      await api.createShare({ media_id: mediaId, password: sharePassword || undefined, allow_download: true });
      setShareDialogOpen(false);
      setSharePassword('');
      fetchShares();
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="h-8 w-48 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-4 w-32 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded mt-2" />
          </div>
        </div>
        <div className="h-64 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Media</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">View and manage your media file</p>
          </div>
        </div>
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{error || 'Media not found'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = status ? statusConfig[status.status] || statusConfig.pending : statusConfig.pending;

  return (
    <div className="space-y-8">
      {uploadSuccess && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            Media uploaded successfully — {media.original_filename}
          </p>
          <Button variant="ghost" size="sm" onClick={() => setUploadSuccess(false)} className="ml-auto shrink-0">
            Dismiss
          </Button>
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <Film className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate max-w-[400px]">
                  {media.original_filename}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {media.mime_type} • {formatFileSize(media.file_size)} • {formatDistanceToNow(new Date(media.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleProcess} disabled={processing || media.processing_status === 'processing' || media.processing_status === 'completed'}>
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Process
              </>
            )}
          </Button>
          <Button variant="outline" onClick={fetchMedia}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {status && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', statusInfo.color)}>
                  <statusInfo.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">Status: {statusInfo.label}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {status.stage || 'Processing'} • {status.progress}% complete
                  </p>
                </div>
              </div>
              <div className="w-32">
                <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 text-right">
                  {status.progress}%
                </p>
              </div>
            </div>
            {status.error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900">
                <p className="text-sm text-red-700 dark:text-red-300">{status.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="sharing">Sharing</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle>File Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-zinc-500 dark:text-zinc-400">Filename</Label>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{media.original_filename}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500 dark:text-zinc-400">Type</Label>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{media.mime_type}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500 dark:text-zinc-400">Size</Label>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{formatFileSize(media.file_size)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500 dark:text-zinc-400">Status</Label>
                    <Badge variant="secondary" className={cn('capitalize', statusInfo.color)}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  {media.duration && (
                    <div>
                      <Label className="text-xs text-zinc-500 dark:text-zinc-400">Duration</Label>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {Math.floor(media.duration / 60)}:{(media.duration % 60).toFixed(0).padStart(2, '0')}
                      </p>
                    </div>
                  )}
                  {media.width && media.height && (
                    <div>
                      <Label className="text-xs text-zinc-500 dark:text-zinc-400">Resolution</Label>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {media.width} x {media.height}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline" disabled={media.processing_status !== 'completed' || downloading} onClick={handleDownloadOriginal}>
                  {downloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download Original
                </Button>
                <Button className="w-full justify-start" variant="outline" disabled={!media.processed_filename || downloading} onClick={handleDownloadProcessed}>
                  {downloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download Processed
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="processing" className="space-y-6">
          {media.mime_type.startsWith('video/') && (
            <EditorWorkspace media={media} onBack={fetchMedia} onProcessed={fetchMedia} />
          )}
          {media.mime_type.startsWith('audio/') && (
            <AudioWorkspace media={media} onBack={fetchMedia} onProcessed={fetchMedia} />
          )}
          {media.mime_type.startsWith('image/') && (
            <ImageWorkspace media={media} onBack={fetchMedia} onProcessed={fetchMedia} />
          )}
          {!media.mime_type.startsWith('video/') && !media.mime_type.startsWith('audio/') && !media.mime_type.startsWith('image/') && (
            <MediaProcessing mediaId={mediaId} onProcessed={fetchMedia} />
          )}
        </TabsContent>
        <TabsContent value="tools" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Compression */}
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Compress Media</CardTitle>
              </CardHeader>
              <CardContent>
                <CompressForm mediaId={mediaId} onProcessed={fetchMedia} />
              </CardContent>
            </Card>

            {/* Audio Extraction */}
            {media.mime_type.startsWith('video/') && (
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base">Extract Audio</CardTitle>
                </CardHeader>
                <CardContent>
                  <AudioExtractForm mediaId={mediaId} />
                </CardContent>
              </Card>
            )}

            {/* Thumbnail */}
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Generate Thumbnail</CardTitle>
              </CardHeader>
              <CardContent>
                <ThumbnailForm mediaId={mediaId} />
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Generate Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <PreviewForm mediaId={mediaId} />
              </CardContent>
            </Card>

            {/* Subtitles */}
            {media.mime_type.startsWith('video/') && (
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base">Subtitles</CardTitle>
                </CardHeader>
                <CardContent>
                  <SubtitleForm mediaId={mediaId} />
                </CardContent>
              </Card>
            )}

            {/* GIF Generation */}
            {media.mime_type.startsWith('video/') && (
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base">Generate GIF</CardTitle>
                </CardHeader>
                <CardContent>
                  <GifForm mediaId={mediaId} />
                </CardContent>
              </Card>
            )}

            {/* Media Info */}
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Media Information</CardTitle>
              </CardHeader>
              <CardContent>
                <MediaInfoSection mediaId={mediaId} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="versions" className="space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle>File Versions</CardTitle>
            </CardHeader>
            <CardContent>
              {versionsLoading ? (
                <div className="h-32 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded" />
              ) : versions.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No versions yet.</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((version) => (
                    <div key={version.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Version {version.version_number}: {version.label}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {version.processing_status} • {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sharing" className="space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle>Share Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => setShareDialogOpen(true)} className="gap-2">
                <Share2 className="h-4 w-4" />
                Create Share Link
              </Button>
              {shareLoading ? (
                <div className="h-32 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded" />
              ) : shares.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No share links yet.</p>
              ) : (
                <div className="space-y-3">
                  {shares.map((share) => (
                    <div key={share.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-zinc-900 dark:text-zinc-50 truncate">{share.token}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {share.is_active ? 'Active' : 'Disabled'} • {share.allow_download ? 'Download allowed' : 'View only'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="metadata" className="space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle>Technical Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-zinc-500 dark:text-zinc-400">Stored Filename</Label>
                  <p className="text-sm font-mono text-zinc-900 dark:text-zinc-50">{media.stored_filename}</p>
                </div>
                <div>
                  <Label className="text-xs text-zinc-500 dark:text-zinc-400">Project ID</Label>
                  <p className="text-sm font-mono text-zinc-900 dark:text-zinc-50">{media.project_id || 'None'}</p>
                </div>
                {media.video_codec && (
                  <div>
                    <Label className="text-xs text-zinc-500 dark:text-zinc-400">Video Codec</Label>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{media.video_codec}</p>
                  </div>
                )}
                {media.audio_codec && (
                  <div>
                    <Label className="text-xs text-zinc-500 dark:text-zinc-400">Audio Codec</Label>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{media.audio_codec}</p>
                  </div>
                )}
                {media.fps && (
                  <div>
                    <Label className="text-xs text-zinc-500 dark:text-zinc-400">Frame Rate</Label>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{media.fps} fps</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Share Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password (optional)</Label>
              <Input
                id="password"
                type="text"
                placeholder="Leave empty for public access"
                value={sharePassword}
                onChange={(e) => setSharePassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateShare}>Create Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}