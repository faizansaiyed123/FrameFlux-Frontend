'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/client';
import type { SearchMediaItem } from '@/types/api';
import { Loader2, Search, Film } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [folder, setFolder] = useState('');
  const [tag, setTag] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');
  const [results, setResults] = useState<SearchMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.searchMedia({
        q: query || undefined,
        media_type: mediaType || undefined,
        folder: folder || undefined,
        tag: tag || undefined,
        processing_status: processingStatus || undefined,
      });
      setResults(data);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, mediaType, folder, tag, processingStatus]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Search</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Find media files across your library</p>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Search Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="query">Filename</Label>
                <Input
                  id="query"
                  placeholder="Search by filename..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mediaType">Media Type</Label>
                <Input
                  id="mediaType"
                  placeholder="e.g. video, audio"
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="folder">Folder</Label>
                <Input
                  id="folder"
                  placeholder="Folder name"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag">Tag</Label>
                <Input
                  id="tag"
                  placeholder="Tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Input
                  id="status"
                  placeholder="e.g. completed, pending"
                  value={processingStatus}
                  onChange={(e) => setProcessingStatus(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {searched && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>
          {results.length === 0 ? (
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-6 text-center">
                <p className="text-zinc-500 dark:text-zinc-400">No media files match your search criteria.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {results.map((item) => (
                <Card key={item.id} className="border-zinc-200 dark:border-zinc-800">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      <Film className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{item.original_filename}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {item.media_type} • {item.file_size ? `${(item.file_size / 1024 / 1024).toFixed(1)} MB` : ''} • {formatDistanceToNow(new Date(item.created_at || Date.now()), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">{item.processing_status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
