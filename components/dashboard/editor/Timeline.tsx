'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { Clip } from './EditorWorkspace';

interface TimelineProps {
  clips: Clip[];
  selectedClipId: string | null;
  currentTime: number;
  duration: number;
  onSelectClip: (id: string) => void;
  onSeek: (time: number) => void;
  onClipChange: (clip: Clip, changes: Partial<Clip>) => void;
}

export function Timeline({ clips, selectedClipId, currentTime, duration, onSelectClip, onSeek, onClipChange }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(800);
  const pixelsPerSecond = timelineWidth / Math.max(duration, 1);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const updateWidth = () => setTimelineWidth(el.offsetWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    onSeek(Math.max(0, Math.min(duration, time)));
  }, [duration, onSeek]);

  const handleClipMouseDown = useCallback((e: React.MouseEvent, clip: Clip) => {
    e.stopPropagation();
    onSelectClip(clip.id);

    const startX = e.clientX;
    const originalStart = clip.start;
    const originalEnd = clip.end;
    const clipDuration = originalEnd - originalStart;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / pixelsPerSecond;
      const newStart = Math.max(0, Math.min(originalStart + deltaTime, duration - clipDuration));
      const newEnd = newStart + clipDuration;
      onClipChange(clip, { start: newStart, end: newEnd });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [pixelsPerSecond, duration, onSelectClip, onClipChange]);

  const handleEdgeMouseDown = useCallback((e: React.MouseEvent, clip: Clip, edge: 'left' | 'right') => {
    e.stopPropagation();
    onSelectClip(clip.id);

    const startX = e.clientX;
    const originalValue = edge === 'left' ? clip.start : clip.end;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / pixelsPerSecond;
      if (edge === 'left') {
        const newStart = Math.max(0, Math.min(originalValue + deltaTime, clip.end - 0.1));
        onClipChange(clip, { start: newStart });
      } else {
        const newEnd = Math.min(duration, Math.max(originalValue + deltaTime, clip.start + 0.1));
        onClipChange(clip, { end: newEnd });
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [pixelsPerSecond, duration, onSelectClip, onClipChange]);

  const playheadPosition = duration > 0 ? (currentTime / duration) * timelineWidth : 0;

  const generateTimeMarkers = () => {
    const markers = [];
    const safeDuration = duration > 0 ? duration : 1;
    const interval = safeDuration <= 60 ? 5 : safeDuration <= 300 ? 15 : 30;
    for (let i = 0; i <= safeDuration; i += interval) {
      markers.push(
        <div
          key={i}
          className="absolute top-0 h-full border-l border-zinc-200 dark:border-zinc-700"
          style={{ left: `${(i / safeDuration) * 100}%` }}
        >
          <span className="absolute top-1 left-1 text-[10px] text-zinc-400 font-mono">{formatTime(i)}</span>
        </div>
      );
    }
    return markers;
  };

  if (duration <= 0 || isNaN(duration)) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-zinc-400">
        Loading timeline...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-1 border-b border-zinc-200 dark:border-zinc-800">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Timeline</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400">{clips.length} clip{clips.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div
        ref={timelineRef}
        className="flex-1 relative overflow-x-auto overflow-y-hidden cursor-crosshair"
        onClick={handleTimelineClick}
      >
        <div className="relative h-full min-w-full" style={{ width: timelineWidth }}>
          {/* Time ruler background */}
          <div className="absolute top-0 left-0 right-0 h-6 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            {generateTimeMarkers()}
          </div>

          {/* Track area */}
          <div className="absolute top-6 left-0 right-0 bottom-0">
            {clips.map((clip) => {
              const left = (clip.start / duration) * timelineWidth;
              const width = Math.max(((clip.end - clip.start) / duration) * timelineWidth, 20);
              const isSelected = clip.id === selectedClipId;

              return (
                <div
                  key={clip.id}
                  className={`absolute top-2 h-14 rounded-md border-2 cursor-move transition-all ${
                    isSelected
                      ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 z-10'
                      : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400'
                  }`}
                  style={{
                    left,
                    width,
                    backgroundColor: isSelected ? '#e0e7ff' : clip.color + '30',
                  }}
                  onMouseDown={(e) => handleClipMouseDown(e, clip)}
                >
                  <div className="px-2 py-1 h-full flex flex-col justify-between overflow-hidden">
                    <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-200 truncate">{clip.name}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                      {formatTime(clip.start)} - {formatTime(clip.end)}
                    </span>
                  </div>
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 rounded-l-md"
                    onMouseDown={(e) => handleEdgeMouseDown(e, clip, 'left')}
                  />
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 rounded-r-md"
                    onMouseDown={(e) => handleEdgeMouseDown(e, clip, 'right')}
                  />
                </div>
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
              style={{ left: playheadPosition }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
