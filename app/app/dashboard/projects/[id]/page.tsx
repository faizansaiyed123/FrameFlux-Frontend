'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Project, Media, ProjectProcessingStatusResponse, ProjectFolder, ProjectWorkflowSummary, ProjectHistoryEntry } from '@/types/api';
import {
  ArrowLeft,
  Loader2,
  Film,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  FolderOpen,
  Workflow,
  History,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<
  string,
  { icon: typeof Clock; color: string; label: string }
> = {
  empty: { icon: Clock, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Empty' },
  queued: { icon: Clock, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', label: 'Queued' },
  processing: { icon: Loader2, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', label: 'Processing' },
  completed: { icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', label: 'Completed' },
  failed: { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', label: 'Failed' },
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [status, setStatus] = useState<ProjectProcessingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [workflows, setWorkflows] = useState<ProjectWorkflowSummary[]>([]);
  const [history, setHistory] = useState<ProjectHistoryEntry[]>([]);
  const [folderName, setFolderName] = useState('');
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const [projectData, mediaData, statusData] = await Promise.all([
        api.getProject(projectId),
        api.listProjectMedia(projectId),
        api.getProjectStatus(projectId).catch(() => null),
      ]);
      setProject(projectData);
      setMedia(mediaData);
      setStatus(statusData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchExtras = useCallback(async () => {
    try {
      const [foldersData, workflowsData, historyData] = await Promise.all([
        api.listProjectFolders(projectId).catch(() => []),
        api.listProjectWorkflows(projectId).catch(() => []),
        api.listProjectHistory(projectId).catch(() => []),
      ]);
      setFolders(foldersData);
      setWorkflows(workflowsData);
      setHistory(historyData);
    } catch {
      // silent
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    fetchExtras();
  }, [fetchExtras]);

  const handleProcess = async () => {
    setProcessing(true);
    try {
      await api.processProject(projectId);
      await fetchProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process project');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    try {
      await api.createProjectFolder(projectId, folderName.trim());
      setFolderDialogOpen(false);
      setFolderName('');
      fetchExtras();
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="h-8 w-48 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-4 w-32 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded mt-2" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Project</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">View and manage your project</p>
          </div>
        </div>
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{error || 'Project not found'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = status ? statusConfig[status.status] || statusConfig.empty : null;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{project.name}</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              {project.description || 'No description'} • Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleProcess} disabled={processing || media.length === 0}>
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Process All
              </>
            )}
          </Button>
          <Button variant="outline" onClick={fetchProject}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {status && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {statusInfo && (
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', statusInfo.color)}>
                    <statusInfo.icon className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">Project Status: {statusInfo?.label || status.status}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {status.total} total • {status.completed} completed • {status.processing} processing • {status.queued} queued • {status.failed} failed
                  </p>
                </div>
              </div>
              <div className="w-32">
                <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all"
                    style={{ width: `${status.total > 0 ? (status.completed / status.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 text-right">
                  {status.total > 0 ? Math.round((status.completed / status.total) * 100) : 0}% complete
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="media" className="space-y-6">
        <TabsList>
          <TabsTrigger value="media">Media ({media.length})</TabsTrigger>
          <TabsTrigger value="folders">Folders ({folders.length})</TabsTrigger>
          <TabsTrigger value="workflows">Workflows ({workflows.length})</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="media" className="space-y-4">
          {media.length === 0 ? (
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 mb-4">
                  <Film className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">No media files</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm">
                  Upload media files to this project to start processing.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {media.map((item) => (
                <Card key={item.id} className="border-zinc-200 dark:border-zinc-800">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                          <Film className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-50 truncate max-w-[200px]">
                            {item.original_filename}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {item.mime_type} • {item.processing_status}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="folders" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setFolderDialogOpen(true)} className="gap-2">
              <FolderOpen className="h-4 w-4" />
              New Folder
            </Button>
          </div>
          {folders.length === 0 ? (
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No folders yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {folders.map((folder) => (
                <Card key={folder.id} className="border-zinc-200 dark:border-zinc-800">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{folder.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="workflows" className="space-y-4">
          {workflows.length === 0 ? (
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No workflows linked to this project.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workflows.map((wf) => (
                <Card key={wf.id} className="border-zinc-200 dark:border-zinc-800">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      <Workflow className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{wf.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="history" className="space-y-4">
          {history.length === 0 ? (
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No history yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {history.map((entry) => (
                <Card key={entry.id} className="border-zinc-200 dark:border-zinc-800">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      <History className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 capitalize">{entry.operation}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {entry.status} • {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input id="folderName" value={folderName} onChange={(e) => setFolderName(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFolderDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
