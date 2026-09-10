'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Zap,
  Upload,
  Cpu,
  Eye,
  Code2,
  Globe,
  Shield,
  Layers,
  FileVideo,
  Music,
  ImageIcon,
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Distributed FFmpeg workers process video in parallel. Typical 1080p transcode completes in seconds, not minutes.',
  },
  {
    icon: Upload,
    title: 'Resumable Uploads',
    description: 'Chunked uploads with pause/resume/retry. Handle 100GB+ files reliably over unstable connections.',
  },
  {
    icon: Cpu,
    title: 'Real-time Progress',
    description: 'WebSocket-free polling with granular stages: queued → processing → completed. Progress 0-100% with human-readable status.',
  },
  {
    icon: Eye,
    title: 'Preview & Thumbnails',
    description: 'Auto-generate thumbnails, sprites, and GIF previews. Stream processed output via HLS/DASH.',
  },
  {
    icon: Code2,
    title: 'Developer Experience',
    description: 'OpenAPI 3.1 spec, typed SDKs, webhooks, idempotency keys, and comprehensive error codes.',
  },
  {
    icon: Globe,
    title: 'Global CDN Ready',
    description: 'Signed URLs, cache headers, and multi-region storage. Integrate with Cloudflare, CloudFront, or Bunny.',
  },
];

const capabilities = [
  { icon: FileVideo, label: 'Video Transcode', desc: 'H.264, HEVC, VP9, AV1' },
  { icon: Music, label: 'Audio Extract', desc: 'MP3, AAC, Opus, FLAC' },
  { icon: ImageIcon, label: 'Image Export', desc: 'WebP, JPEG, PNG, TIFF' },
  { icon: Layers, label: 'Compositing', desc: 'Overlay, watermark, text' },
  { icon: Scissors, label: 'Trim & Cut', desc: 'Frame-accurate editing' },
  { icon: Shield, label: 'DRM Ready', desc: 'FairPlay, Widevine, PlayReady' },
];

function Scissors({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88" />
      <path d="M14.47 14.48 20 20" />
      <path d="M8.12 8.12 12 12" />
    </svg>
  );
}

export function ValueProps() {
  return (
    <section className="py-24 lg:py-32 bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
            Built for Video Engineers
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Every feature designed around real media workflows — not generic file processing.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
          {features.map((feature, index) => (
            <Card key={index} className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <CardContent className="pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-4">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                  {feature.title}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="mb-16" />

        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
            Media Operations at Your Fingertips
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Composable primitives that combine into any workflow.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {capabilities.map((cap, index) => (
            <Card key={index} className="border-zinc-200 dark:border-zinc-800 p-6 text-center hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 mx-auto mb-3">
                <cap.icon className="h-6 w-6" />
              </div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-50 mb-1">{cap.label}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">{cap.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}