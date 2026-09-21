'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api/client';
import type { PresetResponse } from '@/types/api';
import { Loader2, Plus, Pencil, Trash2, Copy } from 'lucide-react';

const SETTINGS_FIELDS = [
  { key: 'format', label: 'Output Format', type: 'select', options: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'mpeg', 'ts', 'm4v', '3gp'] },
  { key: 'resolution', label: 'Resolution Preset', type: 'select', options: ['', '144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p'] },
  { key: 'width', label: 'Custom Width', type: 'number' },
  { key: 'height', label: 'Custom Height', type: 'number' },
  { key: 'video_codec', label: 'Video Codec', type: 'select', options: ['', 'h264', 'h265', 'vp8', 'vp9', 'av1'] },
  { key: 'audio_codec', label: 'Audio Codec', type: 'select', options: ['', 'aac', 'mp3', 'opus', 'ac3', 'no_audio'] },
  { key: 'fps_preset', label: 'Frame Rate Preset', type: 'select', options: ['', '24', '25', '30', '50', '60'] },
  { key: 'fps', label: 'Custom Frame Rate', type: 'number' },
  { key: 'aspect_ratio_preset', label: 'Aspect Ratio Preset', type: 'select', options: ['', '16:9', '9:16', '4:3', '1:1'] },
  { key: 'aspect_ratio', label: 'Custom Aspect Ratio', type: 'text' },
  { key: 'video_bitrate', label: 'Video Bitrate', type: 'text' },
  { key: 'audio_bitrate', label: 'Audio Bitrate', type: 'text' },
  { key: 'quality', label: 'Quality (CRF)', type: 'number' },
  { key: 'compression_preset', label: 'Compression Preset', type: 'select', options: ['', 'ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'] },
];

export default function PresetsPage() {
  const [presets, setPresets] = useState<PresetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PresetResponse | null>(null);
  const [activeTab, setActiveTab] = useState('custom');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [settings, setSettings] = useState<Record<string, any>>({});

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
    setSettings({});
    setDialogOpen(true);
  };

  const openEdit = (preset: PresetResponse) => {
    setEditing(preset);
    setName(preset.name);
    setDescription(preset.description || '');
    setSettings(preset.settings || {});
    setDialogOpen(true);
  };

  const handleSettingsChange = (key: string, value: any) => {
    setSettings(prev => {
      const next = { ...prev };
      if (value === '' || value === undefined || value === null) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        description: description || undefined,
        settings,
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

  const handleCopySettings = (preset: PresetResponse) => {
    navigator.clipboard.writeText(JSON.stringify(preset.settings, null, 2));
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="custom">My Presets</TabsTrigger>
          <TabsTrigger value="builtin">Built-in Presets</TabsTrigger>
        </TabsList>
        <TabsContent value="custom">
          {presets.filter(p => !p.is_builtin).length === 0 ? (
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-6 text-center">
                <p className="text-zinc-500 dark:text-zinc-400">No custom presets yet. Create your first preset to save processing settings.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {presets.filter(p => !p.is_builtin).map((preset) => (
                <PresetCard key={preset.id} preset={preset} onEdit={openEdit} onDelete={handleDelete} onCopy={handleCopySettings} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="builtin">
          {presets.filter(p => p.is_builtin).map((preset) => (
            <PresetCard key={preset.id} preset={preset} onEdit={() => {}} onDelete={() => {}} onCopy={handleCopySettings} readonly />
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <Label>Settings</Label>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {SETTINGS_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    {field.type === 'select' ? (
                      <Select value={String(settings[field.key] || '')} onValueChange={(v) => handleSettingsChange(field.key, v || undefined)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Auto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Auto</SelectItem>
                          {field.options?.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'number' ? (
                      <Input id={field.key} type="number" step={field.key === 'fps' ? '0.01' : '1'} min="1" value={settings[field.key] || ''} onChange={(e) => handleSettingsChange(field.key, e.target.value ? Number(e.target.value) : undefined)} />
                    ) : (
                      <Input id={field.key} value={settings[field.key] || ''} onChange={(e) => handleSettingsChange(field.key, e.target.value || undefined)} placeholder="Auto" />
                    )}
                  </div>
                ))}
              </div>
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

function PresetCard({ preset, onEdit, onDelete, onCopy, readonly }: { preset: PresetResponse; onEdit: (p: PresetResponse) => void; onDelete: (id: string) => void; onCopy: (p: PresetResponse) => void; readonly?: boolean }) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{preset.name}</p>
            {preset.is_builtin && <Badge variant="secondary" className="text-xs">Built-in</Badge>}
            {!preset.is_builtin && <Badge variant="outline" className="text-xs">Custom</Badge>}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {preset.description || 'No description'} • {Object.keys(preset.settings).length} settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onCopy(preset)} title="Copy settings JSON" aria-label="Copy settings JSON">
            <Copy className="h-4 w-4" />
          </Button>
          {!readonly && (
            <>
              <Button variant="ghost" size="icon" onClick={() => onEdit(preset)} aria-label="Edit preset">
                <Pencil className="h-4 w-4" />
              </Button>
              {!preset.is_builtin && (
                <Button variant="ghost" size="icon" onClick={() => onDelete(preset.id)} aria-label="Delete preset">
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
