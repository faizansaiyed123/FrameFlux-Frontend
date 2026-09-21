'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api/client';
import type { Workflow, WorkflowOperation } from '@/types/api';
import { Loader2, Plus, Play, Trash2, Pencil, Workflow as WorkflowIcon, X, ChevronDown, ChevronUp } from 'lucide-react';

const OPERATION_TYPES = [
  { value: 'convert', label: 'Convert', params: ['format', 'resolution', 'video_codec', 'audio_codec', 'fps', 'quality'] },
  { value: 'compress', label: 'Compress', params: ['format', 'width', 'height', 'video_bitrate', 'audio_bitrate', 'quality', 'compression_preset'] },
  { value: 'extract_audio', label: 'Extract Audio', params: ['format', 'bitrate', 'sample_rate', 'channels', 'quality_preset'] },
  { value: 'generate_thumbnail', label: 'Generate Thumbnail', params: ['timestamp', 'width', 'height', 'format'] },
  { value: 'generate_preview', label: 'Generate Preview', params: ['duration', 'start', 'width', 'fps'] },
  { value: 'trim', label: 'Trim', params: ['start', 'end'] },
  { value: 'cut', label: 'Cut', params: ['start', 'end'] },
  { value: 'crop', label: 'Crop', params: ['width', 'height', 'x', 'y'] },
  { value: 'resize', label: 'Resize', params: ['width', 'height'] },
  { value: 'rotate', label: 'Rotate', params: ['angle'] },
  { value: 'remove_audio', label: 'Remove Audio', params: [] },
  { value: 'replace_audio', label: 'Replace Audio', params: ['audio_path', 'fade_in', 'fade_out'] },
  { value: 'add_subtitles', label: 'Add Subtitles', params: ['subtitle_path', 'font_size', 'font_color', 'position'] },
  { value: 'create_gif', label: 'Create GIF', params: ['start', 'duration', 'width', 'fps', 'quality'] },
  { value: 'speed', label: 'Change Speed', params: ['speed'] },
  { value: 'overlay', label: 'Add Overlay', params: ['text', 'x', 'y', 'font_size', 'opacity'] },
  { value: 'fade', label: 'Fade In/Out', params: ['fade_type', 'duration', 'start_time'] },
];

