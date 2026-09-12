'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import type { StorageUsageResponse, StorageByTypeResponse, StorageByFolderResponse } from '@/types/api';
import { Loader2, HardDrive, FolderOpen, Film } from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function StoragePage() {
  const [usage, setUsage] = useState<StorageUsageResponse | null>(null);
  const [byType, setByType] = useState<StorageByTypeResponse[]>([]);
  const [byFolder, setByFolder] = useState<StorageByFolderResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usageData, typeData, folderData] = await Promise.all([
        api.getStorageUsage(),
        api.getStorageByType(),
        api.getStorageByFolder(),
      ]);
      setUsage(usageData);
      setByType(typeData);
      setByFolder(folderData);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Storage</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Monitor your storage usage</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Total Storage</CardTitle>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{formatBytes(usage?.total_size || 0)}</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{usage?.total_files || 0} files</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800 sm:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Film className="h-4 w-4" />
              By Media Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byType.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No media yet.</p>
            ) : (
              <div className="space-y-3">
                {byType.map((item) => (
                  <div key={item.media_type} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{item.media_type}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.count} files</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 w-24 text-right">{formatBytes(item.total_size)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800 sm:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              By Folder
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byFolder.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No folders yet.</p>
            ) : (
              <div className="space-y-3">
                {byFolder.map((item) => (
                  <div key={item.folder} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{item.folder}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.count} files</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 w-24 text-right">{formatBytes(item.total_size)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
