'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import type { FavoriteResponse } from '@/types/api';
import { Loader2, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listFavorites();
      setFavorites(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemove = async (mediaId: string) => {
    try {
      await api.removeFavorite(mediaId);
      fetchFavorites();
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded" />
        <div className="h-64 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Favorites</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Your favorite media files</p>
      </div>

      {favorites.length === 0 ? (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 mb-4">
              <Heart className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">No favorites yet</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm">
              Mark media files as favorites to see them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {favorites.map((fav) => (
            <Card key={fav.id} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Media ID: {fav.media_id}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Added {formatDistanceToNow(new Date(fav.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRemove(fav.media_id)}>
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
