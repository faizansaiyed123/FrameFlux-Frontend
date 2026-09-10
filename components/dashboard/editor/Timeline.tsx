'use client';

import { useRef, useCallback } from 'react';
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
  const pixelsPerSecond = 50;
  const timelineWidth = Math.max(duration * pixelsPerSecond, 800);

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

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / pixelsPerSecond;
      const newStart = Math.max(0, Math.min(originalStart + deltaTime, duration - (originalEnd - originalStart)));
      const newEnd = newStart + (originalEnd - originalStart);
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
        const newStart = Math.max(0, Math.min(originalValue + deltaTime, clip.end - 0.5));
        onClipChange(clip, { start: newStart });
      } else {
        const newEnd = Math.min(duration, Math.max(originalValue + deltaTime, clip.start + 0.5));
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Timeline</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {}}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Zoom
          </button>
        </div>
      </div>

      <div ref={timelineRef} className="flex-1 relative overflow-x-auto overflow-y-hidden cursor-crosshair" onClick={handleTimelineClick}>
        <div className="relative h-full" style={{ width: timelineWidth }}>
          {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full border-l border-zinc-200 dark:border-zinc-700"
              style={{ left: i * pixelsPerSecond }}
            >
              <span className="absolute top-1 left-1 text-[10px] text-zinc-400 font-mono">{formatTime(i)}</span>
            </div>
          ))}

          {clips.map((clip) => {
            const left = clip.start * pixelsPerSecond;
            const width = (clip.end - clip.start) * pixelsPerSecond;
            const isSelected = clip.id === selectedClipId;

            return (
              <div
                key={clip.id}
                className={`absolute top-8 h-16 rounded-md border-2 cursor-move transition-colors ${
                  isSelected ? 'border-indigo-500 z-10' : 'border-transparent hover:border-zinc-300'
                }`}
                style={{
                  left,
                  width: Math.max(width, 20),
                  backgroundColor: clip.color + '40',
                  borderColor: isSelected ? '#6366f1' : clip.color,
                }}
                onMouseDown={(e) => handleClipMouseDown(e, clip)}
              >
                <div className="px-2 py-1 h-full flex flex-col justify-between">
                  <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-200 truncate">{clip.name}</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                    {formatTime(clip.start)} - {formatTime(clip.end)}
                  </span>
                </div>
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10"
                  onMouseDown={(e) => handleEdgeMouseDown(e, clip, 'left')}
                />
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10"
                  onMouseDown={(e) => handleEdgeMouseDown(e, clip, 'right')}
                />
              </div>
            );
          })}

          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
            style={{ left: playheadPosition }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45" />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
