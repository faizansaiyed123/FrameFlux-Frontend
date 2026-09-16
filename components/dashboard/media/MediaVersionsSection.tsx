'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/client';
import { Loader2, Download, Trash2, RotateCcw, Eye, GitCompare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface MediaVersion {
  id: string;
  version_number: number;
  label: string;
  stored_filename: string;
  processing_status: string;
  original_filename?: string;
  file_size?: number;
  mime_type?: string;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  video_codec?: string | null;
  audio_codec?: string | null;
  fps?: string | null;
  created_at: string;
}

interface Props {
  mediaId: string;
  mediaFilename?: string;
}

export function MediaVersionsSection({ mediaId, mediaFilename }: Props) {
  const [versions, setVersions] = useState<MediaVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<MediaVersion | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersion, setCompareVersion] = useState<MediaVersion | null>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listMediaVersions(mediaId);
      setVersions(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [mediaId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleDownload = async (version: MediaVersion) => {
    try {
      const blob = await api.getMediaVersionFile(mediaId, version.id);
      const filename = version.original_filename || version.stored_filename;
      downloadBlob(blob, filename);
    } catch {
      // silent
    }
  };

  const handleRestore = async (version: MediaVersion) => {
    if (!confirm(`Restore version ${version.version_number}? This will replace the current file.`)) return;
    try {
      await api.restoreMediaVersion(mediaId, version.id);
      fetchVersions();
    } catch {
      // silent
    }
  };

  const handleDelete = async (version: MediaVersion) => {
    if (!confirm(`Delete version ${version.version_number}?`)) return;
    try {
      await api.deleteMediaVersion(mediaId, version.id);
      fetchVersions();
    } catch {
      // silent
    }
  };

  const handleCompare = async (v1: MediaVersion, v2: MediaVersion) => {
    setComparisonLoading(true);
    try {
      const result = await api.compareMedia(v1.id, v2.id);
      setComparison(result);
      setCompareMode(true);
    } catch {
      // silent
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleCompareWithCurrent = async (version: MediaVersion) => {
    // Compare with current media (would need current media ID)
    // This is a placeholder - would need the current media's version ID
  };

  const openDetails = (version: MediaVersion) => {
    setSelectedVersion(version);
    setDetailDialogOpen(true);
  };

  if (loading) {
    return (
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>File Versions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>File Versions</CardTitle>
          <Badge variant="outline" className="text-xs">{versions.length} versions</Badge>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No versions yet. Process this file to create versions.</p>
          ) : (
            <div className="space-y-2">
              {versions.map((version) => (
                <VersionRow
                  key={version.id}
                  version={version}
                  mediaId={mediaId}
                  onDownload={handleDownload}
                  onRestore={handleRestore}
                  onDelete={handleDelete}
                  onDetails={openDetails}
                  onCompare={() => handleCompare(version, versions[0])}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedVersion && (
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Version Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Version</p>
                  <p className="font-medium">#{selectedVersion.version_number}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Label</p>
                  <p className="font-medium">{selectedVersion.label || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Status</p>
                  <p className="font-medium capitalize">{selectedVersion.processing_status}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Created</p>
                  <p className="font-medium">{formatDistanceToNow(new Date(selectedVersion.created_at), { addSuffix: true })}</p>
                </div>
                {selectedVersion.file_size && (
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Size</p>
                    <p className="font-medium">{formatFileSize(selectedVersion.file_size)}</p>
                  </div>
                )}
                {selectedVersion.duration && (
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Duration</p>
                    <p className="font-medium">{Math.floor(selectedVersion.duration / 60)}:{(selectedVersion.duration % 60).toFixed(0).padStart(2, '0')}</p>
                  </div>
                )}
                {selectedVersion.width && selectedVersion.height && (
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Resolution</p>
                    <p className="font-medium">{selectedVersion.width} × {selectedVersion.height}</p>
                  </div>
                )}
                {selectedVersion.video_codec && (
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Video Codec</p>
                    <p className="font-medium">{selectedVersion.video_codec}</p>
                  </div>
                )}
                {selectedVersion.audio_codec && (
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Audio Codec</p>
                    <p className="font-medium">{selectedVersion.audio_codec}</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {compareMode && comparison && (
        <Dialog open={compareMode} onOpenChange={setCompareMode}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Version Comparison</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Version #{compareVersion?.version_number}</p>
                  <p className="font-medium">{compareVersion?.label || '—'}</p>
                </div>
                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Version #{versions[0]?.version_number}</p>
                  <p className="font-medium">{versions[0]?.label || 'Current'}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Size Difference</span>
                  <span className="font-medium">{comparison.size_diff > 0 ? '+' : ''}{comparison.size_diff} bytes ({comparison.storage_saved > 0 ? 'saved' : 'larger'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Duration Difference</span>
                  <span className="font-medium">{comparison.duration_diff?.toFixed(1) || 'N/A'}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Resolution Match</span>
                  <span className={`font-medium ${comparison.resolution_match ? 'text-green-600' : 'text-red-600'}`}>
                    {comparison.resolution_match ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Video Codec Match</span>
                  <span className={`font-medium ${comparison.video_codec_match ? 'text-green-600' : 'text-red-600'}`}>
                    {comparison.video_codec_match ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Audio Codec Match</span>
                  <span className={`font-medium ${comparison.audio_codec_match ? 'text-green-600' : 'text-red-600'}`}>
                    {comparison.audio_codec_match ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCompareMode(false); setComparison(null); }}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function VersionRow({ version, mediaId, onDownload, onRestore, onDelete, onDetails, onCompare }: {
  version: MediaVersion;
  mediaId: string;
  onDownload: (v: MediaVersion) => void;
  onRestore: (v: MediaVersion) => void;
  onDelete: (v: MediaVersion) => void;
  onDetails: (v: MediaVersion) => void;
  onCompare: () => void;
}) {
  const statusConfig: Record<string, { color: string }> = {
    completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    processing: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    failed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    queued: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    pending: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  };

  const statusInfo = statusConfig[version.processing_status] || statusConfig.pending;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
          <span className="text-sm font-medium">v{version.version_number}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-500">{version.label || 'Unnamed version'}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`${statusInfo.color} capitalize`}>
          {version.processing_status}
        </Badge>
        <Button variant="ghost" size="icon" onClick={() => onDownload(version)} title="Download">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDetails(version)} title="Details">
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onRestore(version)} title="Restore">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onCompare} title="Compare with latest">
          <GitCompare className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(version)} title="Delete" className="text-red-600 hover:text-red-700">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
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