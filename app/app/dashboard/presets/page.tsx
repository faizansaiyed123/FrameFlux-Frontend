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
import type { PresetResponse } from '@/types/api';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';

export default function PresetsPage() {
  const [presets, setPresets] = useState<PresetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PresetResponse | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [settings, setSettings] = useState('{}');

  const fetchPresets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listPresets();
      setPresets(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setSettings('{}');
    setDialogOpen(true);
  };

  const openEdit = (preset: PresetResponse) => {
    setEditing(preset);
    setName(preset.name);
    setDescription(preset.description || '');
    setSettings(JSON.stringify(preset.settings, null, 2));
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        description: description || undefined,
        settings: JSON.parse(settings),
      };
      if (editing) {
        await api.updatePreset(editing.id, payload);
      } else {
        await api.createPreset(payload);
      }
      setDialogOpen(false);
      fetchPresets();
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this preset?')) return;
    try {
      await api.deletePreset(id);
      fetchPresets();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Presets</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">Manage your processing presets</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Preset
        </Button>
      </div>

      {presets.length === 0 ? (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-6 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">No presets yet. Create your first preset to save processing settings.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {presets.map((preset) => (
            <Card key={preset.id} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{preset.name}</p>
                    {preset.is_builtin && (
                      <Badge variant="secondary" className="text-xs">Built-in</Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {preset.description || 'No description'} • {Object.keys(preset.settings).length} settings
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(preset)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!preset.is_builtin && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(preset.id)}>
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
            <DialogTitle>{editing ? 'Edit Preset' : 'Create Preset'}</DialogTitle>
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
              <Label htmlFor="settings">Settings (JSON)</Label>
              <Textarea
                id="settings"
                value={settings}
                onChange={(e) => setSettings(e.target.value)}
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
