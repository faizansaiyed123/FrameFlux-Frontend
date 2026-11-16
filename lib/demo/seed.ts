
import type {
  DashboardOverviewResponse,
  Media,
  NotificationResponse,
  PresetResponse,
  Project,
  ProjectFolder,
  ProjectHistoryEntry,
  User,
  Workflow,
} from '@/types/api';

export type DemoMedia = Media & {
  folder: string | null;
  tags: string[] | null;
};

export type DemoJob = {
  job_id: string;
  media_id: string | null;
  project_id: string | null;
  operation: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  result: unknown;
  error: string | null;
  started_at: number;
  created_at: string;
};

export type DemoResumable = {
  upload_id: string;
  filename: string;
  total_size: number;
  uploaded_size: number;
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  progress: number;
};

export type DemoShare = {
  id: string;
  media_id: string;
  token: string;
  has_password: boolean;
  expires_at: string | null;
  is_active: boolean;
  allow_download: boolean;
  view_count: number;
  allowed_domains: string | null;
  created_at: string;
};

export interface DemoState {
  version: number;
  user: User;
  projects: Project[];
  media: DemoMedia[];
  jobs: DemoJob[];
  folders: Record<string, ProjectFolder[]>;
  workflows: Record<string, Workflow[]>;
  history: Record<string, ProjectHistoryEntry[]>;
  notifications: NotificationResponse[];
  presets: PresetResponse[];
  favorites: string[];
  resumables: DemoResumable[];
  shares: DemoShare[];
  preferences: Record<string, string>;
  quickActions: {
    video: { id: string; label: string; icon: string }[];
    audio: { id: string; label: string; icon: string }[];
    image: { id: string; label: string; icon: string }[];
  };
  last_reset_at: string;
}

const iso = (hoursAgo: number) =>
  new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

const user: User = {
  id: 'demo-user-0001',
  email: 'demo@frameflux.app',
  full_name: 'Demo Editor',
  is_active: true,
  created_at: iso(24 * 120),
  updated_at: iso(2),
};

const projects: Project[] = [
  {
    id: 'demo-project-001',
    user_id: user.id,
    name: 'Product Launch',
    description: 'Launch assets, trailers, and social cutdowns.',
    created_at: iso(24 * 18),
    updated_at: iso(3),
  },
  {
    id: 'demo-project-002',
    user_id: user.id,
    name: 'Brand Refresh',
    description: 'Brand video, interviews, and campaign source footage.',
    created_at: iso(24 * 11),
    updated_at: iso(8),
  },
  {
    id: 'demo-project-003',
    user_id: user.id,
    name: 'Creator Shorts',
    description: 'Fast-turn social clips and vertical exports.',
    created_at: iso(24 * 5),
    updated_at: iso(1),
  },
];

