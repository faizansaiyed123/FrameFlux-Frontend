export interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface MessageResponse {
  detail: string;
}

export interface Project {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
}

export interface Media {
  id: string;
  user_id: string | null;
  original_filename: string;
  stored_filename: string;
  media_type: string;
  mime_type: string;
  file_size: number;
  project_id: string | null;
  processing_status: string;
  processed_filename: string | null;
  processing_error: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  video_codec: string | null;
  audio_codec: string | null;
  fps: string | null;
  created_at: string;
}

export interface MediaConvertRequest {
  format: string;
  width?: number;
  height?: number;
  fps?: number;
  video_bitrate?: string;
  audio_bitrate?: string;
  video_codec?: string;
  audio_codec?: string;
  aspect_ratio?: string;
  quality?: number;
  resolution?: string;
}

export interface MediaEditRequest {
  operation: 'trim' | 'cut' | 'extract';
  start: number;
  end: number;
}

export interface ClipInterval {
  start: number;
  end: number;
}

export interface MediaClipsRequest {
  clips: ClipInterval[];
}

export interface MediaSplitRequest {
  split_points: number[];
}

export interface MediaTransformRequest {
  operation: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  angle?: number;
  speed?: number;
}

export interface MediaFreezeFrameRequest {
  timestamp: number;
  duration: number;
}

export interface OverlayItem {
  operation: 'text' | 'image' | 'watermark';
  text?: string;
  image_filename?: string;
  x: number;
  y: number;
  font_size: number;
  opacity: number;
}

export interface MediaOverlayRequest {
  operation?: string;
  text?: string;
  image_filename?: string;
  x: number;
  y: number;
  font_size: number;
  opacity: number;
  overlays?: OverlayItem[];
}

export interface MediaMergeRequest {
  media_ids: string[];
}

export interface ResumableInitRequest {
  original_filename: string;
  total_size: number;
  chunk_size?: number;
}

export interface ResumableInitResponse {
  upload_id: string;
}

export interface ChunkUploadResponse {
  detail: string;
}

export interface ActionResponse {
  detail: string;
}

export interface MediaProcessingStatusResponse {
  media_id: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string | null;
  job_id: string | null;
  processed_filename: string | null;
  error: string | null;
}

export interface JobStatusResponse {
  job_id: string;
  status: string;
  progress: number;
  stage: string;
  result: unknown;
  error: string | null;
}

export interface ProcessProjectResponse {
  project_id: string;
  status: string;
  jobs: { media_id: string; job_id: string }[];
}

export interface ProjectProcessingStatusResponse {
  project_id: string;
  status: 'empty' | 'queued' | 'processing' | 'completed' | 'failed';
  total: number;
  completed: number;
  processing: number;
  queued: number;
  failed: number;
}

export interface RecentProjectItem {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  media_count: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardOverviewResponse {
  total_projects: number;
  total_media: number;
  media_by_type: Record<string, number>;
  processing_status_counts: Record<string, number>;
  total_storage_used_bytes: number;
  recent_projects: RecentProjectItem[];
  recent_media: Media[];
  active_jobs_count: number;
}