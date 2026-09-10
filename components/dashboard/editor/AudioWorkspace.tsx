'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
  Scissors,
  Split,
  Gauge,
  Undo,
  Redo,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Music,
} from 'lucide-react';
import { Timeline } from './Timeline';
import type { Clip } from './EditorWorkspace';

interface AudioWorkspaceProps {
  media: Media;
  onBack: () => void;
  onProcessed: () => void;
}

export function AudioWorkspace({ media, onBack, onProcessed }: AudioWorkspaceProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
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
  const [processing, setProcessing] = useState(false);

  const handlePlayPause = useCallback(async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      await audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted((prev) => !prev);
  }, [isMuted]);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || media.duration || 0);
  }, [media.duration]);

  const handleProcess = useCallback(async () => {
    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      if (activeTool === 'split') {
        await api.splitMedia(media.id, [currentTime]);
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
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Audio Editor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => {}} disabled>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => {}} disabled>
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
          <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <div className="text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-4 mx-auto">
                <Music className="h-12 w-12" />
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Audio Preview</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{media.mime_type}</p>
            </div>
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
                setClips((prev) => prev.map((c) => (c.id === clip.id ? { ...c, ...changes } : c)));
              }}
            />
          </div>
        </div>

        <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Audio Tools</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'trim', label: 'Trim', icon: Scissors },
                { id: 'split', label: 'Split', icon: Split },
                { id: 'speed', label: 'Speed', icon: Gauge },
              ].map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(isActive ? null : tool.id)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-medium">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTool === 'split' && (
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Split at playhead: {formatTime(currentTime)}
                  </p>
                  <Button onClick={handleProcess} disabled={processing} className="w-full">
                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Split Audio
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTool === 'trim' && selectedClip && (
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-zinc-500 dark:text-zinc-400">Start</Label>
                      <p className="text-sm font-mono text-zinc-900 dark:text-zinc-50">{formatTime(selectedClip.start)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-500 dark:text-zinc-400">End</Label>
                      <p className="text-sm font-mono text-zinc-900 dark:text-zinc-50">{formatTime(selectedClip.end)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTool === 'speed' && selectedClip && (
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-4 space-y-3">
                  <Label className="text-xs text-zinc-500 dark:text-zinc-400">Speed</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <Button
                        key={speed}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          if (audioRef.current) {
                            audioRef.current.playbackRate = speed;
                          }
                        }}
                      >
                        {speed}x
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
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

      <audio
        ref={audioRef}
        src={`/api/media/${media.id}/file`}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