const media = [
  {
    id: 'demo-media-001',
    user_id: user.id,
    original_filename: 'product-launch-master.mp4',
    stored_filename: 'product-launch-master-demo.mp4',
    media_type: 'video',
    mime_type: 'video/mp4',
    file_size: 148_400_000,
    project_id: projects[0].id,
    folder: 'Masters',
    tags: ['launch', 'master', 'hero'],
    processing_status: 'completed',
    processed_filename: 'product-launch-master-demo.mp4',
    processing_error: null,
    duration: 94.4,
    width: 3840,
    height: 2160,
    video_codec: 'h264',
    audio_codec: 'aac',
    fps: '29.97',
    created_at: iso(4),
  },
  {
    id: 'demo-media-002',
    user_id: user.id,
    original_filename: 'product-launch-vertical.mp4',
    stored_filename: 'product-launch-vertical-demo.mp4',
    media_type: 'video',
    mime_type: 'video/mp4',
    file_size: 58_400_000,
    project_id: projects[0].id,
    folder: 'Social',
    tags: ['launch', 'vertical', 'social'],
    processing_status: 'processing',
    processed_filename: null,
    processing_error: null,
    duration: 27.8,
    width: 1080,
    height: 1920,
    video_codec: 'h264',
    audio_codec: 'aac',
    fps: '30',
    created_at: iso(7),
  },
  {
    id: 'demo-media-003',
    user_id: user.id,
    original_filename: 'founder-interview.wav',
    stored_filename: 'founder-interview-demo.wav',
    media_type: 'audio',
    mime_type: 'audio/wav',
    file_size: 38_200_000,
    project_id: projects[1].id,
    folder: 'Interviews',
    tags: ['interview', 'founder', 'audio'],
    processing_status: 'completed',
    processed_filename: 'founder-interview-demo.wav',
    processing_error: null,
    duration: 612.2,
    width: null,
    height: null,
    video_codec: null,
    audio_codec: 'pcm_s16le',
    fps: null,
    created_at: iso(10),
  },
  {
    id: 'demo-media-004',
    user_id: user.id,
    original_filename: 'brand-film.mov',
    stored_filename: 'brand-film-demo.mov',
    media_type: 'video',
    mime_type: 'video/quicktime',
    file_size: 312_800_000,
    project_id: projects[1].id,
    folder: 'Masters',
    tags: ['brand', 'film'],
    processing_status: 'queued',
    processed_filename: null,
    processing_error: null,
    duration: 156.7,
    width: 3840,
    height: 2160,
    video_codec: 'prores',
    audio_codec: 'pcm_s24le',
    fps: '24',
    created_at: iso(14),
  },
  {
    id: 'demo-media-005',
    user_id: user.id,
    original_filename: 'creator-hook-01.mp4',
    stored_filename: 'creator-hook-01-demo.mp4',
    media_type: 'video',
    mime_type: 'video/mp4',
    file_size: 22_900_000,
    project_id: projects[2].id,
    folder: 'Hooks',
    tags: ['short', 'hook', 'creator'],
    processing_status: 'completed',
    processed_filename: 'creator-hook-01-demo.mp4',
    processing_error: null,
    duration: 14.2,
    width: 1080,
    height: 1920,
    video_codec: 'h264',
    audio_codec: 'aac',
    fps: '30',
    created_at: iso(20),
  },
  {
    id: 'demo-media-006',
    user_id: user.id,
    original_filename: 'creator-hook-02.mp4',
    stored_filename: 'creator-hook-02-demo.mp4',
    media_type: 'video',
    mime_type: 'video/mp4',
    file_size: 24_100_000,
    project_id: projects[2].id,
    folder: 'Hooks',
    tags: ['short', 'hook', 'creator'],
    processing_status: 'completed',
    processed_filename: 'creator-hook-02-demo.mp4',
    processing_error: null,
    duration: 16.6,
    width: 1080,
    height: 1920,
    video_codec: 'h264',
    audio_codec: 'aac',
    fps: '30',
    created_at: iso(27),
  },
  {
    id: 'demo-media-007',
    user_id: user.id,
    original_filename: 'campaign-thumbnail.png',
    stored_filename: 'campaign-thumbnail-demo.png',
    media_type: 'image',
    mime_type: 'image/png',
    file_size: 4_200_000,
    project_id: projects[1].id,
    folder: 'Brand',
    tags: ['thumbnail', 'campaign'],
    processing_status: 'completed',
    processed_filename: 'campaign-thumbnail-demo.png',
    processing_error: null,
    duration: null,
    width: 1920,
    height: 1080,
    video_codec: null,
    audio_codec: null,
    fps: null,
    created_at: iso(32),
  },
  {
    id: 'demo-media-008',
    user_id: user.id,
    original_filename: 'social-teaser.webm',
    stored_filename: 'social-teaser-demo.webm',
    media_type: 'video',
    mime_type: 'video/webm',
    file_size: 31_400_000,
    project_id: null,
    folder: 'Inbox',
    tags: ['teaser', 'webm'],
    processing_status: 'failed',
    processed_filename: null,
    processing_error: 'Demo processing failure: unsupported audio track.',
    duration: 38.1,
    width: 1920,
    height: 1080,
    video_codec: 'vp9',
    audio_codec: 'opus',
    fps: '30',
    created_at: iso(44),
  },
] satisfies DemoMedia[];

