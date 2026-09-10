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

const tools = [
  { id: 'select', label: 'Select', icon: () => null, description: 'Select and move clips' },
  { id: 'trim', label: 'Trim', icon: Scissors, description: 'Trim clip edges' },
  { id: 'split', label: 'Split', icon: Split, description: 'Split at playhead' },
  { id: 'speed', label: 'Speed', icon: Gauge, description: 'Adjust playback speed' },
  { id: 'overlay', label: 'Overlay', icon: Image, description: 'Add text or watermark' },
  { id: 'freeze', label: 'Freeze', icon: Snowflake, description: 'Freeze frame' },
  { id: 'transform', label: 'Transform', icon: RefreshCw, description: 'Scale, rotate, crop' },
  { id: 'merge', label: 'Merge', icon: Merge, description: 'Merge selected clips' },
  { id: 'clips', label: 'Clips', icon: ClipboardList, description: 'Keep, delete, reorder' },
] as const;

export function ToolPanel({ activeTool, onSelectTool, selectedClip, clips, currentTime, onSplit, onDelete, onApply, processing }: ToolPanelProps) {

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Tools</h2>
        <div className="grid grid-cols-3 gap-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span className="text-[10px] font-medium">{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTool === 'split' && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Split Clip</CardTitle>
              <CardDescription className="text-xs">Split the selected clip at the current playhead position.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Playhead: {formatTime(currentTime)}
              </div>
              <Button onClick={onSplit} disabled={!selectedClip} className="w-full">
                Split at Playhead
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTool === 'trim' && selectedClip && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Trim Clip</CardTitle>
              <CardDescription className="text-xs">Drag the edges of the clip on the timeline to trim.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Start</Label>
                  <Input type="text" value={formatTime(selectedClip.start)} readOnly className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End</Label>
                  <Input type="text" value={formatTime(selectedClip.end)} readOnly className="text-xs" />
                </div>
              </div>
              <Button onClick={onDelete} variant="destructive" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Clip
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTool === 'speed' && selectedClip && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Playback Speed</CardTitle>
              <CardDescription className="text-xs">Adjust the speed of the selected clip.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SpeedSelector />
            </CardContent>
          </Card>
        )}

        {activeTool === 'transform' && selectedClip && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Transform</CardTitle>
              <CardDescription className="text-xs">Scale, rotate, or crop the selected clip.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <TransformControls />
            </CardContent>
          </Card>
        )}

        {activeTool === 'overlay' && selectedClip && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Overlay</CardTitle>
              <CardDescription className="text-xs">Add text or watermark to the selected clip.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <OverlayControls />
            </CardContent>
          </Card>
        )}

        {activeTool === 'freeze' && selectedClip && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Freeze Frame</CardTitle>
              <CardDescription className="text-xs">Create a freeze frame at the current playhead.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Duration (seconds)</Label>
                <Input type="number" step="0.1" placeholder="2" className="text-xs" />
              </div>
              <Button onClick={onApply} disabled={processing} className="w-full">
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apply Freeze Frame
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTool === 'merge' && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Merge Clips</CardTitle>
              <CardDescription className="text-xs">Merge multiple selected clips into one.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                {clips.length} clip{clips.length !== 1 ? 's' : ''} available
              </div>
              <Button onClick={onApply} disabled={processing || clips.length < 2} className="w-full">
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Merge Selected
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTool === 'clips' && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Clip Operations</CardTitle>
              <CardDescription className="text-xs">Keep, delete, reorder, or append clips.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ClipOperations clips={clips} selectedClipId={selectedClip?.id || null} onDelete={onDelete} />
            </CardContent>
          </Card>
        )}

        {!activeTool && (
          <div className="text-center py-8">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Select a tool from the top to begin editing.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SpeedSelector() {
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];
  return (
    <div className="space-y-2">
      <Label className="text-xs">Speed</Label>
      <div className="grid grid-cols-4 gap-2">
        {speeds.map((speed) => (
          <Button
            key={speed}
            variant="outline"
            size="sm"
            className="text-xs"
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
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Operation</Label>
        <Select defaultValue="scale">
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scale">Scale</SelectItem>
            <SelectItem value="rotate">Rotate</SelectItem>
            <SelectItem value="crop">Crop</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Width</Label>
          <Input type="number" placeholder="1280" className="text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Height</Label>
          <Input type="number" placeholder="720" className="text-xs" />
        </div>
      </div>
    </div>
  );
}

function OverlayControls() {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Type</Label>
        <Select defaultValue="text">
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="watermark">Watermark</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Text</Label>
        <Input placeholder="Live Broadcast" className="text-xs" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">X</Label>
          <Input type="number" value={40} className="text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Y</Label>
          <Input type="number" value={40} className="text-xs" />
        </div>
      </div>
    </div>
  );
}

function ClipOperations({ selectedClipId, onDelete }: { clips: Clip[]; selectedClipId: string | null; onDelete: () => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Operation</Label>
        <Select defaultValue="keep">
          <SelectTrigger className="text-xs">
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
      <Button onClick={onDelete} variant="destructive" disabled={!selectedClipId} className="w-full">
        Delete Selected
      </Button>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
