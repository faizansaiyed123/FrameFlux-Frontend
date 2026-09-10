'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const codeExamples = {
  curl: `curl -X POST "https://api.frameflux.io/media/upload" \\
  -H "Authorization: Bearer \$TOKEN" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@video.mp4"`,
  javascript: `const response = await fetch('https://api.frameflux.io/media/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
  },
  body: formData, // FormData with file
});

const { id, job_id } = await response.json();

// Poll for progress
const status = await fetch(\`https://api.frameflux.io/media/\${id}/status\`, {
  headers: { 'Authorization': 'Bearer ' + token },
});`,
  python: `import requests

files = {'file': open('video.mp4', 'rb')}
headers = {'Authorization': 'Bearer ' + token}

response = requests.post(
    'https://api.frameflux.io/media/upload',
    files=files,
    headers=headers
)

media = response.json()
media_id = media['id']
job_id = media['job_id']

# Check progress
status = requests.get(
    f'https://api.frameflux.io/media/{media_id}/status',
    headers=headers
).json()`,
};

const workflowExamples = {
  transcode: `POST /media/{id}/convert
{
  "format": "mp4",
  "width": 1920,
  "height": 1080,
  "video_bitrate": "5M",
  "video_codec": "libx264"
}`,
  trim: `POST /media/{id}/edit
{
  "operation": "trim",
  "start": 10.5,
  "end": 45.0
}`,
  merge: `POST /media/{id}/merge
{
  "media_ids": ["clip1.mp4", "clip2.mp4", "clip3.mp4"]
}`,
  overlay: `POST /media/{id}/overlay
{
  "overlays": [
    { "operation": "text", "text": "FrameFlux", "x": 20, "y": 20, "font_size": 48 },
    { "operation": "image", "image_filename": "logo.png", "x": 100, "y": 100, "opacity": 0.8 }
  ]
}`,
};

export function FeatureGrid() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
            Integration in Minutes
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            REST API with predictable responses. Copy, paste, ship.
          </p>
        </div>

        <div className="space-y-12">
          <div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
              Upload & Transcode
            </h3>
            <Tabs defaultValue="curl" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
              </TabsList>
              {Object.entries(codeExamples).map(([key, code]) => (
                <TabsContent key={key} value={key} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{key}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(code, key)}
                      className="h-8 w-8"
                    >
                      {copied === key ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <pre className="bg-zinc-950 dark:bg-zinc-900 rounded-lg p-4 overflow-x-auto text-sm text-zinc-100 font-mono leading-relaxed max-h-64">
                    <code>{code}</code>
                  </pre>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
              Composable Operations
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(workflowExamples).map(([key, code]) => (
                <Card key={key} className="border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium capitalize">{key}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <pre className="bg-zinc-950 dark:bg-zinc-900 rounded-lg p-3 overflow-x-auto text-xs text-zinc-100 font-mono leading-relaxed max-h-48">
                      <code>{code}</code>
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}