function OperationBuilder({ operations, onChange }: { operations: WorkflowOperation[]; onChange: (ops: WorkflowOperation[]) => void }) {
  return (
    <div className="space-y-3">
      {operations.map((op, idx) => (
        <Card key={idx} className="border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Select value={op.type} onValueChange={(v) => {
                const newOps = [...operations];
                newOps[idx] = { ...newOps[idx], type: v, params: {} };
                onChange(newOps);
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select operation" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATION_TYPES.map((ot) => (
                    <SelectItem key={ot.value} value={ot.value}>{ot.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => onChange(operations.filter((_, i) => i !== idx))}>
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
            {OPERATION_TYPES.find(ot => ot.value === op.type)?.params.map((param) => (
              <div key={param} className="space-y-1">
                <Label className="text-xs text-zinc-600 dark:text-zinc-400 capitalize">{param.replace(/_/g, ' ')}</Label>
                <Input
                  value={String(op.params?.[param] ?? '')}
                  onChange={(e) => {
                    const newOps = [...operations];
                    newOps[idx] = { ...newOps[idx], params: { ...(newOps[idx].params || {}), [param]: e.target.value } };
                    onChange(newOps);
                  }}
                  placeholder={`Enter ${param}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...operations, { type: 'convert', params: {} }])} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Add Operation
      </Button>
    </div>
  );
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [activeTab, setActiveTab] = useState('custom');
  const [running, setRunning] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [operations, setOperations] = useState<WorkflowOperation[]>([]);

  // For run workflow dialog
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runWorkflowId, setRunWorkflowId] = useState<string | null>(null);
  const [runMediaId, setRunMediaId] = useState('');
  const [runMediaList, setRunMediaList] = useState<{id: string; original_filename: string}[]>([]);
  const [runMediaLoading, setRunMediaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listWorkflows();
      setWorkflows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setOperations([{ type: 'convert', params: {} }]);
    setDialogOpen(true);
  };

  const openEdit = (workflow: Workflow) => {
    setEditing(workflow);
    setName(workflow.name);
    setDescription(workflow.description || '');
    setOperations(workflow.operations || []);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        name,
        description: description || undefined,
        operations,
      };
      if (editing) {
        await api.updateWorkflow(editing.id, payload);
      } else {
        await api.createWorkflow(payload);
      }
      setDialogOpen(false);
      fetchWorkflows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workflow');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    try {
      setError(null);
      await api.deleteWorkflow(id);
      fetchWorkflows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workflow');
    }
  };

  const handleRunOpen = async (id: string) => {
    setRunWorkflowId(id);
    setRunMediaLoading(true);
    setError(null);
    try {
      const data = await api.listMedia();
      setRunMediaList(data.map(m => ({ id: m.id, original_filename: m.original_filename })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media files');
    } finally {
      setRunMediaLoading(false);
    }
    setRunDialogOpen(true);
  };

  const handleRunConfirm = async () => {
    if (!runWorkflowId || !runMediaId) return;
    setRunning(runWorkflowId);
    setError(null);
    try {
      await api.runWorkflow(runWorkflowId, runMediaId);
      alert('Workflow queued successfully');
      setRunDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run workflow');
    } finally {
      setRunning(null);
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
      {error && <Alert className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Workflows</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">Create and manage processing workflows</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Workflow
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="custom">My Workflows</TabsTrigger>
          <TabsTrigger value="builtin">Built-in Workflows</TabsTrigger>
        </TabsList>
        <TabsContent value="custom">
          {workflows.filter(w => !w.is_builtin).length === 0 ? (
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-6 text-center">
                <p className="text-zinc-500 dark:text-zinc-400">No custom workflows yet. Create your first workflow to automate processing.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {workflows.filter(w => !w.is_builtin).map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} onEdit={openEdit} onDelete={handleDelete} onRun={handleRunOpen} running={running === workflow.id} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="builtin">
          {workflows.filter(w => w.is_builtin).map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} onEdit={() => {}} onDelete={() => {}} onRun={handleRunOpen} running={running === workflow.id} readonly />
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Workflow' : 'Create Workflow'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Operations (executed in order)</Label>
              <OperationBuilder operations={operations} onChange={setOperations} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? 'Save' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Media File</Label>
              {runMediaLoading ? (
                <Input disabled placeholder="Loading..." />
              ) : (
                <Select value={runMediaId} onValueChange={setRunMediaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose media file" />
                  </SelectTrigger>
                  <SelectContent>
                    {runMediaList.map((media) => (
                      <SelectItem key={media.id} value={media.id}>{media.original_filename}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRunDialogOpen(false); setRunWorkflowId(null); setRunMediaId(''); }}>Cancel</Button>
            <Button onClick={handleRunConfirm} disabled={!!running || !runMediaId}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {running ? 'Running...' : 'Run Workflow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkflowCard({ workflow, onEdit, onDelete, onRun, running, readonly }: { workflow: Workflow; onEdit: (w: Workflow) => void; onDelete: (id: string) => void; onRun: (id: string) => void; running: boolean; readonly?: boolean }) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
          <WorkflowIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{workflow.name}</p>
            {workflow.is_builtin && <Badge variant="secondary" className="text-xs">Built-in</Badge>}
            {!workflow.is_builtin && <Badge variant="outline" className="text-xs">Custom</Badge>}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {workflow.description || 'No description'} • {workflow.operations.length} operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onRun(workflow.id)} disabled={running || readonly} aria-label={running ? 'Workflow running' : 'Run workflow'}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          </Button>
          {!readonly && (
            <>
              <Button variant="ghost" size="icon" onClick={() => onEdit(workflow)} aria-label="Edit workflow">
                <Pencil className="h-4 w-4" />
              </Button>
              {!workflow.is_builtin && (
                <Button variant="ghost" size="icon" onClick={() => onDelete(workflow.id)} aria-label="Delete workflow">
                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
