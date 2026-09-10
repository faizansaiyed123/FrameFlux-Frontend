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
  Maximize,
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
    setDuration(videoRef.current.duration || media.duration || 0);
  }, [media.duration]);

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
  }, [selectedClipId, pushHistory]);

  const handleProcess = useCallback(async () => {
    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      if (activeTool === 'split') {
        const selectedClip = clips.find((c) => c.id === selectedClipId);
        if (selectedClip) {
          await api.splitMedia(media.id, [currentTime]);
        }
      } else if (activeTool === 'edit') {
        const selectedClip = clips.find((c) => c.id === selectedClipId);
        if (selectedClip) {
          await api.editMedia(media.id, {
            operation: 'trim',
            start: selectedClip.start,
            end: selectedClip.end,
          });
        }
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
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate max-w-[200px] sm:max-w-[400px]">
              {media.original_filename}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Editor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1}>
            <Redo className="h-4 w-4" />
          </Button>
          <Button onClick={handleProcess} disabled={processing || !activeTool}>
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
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col">
          <div className="flex-1 bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              src={`/api/media/${media.id}/file`}
              className="max-h-full max-w-full"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => handleSeek(Math.max(0, currentTime - 5))}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePlayPause}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleSeek(Math.min(duration, currentTime + 5))}>
                <SkipForward className="h-4 w-4" />
              </Button>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={toggleMute}>
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
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => {}}>
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="h-48 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
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

        <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
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

      {error && (
        <div className="fixed bottom-4 right-4">
          <Alert className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      {success && (
        <div className="fixed bottom-4 right-4">
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
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
