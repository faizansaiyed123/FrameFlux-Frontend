'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/client';
import { Loader2, Zap, Play, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  queued: { icon: Clock, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', label: 'Queued' },
  processing: { icon: Loader2, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', label: 'Processing' },
  completed: { icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', label: 'Completed' },
  failed: { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', label: 'Failed' },
  direct: { icon: Play, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', label: 'Direct API' },
};

export default function QuickActionsPage() {
  const [quickActions, setQuickActions] = useState<{ video: { id: string; label: string; icon: string }[]; audio: { id: string; label: string; icon: string }[] } | null>(null);
  const [mediaId, setMediaId] = useState('');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<Record<string, { status: string; progress: number; error?: string }>>({});

  const fetchQuickActions = useCallback(async () => {
    try {
      const data = await api.getQuickActions();
      setQuickActions(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuickActions();
  }, [fetchQuickActions]);

  const handleExecute = async (actionId: string) => {
    if (!mediaId) return;
    setExecuting(actionId);
    setExecutionStatus(prev => ({ ...prev, [actionId]: { status: 'processing', progress: 0 } }));
    try {
      const result = await api.executeQuickAction(mediaId, actionId);
      setExecutionStatus(prev => ({ ...prev, [actionId]: { status: result.status, progress: 100 } }));
    } catch (err) {
      setExecutionStatus(prev => ({ ...prev, [actionId]: { status: 'failed', progress: 0, error: err instanceof Error ? err.message : 'Failed' } }));
    } finally {
      setExecuting(null);
    }
  };

  const getStatusInfo = (status: string) => statusConfig[status] || statusConfig.queued;

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Quick Actions</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">Quickly apply common operations to your media</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Quick Actions</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Quickly apply common operations to your media</p>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Select Media
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter Media ID"
              value={mediaId}
              onChange={(e) => setMediaId(e.target.value)}
              className="w-full sm:w-96 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Find Media IDs in the Media Library</p>
          </div>
        </CardContent>
      </Card>

      {quickActions && (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Video Actions</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {quickActions.video.map((action) => (
                <Card key={action.id} className="border-zinc-200 dark:border-zinc-800">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">{action.label}</span>
                        <Badge variant="secondary" className="text-xs">Video</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">{action.id}</span>
                      </div>
                      <Button
                        onClick={() => handleExecute(action.id)}
                        disabled={!mediaId || executing === action.id}
                        className="w-full"
                      >
                        {executing === action.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Execute
                          </>
                        )}
                      </Button>
                      {executionStatus[action.id] && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{executionStatus[action.id].status}</span>
                            <span>{executionStatus[action.id].progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full transition-all',
                                executionStatus[action.id].status === 'failed'
                                  ? 'bg-red-500'
                                  : executionStatus[action.id].status === 'completed'
                                  ? 'bg-green-500'
                                  : 'bg-indigo-500'
                              )}
                              style={{ width: `${executionStatus[action.id].progress}%` }}
                            />
                          </div>
                          {executionStatus[action.id].error && (
                            <p className="text-xs text-red-600 dark:text-red-400">{executionStatus[action.id].error}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Audio Actions</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {quickActions.audio.map((action) => (
                <Card key={action.id} className="border-zinc-200 dark:border-zinc-800">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">{action.label}</span>
                        <Badge variant="secondary" className="text-xs">Audio</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">{action.id}</span>
                      </div>
                      <Button
                        onClick={() => handleExecute(action.id)}
                        disabled={!mediaId || executing === action.id}
                        className="w-full"
                      >
                        {executing === action.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Execute
                          </>
                        )}
                      </Button>
                      {executionStatus[action.id] && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{executionStatus[action.id].status}</span>
                            <span>{executionStatus[action.id].progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full transition-all',
                                executionStatus[action.id].status === 'failed'
                                  ? 'bg-red-500'
                                  : executionStatus[action.id].status === 'completed'
                                  ? 'bg-green-500'
                                  : 'bg-indigo-500'
                              )}
                              style={{ width: `${executionStatus[action.id].progress}%` }}
                            />
                          </div>
                          {executionStatus[action.id].error && (
                            <p className="text-xs text-red-600 dark:text-red-400">{executionStatus[action.id].error}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {!quickActions && !loading && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Zap className="h-12 w-12 text-zinc-400 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">No quick actions available</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Check back later or contact support</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}