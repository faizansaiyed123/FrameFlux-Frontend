'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api/client';
import type { Workflow } from '@/types/api';
import { Loader2, Plus, Play, Trash2, Pencil, Workflow as WorkflowIcon } from 'lucide-react';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [operations, setOperations] = useState('[]');
  const [running, setRunning] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listWorkflows();
      setWorkflows(data);
    } catch {
      // silent
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
    setOperations('[]');
    setDialogOpen(true);
  };

  const openEdit = (workflow: Workflow) => {
    setEditing(workflow);
    setName(workflow.name);
    setDescription(workflow.description || '');
    setOperations(JSON.stringify(workflow.operations, null, 2));
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        description: description || undefined,
        operations: JSON.parse(operations),
      };
      if (editing) {
        await api.updateWorkflow(editing.id, payload);
      } else {
        await api.createWorkflow(payload);
      }
      setDialogOpen(false);
      fetchWorkflows();
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    try {
      await api.deleteWorkflow(id);
      fetchWorkflows();
    } catch {
      // silent
    }
  };

  const handleRun = async (id: string) => {
    setRunning(id);
    try {
      const mediaId = prompt('Enter media ID to run this workflow on:');
      if (!mediaId) return;
      await api.runWorkflow(id, mediaId);
      alert('Workflow queued successfully');
    } catch {
      // silent
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

      {workflows.length === 0 ? (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-6 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">No workflows yet. Create your first workflow to automate processing.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <WorkflowIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{workflow.name}</p>
                    {workflow.is_builtin && (
                      <Badge variant="secondary" className="text-xs">Built-in</Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {workflow.description || 'No description'} • {workflow.operations.length} operations
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRun(workflow.id)}
                    disabled={running === workflow.id}
                  >
                    {running === workflow.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(workflow)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!workflow.is_builtin && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(workflow.id)}>
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
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
              <Label htmlFor="operations">Operations (JSON)</Label>
              <Textarea
                id="operations"
                value={operations}
                onChange={(e) => setOperations(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? 'Save' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
