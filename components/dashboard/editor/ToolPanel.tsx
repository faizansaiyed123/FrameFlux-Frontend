'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Scissors, Split, Gauge, Image, Snowflake, RefreshCw, Merge, ClipboardList, Trash2 } from 'lucide-react';
import { Clip } from './EditorWorkspace';

interface ToolPanelProps {
  activeTool: string | null;
  onSelectTool: (tool: string) => void;
  selectedClip: Clip | null;
  clips: Clip[];
  currentTime: number;
  onSplit: () => void;
  onDelete: () => void;
  onApply: () => void;
  processing: boolean;
}

const clipTools = [
  { id: 'trim', label: 'Trim', icon: Scissors, description: 'Trim clip edges' },
  { id: 'split', label: 'Split', icon: Split, description: 'Split at playhead' },
  { id: 'speed', label: 'Speed', icon: Gauge, description: 'Adjust speed' },
  { id: 'transform', label: 'Transform', icon: RefreshCw, description: 'Scale/rotate' },
  { id: 'overlay', label: 'Overlay', icon: Image, description: 'Text/watermark' },
  { id: 'freeze', label: 'Freeze', icon: Snowflake, description: 'Freeze frame' },
] as const;

const multiClipTools = [
  { id: 'merge', label: 'Merge', icon: Merge, description: 'Merge clips' },
  { id: 'clips', label: 'Clips', icon: ClipboardList, description: 'Clip operations' },
] as const;

export function ToolPanel({ activeTool, onSelectTool, selectedClip, clips, currentTime, onSplit, onDelete, onApply, processing }: ToolPanelProps) {
  const hasSelection = !!selectedClip;
  const hasMultipleClips = clips.length >= 2;

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Tools</h2>
        <div className="space-y-2">
          {hasSelection && (
            <div className="grid grid-cols-3 gap-1.5">
              {clipTools.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => onSelectTool(isActive ? tool.id : tool.id)}
                    className={`flex flex-col items-center gap-1 rounded-md border p-1.5 text-center transition-colors ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-medium leading-tight">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          {hasMultipleClips && (
            <div className="grid grid-cols-2 gap-1.5">
              {multiClipTools.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => onSelectTool(isActive ? tool.id : tool.id)}
                    className={`flex flex-col items-center gap-1 rounded-md border p-1.5 text-center transition-colors ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-medium leading-tight">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          {!hasSelection && (
            <p className="text-[10px] text-zinc-400 text-center py-2">Select a clip to see tools</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTool === 'split' && hasSelection && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-semibold">Split Clip</CardTitle>
              <CardDescription className="text-[10px]">Split at the current playhead position.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                Playhead: {formatTime(currentTime)}
              </div>
              <Button onClick={() => { onSplit(); onApply(); }} size="sm" className="w-full">
                <Split className="mr-1.5 h-3.5 w-3.5" />
                Split
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTool === 'trim' && hasSelection && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-semibold">Trim</CardTitle>
              <CardDescription className="text-[10px]">Drag clip edges on the timeline to trim.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-zinc-500">Start</Label>
                  <p className="text-xs font-mono text-zinc-900 dark:text-zinc-50">{formatTime(selectedClip.start)}</p>
                </div>
                <div>
                  <Label className="text-[10px] text-zinc-500">End</Label>
                  <p className="text-xs font-mono text-zinc-900 dark:text-zinc-50">{formatTime(selectedClip.end)}</p>
                </div>
              </div>
              <Button onClick={onDelete} variant="destructive" size="sm" className="w-full">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTool === 'speed' && hasSelection && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-semibold">Speed</CardTitle>
              <CardDescription className="text-[10px]">Adjust playback speed.</CardDescription>
            </CardHeader>
            <CardContent>
              <SpeedSelector />
            </CardContent>
          </Card>
        )}

        {activeTool === 'transform' && hasSelection && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-semibold">Transform</CardTitle>
              <CardDescription className="text-[10px]">Scale, rotate, or crop.</CardDescription>
            </CardHeader>
            <CardContent>
              <TransformControls />
            </CardContent>
          </Card>
        )}

        {activeTool === 'overlay' && hasSelection && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-semibold">Overlay</CardTitle>
              <CardDescription className="text-[10px]">Add text or watermark.</CardDescription>
            </CardHeader>
            <CardContent>
              <OverlayControls />
            </CardContent>
          </Card>
        )}

        {activeTool === 'freeze' && hasSelection && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-semibold">Freeze Frame</CardTitle>
              <CardDescription className="text-[10px]">Create a freeze frame at the playhead.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label className="text-[10px] text-zinc-500">Duration (seconds)</Label>
                <Input type="number" step="0.1" placeholder="2" className="text-xs mt-1" />
              </div>
              <Button onClick={onApply} disabled={processing} size="sm" className="w-full">
                {processing && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Apply Freeze
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTool === 'merge' && hasMultipleClips && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-semibold">Merge Clips</CardTitle>
              <CardDescription className="text-[10px]">Merge selected clips into one.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {clips.length} clips selected
              </div>
              <Button onClick={onApply} disabled={processing} size="sm" className="w-full">
                {processing && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Merge
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTool === 'clips' && hasSelection && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-semibold">Clip Operations</CardTitle>
              <CardDescription className="text-[10px]">Keep, delete, reorder, or append.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ClipOperations selectedClipId={selectedClip.id} onDelete={onDelete} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SpeedSelector() {
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] text-zinc-500">Speed</Label>
      <div className="grid grid-cols-4 gap-1.5">
        {speeds.map((speed) => (
          <Button
            key={speed}
            variant="outline"
            size="sm"
            className="text-xs h-7"
          >
            {speed}x
          </Button>
        ))}
      </div>
    </div>
  );
}

function TransformControls() {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-[10px] text-zinc-500">Operation</Label>
        <Select defaultValue="scale">
          <SelectTrigger className="text-xs h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scale">Scale</SelectItem>
            <SelectItem value="rotate">Rotate</SelectItem>
            <SelectItem value="crop">Crop</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-zinc-500">Width</Label>
          <Input type="number" placeholder="1280" className="text-xs h-7" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-zinc-500">Height</Label>
          <Input type="number" placeholder="720" className="text-xs h-7" />
        </div>
      </div>
    </div>
  );
}

function OverlayControls() {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-[10px] text-zinc-500">Type</Label>
        <Select defaultValue="text">
          <SelectTrigger className="text-xs h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="watermark">Watermark</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] text-zinc-500">Text</Label>
        <Input placeholder="Live Broadcast" className="text-xs h-7" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-zinc-500">X</Label>
          <Input type="number" value={40} className="text-xs h-7" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-zinc-500">Y</Label>
          <Input type="number" value={40} className="text-xs h-7" />
        </div>
      </div>
    </div>
  );
}

function ClipOperations({ onDelete }: { selectedClipId: string; onDelete: () => void }) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-[10px] text-zinc-500">Operation</Label>
        <Select defaultValue="keep">
          <SelectTrigger className="text-xs h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="keep">Keep Clips</SelectItem>
            <SelectItem value="delete">Delete Clips</SelectItem>
            <SelectItem value="reorder">Reorder</SelectItem>
            <SelectItem value="append">Append</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onDelete} variant="destructive" size="sm" className="w-full">
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