const jobs: DemoJob[] = [
  {
    job_id: 'demo-job-001',
    media_id: 'demo-media-002',
    project_id: null,
    operation: 'convert',
    status: 'processing',
    progress: 68,
    stage: 'Encoding',
    result: null,
    error: null,
    started_at: Date.now() - 2_100,
    created_at: iso(0.6),
  },
  {
    job_id: 'demo-job-002',
    media_id: 'demo-media-004',
    project_id: null,
    operation: 'process',
    status: 'queued',
    progress: 0,
    stage: 'Queued',
    result: null,
    error: null,
    started_at: Date.now() - 300,
    created_at: iso(0.9),
  },
];

export function createDemoState(): DemoState {
  return {
    version: 2,
    user: structuredClone(user),
    projects: structuredClone(projects),
    media: structuredClone(media),
    jobs: structuredClone(jobs),
    folders: {
      [projects[0].id]: [
        { id: 'folder-001', name: 'Masters', parent_id: null },
        { id: 'folder-002', name: 'Social', parent_id: null },
      ],
      [projects[1].id]: [
        { id: 'folder-003', name: 'Interviews', parent_id: null },
        { id: 'folder-004', name: 'Brand', parent_id: null },
      ],
      [projects[2].id]: [
        { id: 'folder-005', name: 'Hooks', parent_id: null },
      ],
    },
    workflows: {
      [projects[0].id]: [
        {
          id: 'workflow-001',
          user_id: user.id,
          name: 'Launch social pack',
          description: 'Create social-ready exports from the launch master.',
          is_builtin: true,
          operations: [
            { type: 'trim' },
            { type: 'convert' },
            { type: 'thumbnail' },
          ],
          created_at: iso(24 * 8),
          updated_at: iso(24 * 8),
        },
      ],
      [projects[1].id]: [],
      [projects[2].id]: [],
    },
    history: {
      [projects[0].id]: [
        {
          id: 'history-001',
          operation: 'convert',
          status: 'completed',
          created_at: iso(5),
        },
        {
          id: 'history-002',
          operation: 'thumbnail',
          status: 'completed',
          created_at: iso(19),
        },
      ],
      [projects[1].id]: [
        {
          id: 'history-003',
          operation: 'upload',
          status: 'completed',
          created_at: iso(10),
        },
      ],
      [projects[2].id]: [],
    },
    notifications: [
      {
        id: 'notification-001',
        event: 'processing.completed',
        message: 'product-launch-master.mp4 finished processing.',
        is_read: false,
        created_at: iso(2),
      },
      {
        id: 'notification-002',
        event: 'processing.started',
        message: 'creator-hook-02.mp4 is ready for editing.',
        is_read: true,
        created_at: iso(7),
      },
    ],
    presets: [
      {
        id: 'preset-001',
        user_id: null,
        name: 'Social 1080x1920',
        description: 'Vertical social export preset.',
        is_builtin: true,
        settings: { format: 'mp4', resolution: '1080p', aspect_ratio: '9:16' },
        created_at: iso(24 * 20),
        updated_at: iso(24 * 20),
      },
      {
        id: 'preset-002',
        user_id: null,
        name: 'Web 1080p',
        description: 'Balanced web delivery preset.',
        is_builtin: true,
        settings: { format: 'webm', resolution: '1080p', quality: 30 },
        created_at: iso(24 * 20),
        updated_at: iso(24 * 20),
      },
    ],
    favorites: ['demo-media-001', 'demo-media-005'],
    resumables: [],
    shares: [],
    preferences: {
      theme: 'dark',
      playback_quality: 'auto',
      compact_mode: 'false',
    },
    quickActions: {
      video: [
        { id: 'compress', label: 'Compress', icon: 'minimize-2' },
        { id: 'convert', label: 'Convert', icon: 'repeat-2' },
        { id: 'thumbnail', label: 'Thumbnail', icon: 'image' },
      ],
      audio: [
        { id: 'extract-audio', label: 'Extract audio', icon: 'audio-lines' },
        { id: 'convert-audio', label: 'Convert audio', icon: 'refresh-cw' },
      ],
      image: [
        { id: 'resize', label: 'Resize', icon: 'maximize-2' },
        { id: 'thumbnail', label: 'Preview', icon: 'image' },
      ],
    },
    last_reset_at: new Date().toISOString(),
  };
}
