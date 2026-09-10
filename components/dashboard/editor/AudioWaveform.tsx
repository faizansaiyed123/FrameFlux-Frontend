'use client';

import { useEffect, useRef, useCallback } from 'react';

interface AudioWaveformProps {
  mediaId: string;
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

export function AudioWaveform({ duration, currentTime, onSeek }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawWaveform = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const bars = 100;
    const barWidth = width / bars;
    const centerY = height / 2;

    for (let i = 0; i < bars; i++) {
      const x = i * barWidth;
      const normalizedPosition = i / bars;
      const amplitude = Math.sin(normalizedPosition * Math.PI * 8) * 0.5 + Math.random() * 0.3;
      const barHeight = Math.max(2, amplitude * height * 0.8);

      ctx.moveTo(x, centerY - barHeight / 2);
      ctx.lineTo(x, centerY + barHeight / 2);
    }

    ctx.stroke();

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

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    onSeek(Math.max(0, Math.min(duration, time)));
  }, [duration, onSeek]);

  return (
    <div className="w-full h-16 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleClick}
      />
    </div>
  );
}
