'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api/client';
import type { Media } from '@/types/api';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Undo,
  Redo,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Timeline } from './Timeline';
import { ToolPanel } from './ToolPanel';

export interface Clip {
  id: string;
  mediaId: string;
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
    {
      id: media.id,
      mediaId: media.id,
      name: media.original_filename,
      start: 0,
      end: media.duration || 0,
      duration: media.duration || 0,
      color: '#6366f1',
    },
  ]);
  const [history, setHistory] = useState<Clip[][]>([clips]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;

    api.getMediaFile(media.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setVideoUrl(objectUrl);
        setLoadingVideo(false);
      })
      .catch(() => {
        setError('Unable to load video preview. The file format may not be supported by your browser.');
        setLoadingVideo(false);
      });

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [media.id]);

  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const pushHistory = useCallback((newClips: Clip[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndexRef.current + 1);
      return [...sliced, newClips];
    });
    setHistoryIndex((prev) => prev + 1);
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      const nextIndex = historyIndexRef.current - 1;
      setHistoryIndex(nextIndex);
      setClips(historyRef.current[nextIndex]);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      const nextIndex = historyIndexRef.current + 1;
      setHistoryIndex(nextIndex);
      setClips(historyRef.current[nextIndex]);
    }
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      await videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted((prev) => !prev);
  }, [isMuted]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    const videoDuration = videoRef.current.duration || media.duration || 0;
    setDuration(videoDuration);
    if (clips.length === 1 && clips[0].duration !== videoDuration) {
      setClips((prev) => prev.map((c) => (c.id === media.id ? { ...c, end: videoDuration, duration: videoDuration } : c)));
    }
  }, [media.duration, media.id, clips]);

  const handleVideoError = useCallback(() => {
    setError('Unable to load video preview. The file format may not be supported by your browser.');
  }, []);

  const handleSplit = useCallback(() => {
    if (!selectedClipId || currentTime <= 0) return;
    setClips((prev) => {
      const clip = prev.find((c) => c.id === selectedClipId);
      if (!clip || currentTime <= clip.start || currentTime >= clip.end) return prev;

      const newClips = prev.map((c) => {
        if (c.id !== selectedClipId) return c;
        const left = { ...c, end: currentTime };
        const right = {
          id: `${c.id}-split-${Date.now()}`,
          mediaId: c.mediaId,
          name: `${c.name} (2)`,
          start: currentTime,
          end: c.end,
          duration: c.end - currentTime,
          color: c.color,
        };
        return [left, right];
      }).flat();

      pushHistory(newClips);
      setSelectedClipId(null);
      return newClips;
    });
  }, [selectedClipId, currentTime, pushHistory]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedClipId) return;
    setClips((prev) => {
      const next = prev.filter((c) => c.id !== selectedClipId);
      pushHistory(next);
      setSelectedClipId(null);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClipId]);

  const handleProcess = useCallback(async () => {
    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const selectedClip = clips.find((c) => c.id === selectedClipId);

      if (activeTool === 'split') {
        await api.splitMedia(media.id, [currentTime]);
      } else if (activeTool === 'edit' && selectedClip) {
        await api.editMedia(media.id, {
          operation: 'trim',
          start: selectedClip.start,
          end: selectedClip.end,
        });
      } else if (activeTool === 'transform') {
        await api.transformMedia(media.id, {
          operation: 'speed',
          speed: 1,
        });
      } else if (activeTool === 'freeze') {
        await api.freezeFrame(media.id, currentTime, 2);
      } else if (activeTool === 'overlay') {
        await api.overlayMedia(media.id, {
          operation: 'text',
          text: 'FrameFlux',
          x: 40,
          y: 40,
          font_size: 24,
          opacity: 1,
        });
      } else if (activeTool === 'merge' && clips.length >= 2) {
        const mediaIds = clips.map((c) => c.mediaId);
        await api.mergeMedia(media.id, mediaIds);
      } else if (activeTool === 'clips') {
        await api.keepClips(media.id, clips.map((c) => ({ start: c.start, end: c.end })));
      }

      setSuccess('Processing started. This may take a few minutes.');
      onProcessed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setProcessing(false);
    }
  }, [activeTool, clips, selectedClipId, currentTime, media.id, onProcessed]);

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top Zone: Preview & Global Controls */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate max-w-[200px] sm:max-w-[400px]">
              {media.original_filename}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Video Editor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0} title="Undo">
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo">
            <Redo className="h-4 w-4" />
          </Button>
          <Button onClick={handleProcess} disabled={processing || !activeTool} className="bg-indigo-600 hover:bg-indigo-700">
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Middle Zone: Preview + Timeline */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Preview Area */}
          <div className="flex-1 bg-black flex items-center justify-center relative min-h-0">
            {loadingVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto mb-3" />
                  <p className="text-xs text-zinc-300">Loading preview...</p>
                </div>
              </div>
            )}
            {videoUrl && !error ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="max-h-full max-w-full"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onError={handleVideoError}
                playsInline
              />
            ) : null}
            {error && !loadingVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center p-6">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Playback Controls */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => handleSeek(Math.max(0, currentTime - 5))} title="Skip back 5s">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleSeek(Math.min(duration, currentTime + 5))} title="Skip forward 5s">
                <SkipForward className="h-4 w-4" />
              </Button>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono min-w-[100px]">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-20"
                  title="Volume"
                />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="h-52 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <Timeline
              clips={clips}
              selectedClipId={selectedClipId}
              currentTime={currentTime}
              duration={duration}
              onSelectClip={setSelectedClipId}
              onSeek={handleSeek}
              onClipChange={(clip, changes) => {
                setClips((prev) => {
                  const next = prev.map((c) => (c.id === clip.id ? { ...c, ...changes } : c));
                  pushHistory(next);
                  return next;
                });
              }}
            />
          </div>
        </div>

        {/* Side Zone: Contextual Tools */}
        <div className="w-72 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
          <ToolPanel
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            selectedClip={selectedClip}
            clips={clips}
            currentTime={currentTime}
            onSplit={handleSplit}
            onDelete={handleDeleteSelected}
            onApply={handleProcess}
            processing={processing}
          />
        </div>
      </div>

      {error && !success && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      {success && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
