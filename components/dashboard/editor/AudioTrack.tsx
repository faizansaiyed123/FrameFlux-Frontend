'use client';

import { useRef, useCallback, useEffect } from 'react';

interface AudioTrackProps {
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

export function AudioTrack({ duration, currentTime, onSeek }: AudioTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<number[]>([]);

  useEffect(() => {
    if (barsRef.current.length === 0) {
      const count = 120;
      barsRef.current = Array.from({ length: count }, (_, i) => {
        const normalized = i / count;
        return Math.sin(normalized * Math.PI * 10) * 0.4 + Math.random() * 0.3;
      });
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || duration <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const bars = barsRef.current.length || 120;
    const barWidth = width / bars;
    const centerY = height / 2;

    for (let i = 0; i < bars; i++) {
      const x = i * barWidth;
      const amplitude = barsRef.current[i] || 0.3;
      const barHeight = Math.max(2, amplitude * height * 0.7);
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(x + 1, centerY - barHeight / 2, barWidth - 2, barHeight);
    }

    const playheadX = duration > 0 ? (currentTime / duration) * width : 0;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  }, [duration, currentTime]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!containerRef.current || duration <= 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = (x / rect.width) * duration;
      onSeek(Math.max(0, Math.min(duration, time)));
    },
    [duration, onSeek],
  );

  if (duration <= 0) {
    return (
      <div className="h-14 flex items-center justify-center text-[10px] text-zinc-400">
        Audio track loading...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-14 w-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer rounded"
        onClick={handleClick}
      />
    </div>
  );
}
