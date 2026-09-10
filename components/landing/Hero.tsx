'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Zap, Shield, Layers } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Now in Public Beta
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-6">
            Professional Video
            <br />
            <span className="text-indigo-600 dark:text-indigo-400">Processing API</span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Transcode, edit, merge, and transform video at scale. Developer-first REST API
            with real-time progress, resumable uploads, and zero infrastructure overhead.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button size="lg" asChild className="gap-2">
              <Link href="/auth/signup">
                Start Building Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/docs">Read Documentation</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-zinc-500 dark:text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4" />
              100 GB free monthly
            </span>
            <span className="flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              Cancel anytime
            </span>
          </div>
        </div>

        <div className="mt-20 relative">
          <div className="aspect-video max-w-4xl mx-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
                  <Play className="h-10 w-10 text-indigo-600 dark:text-indigo-400 ml-1" />
                </div>
                <p className="text-zinc-500 dark:text-zinc-400">Terminal demo — API in action</p>
                <pre className="mt-4 text-left max-w-md mx-auto bg-zinc-900 dark:bg-zinc-950 rounded-lg p-4 text-xs text-zinc-300 overflow-x-auto">
{`$ curl -X POST https://api.frameflux.io/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@input.mp4"

{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "processing_status": "queued",
  "job_id": "job_abc123..."
}`}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}