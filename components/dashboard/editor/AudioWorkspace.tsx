'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
  Undo,
  Redo,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Music,
  Scissors,
  Split,
  Gauge,
  ListOrdered,
  ArrowUp,
  ArrowDown,
  Plus,
} from 'lucide-react';
import { Timeline } from './Timeline';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Clip } from './EditorWorkspace';

interface AudioWorkspaceProps {
  media: Media;
  onBack: () => void;
  onProcessed: () => void;
}

export function AudioWorkspace({ media, onBack, onProcessed }: AudioWorkspaceProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
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
  const [reorderMedia, setReorderMedia] = useState<Media[]>([]);
  const [selectedAudioToAdd, setSelectedAudioToAdd] = useState('');
  const [reorderError, setReorderError] = useState('');

  useEffect(() => {
    let objectUrl: string | null = null;

    api.getMediaFile(media.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);
      })
      .catch(() => {
        setError('Unable to load audio preview.');
      });

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [media.id]);

  const drawWaveform = useCallback(() => {
    const canvas = waveformRef.current;
    if (!canvas || duration <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    ctx.clearRect(0, 0, width, height);

    const bars = 120;
    const barWidth = width / bars;
    const centerY = height / 2;

    for (let i = 0; i < bars; i++) {
      const x = i * barWidth;
      const normalizedPosition = i / bars;
      const amplitude = Math.sin(normalizedPosition * Math.PI * 10) * 0.4 + Math.random() * 0.3;
      const barHeight = Math.max(2, amplitude * height * 0.7);

      ctx.fillStyle = '#6366f1';
      ctx.fillRect(x + 1, centerY - barHeight / 2, barWidth - 2, barHeight);
    }

    const playheadX = (currentTime / duration) * width;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  }, [currentTime, duration]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

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
    const audioDuration = audioRef.current.duration || media.duration || 0;
    setDuration(audioDuration);
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

  useEffect(() => {
    if (activeTool !== 'reorder') return;
    api.listMedia({ media_type: 'audio' })
      .then((items) => setReorderMedia(items.filter((item) => !clips.some((clip) => clip.mediaId === item.id))))
      .catch(() => setReorderError('Unable to load audio clips.'));
  }, [activeTool, clips]);

  const addAudioClip = useCallback(() => {
    const item = reorderMedia.find((candidate) => candidate.id === selectedAudioToAdd);
    if (!item) return;
    setClips((prev) => [
      ...prev,
      {
        id: item.id,
        mediaId: item.id,
        name: item.original_filename,
        start: 0,
        end: item.duration || 0,
        duration: item.duration || 0,
        color: '#6366f1',
      },
    ]);
    setSelectedAudioToAdd('');
  }, [reorderMedia, selectedAudioToAdd]);

  const moveClip = useCallback((index: number, direction: -1 | 1) => {
    setClips((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const handleReorderExport = useCallback(async () => {
    if (clips.length < 2) {
      setReorderError('Add at least two audio clips to reorder.');
      return;
    }
    setProcessing(true);
    setReorderError('');
    setError('');
    setSuccess('');
    try {
      await api.reorderAudioClips(media.id, clips.map((clip) => clip.mediaId));
      setSuccess('Audio clips reordered and exported successfully.');
      onProcessed();
    } catch (err) {
      setReorderError(err instanceof Error ? err.message : 'Reorder failed');
    } finally {
      setProcessing(false);
    }
  }, [clips, media.id, onProcessed]);

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
        <div className="flex flex-1 flex-col">
          <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <div className="w-full max-w-2xl px-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <Music className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{media.original_filename}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{media.mime_type}</p>
                </div>
              </div>
              <canvas
                ref={waveformRef}
                className="w-full h-24 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                onClick={(e) => {
                  const canvas = waveformRef.current;
                  if (!canvas || duration <= 0) return;
                  const rect = canvas.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const time = (x / rect.width) * duration;
                  handleSeek(Math.max(0, Math.min(duration, time)));
                }}
              />
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => handleSeek(Math.max(0, currentTime - 5))}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePlayPause}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleSeek(Math.min(duration, currentTime + 5))}>
                <SkipForward className="h-4 w-4" />
              </Button>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono min-w-[100px]">
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

        <div className="w-72 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Audio Tools</h2>
            <div className="grid grid-cols-3 gap-1.5">
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
                    className={`flex flex-col items-center gap-1 rounded-md border p-1.5 text-center transition-colors ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-medium leading-tight">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {activeTool === 'split' && (
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-3 space-y-2">
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Split at playhead: {formatTime(currentTime)}
                  </p>
                  <Button onClick={handleProcess} disabled={processing} size="sm" className="w-full">
                    {processing && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Split Audio
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTool === 'trim' && selectedClip && (
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-zinc-500">Start</Label>
                      <p className="text-xs font-mono text-zinc-900 dark:text-zinc-50">{formatTime(selectedClip.start)}</p>
                    </div>
                    <div>
                      <Label className="text-[10px] text-zinc-500">End</Label>
                      <p className="text-xs font-mono text-zinc-900 dark:text-zinc-50">{formatTime(selectedClip.end)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTool === 'reorder' && (
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-3 space-y-3">
                  <div>
                    <Label className="text-[10px] text-zinc-500">Add audio clip</Label>
                    <div className="flex gap-2 mt-1">
                      <Select value={selectedAudioToAdd} onValueChange={setSelectedAudioToAdd}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Choose an audio file" />
                        </SelectTrigger>
                        <SelectContent>
                          {reorderMedia.map((item) => (
                            <SelectItem key={item.id} value={item.id}>{item.original_filename}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={addAudioClip} disabled={!selectedAudioToAdd}>
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] text-zinc-500">Clip order</Label>
                    {clips.map((clip, index) => (
                      <div key={clip.id} className="flex items-center gap-2 rounded border p-2">
                        <span className="flex-1 truncate text-xs">{index + 1}. {clip.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          aria-label={'Move ' + clip.name + ' up'}
                          onClick={() => moveClip(index, -1)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          aria-label={'Move ' + clip.name + ' down'}
                          onClick={() => moveClip(index, 1)}
                          disabled={index === clips.length - 1}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleReorderExport} disabled={processing || clips.length < 2} className="w-full">
                    {processing ? 'Exporting...' : 'Reorder & Export'}
                  </Button>
                  {reorderError && <p className="text-[10px] text-red-600">{reorderError}</p>}
                </CardContent>
              </Card>
            )}

            {activeTool === 'speed' && selectedClip && (
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-3 space-y-2">
                  <Label className="text-[10px] text-zinc-500">Speed</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <Button
                        key={speed}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
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

      <audio
        ref={audioRef}
        src={audioUrl || ''}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onError={() => setError('Unable to load audio preview.')}
        className="hidden"
        preload="metadata"
      />
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
