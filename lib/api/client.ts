const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('access_token', token);
      } else {
        localStorage.removeItem('access_token');
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Auth
  async signup(data: { email: string; password: string; full_name?: string }) {
    return this.request<{ access_token: string; token_type: string; expires_in: number }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }) {
    return this.request<{ access_token: string; token_type: string; expires_in: number }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout() {
    return this.request<{ detail: string }>('/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this.request<{
      id: string;
      email: string;
      full_name: string | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>('/auth/me');
  }

  async forgotPassword(email: string) {
    return this.request<{ detail: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<{ detail: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ detail: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  // Projects
  async listProjects() {
    return this.request<{
      id: string;
      user_id: string | null;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
    }[]>('/projects');
  }

  async createProject(data: { name: string; description?: string }) {
    return this.request<{
      id: string;
      user_id: string | null;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
    }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProject(id: string) {
    return this.request<{
      id: string;
      user_id: string | null;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
    }>(`/projects/${id}`);
  }

  async updateProject(id: string, data: { name?: string; description?: string }) {
    return this.request<{
      id: string;
      user_id: string | null;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
    }>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request<void>(`/projects/${id}`, { method: 'DELETE' });
  }

  async listProjectMedia(projectId: string) {
    return this.request<{
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
    }[]>(`/projects/${projectId}/media`);
  }

  async processProject(projectId: string) {
    return this.request<{
      project_id: string;
      status: string;
      jobs: { media_id: string; job_id: string }[];
    }>(`/projects/${projectId}/process`, { method: 'POST' });
  }

  async getProjectStatus(projectId: string) {
    return this.request<{
      project_id: string;
      status: 'empty' | 'queued' | 'processing' | 'completed' | 'failed';
      total: number;
      completed: number;
      processing: number;
      queued: number;
      failed: number;
    }>(`/projects/${projectId}/status`);
  }

  // Dashboard
  async getDashboardOverview() {
    return this.request<{
      total_projects: number;
      total_media: number;
      media_by_type: Record<string, number>;
      processing_status_counts: Record<string, number>;
      total_storage_used_bytes: number;
      recent_projects: {
        id: string;
        user_id: string | null;
        name: string;
        description: string | null;
        media_count: number;
        created_at: string;
        updated_at: string;
      }[];
      recent_media: {
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
      }[];
      active_jobs_count: number;
    }>('/dashboard/overview');
  }

  // Media
  async uploadMedia(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{
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
    }>('/media/upload', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  async listMedia() {
    return this.request<{
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
    }[]>('/media');
  }

  async getMedia(id: string) {
    return this.request<{
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
    }>(`/media/${id}`);
  }

  async getMediaFile(id: string) {
    const response = await fetch(`${this.baseUrl}/media/${id}/file`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to fetch media file');
    return response.blob();
  }

  async getProcessedMedia(id: string) {
    const response = await fetch(`${this.baseUrl}/media/${id}/processed`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to fetch processed media');
    return response.blob();
  }

  async deleteMedia(id: string) {
    return this.request<void>(`/media/${id}`, { method: 'DELETE' });
  }

  async getMediaStatus(id: string) {
    return this.request<{
      media_id: string;
      status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
      progress: number;
      stage: string | null;
      job_id: string | null;
      processed_filename: string | null;
      error: string | null;
    }>(`/media/${id}/status`);
  }

  async processMedia(id: string) {
    return this.request<{
      media_id: string;
      status: string;
      job_id: string;
    }>(`/media/${id}/process`, { method: 'POST' });
  }

  async convertMedia(id: string, data: {
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
  }) {
    return this.request<{
      media_id: string;
      status: string;
      job_id: string;
      output_filename: string;
    }>(`/media/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async editMedia(id: string, data: { operation: 'trim' | 'cut' | 'extract'; start: number; end: number }) {
    return this.request<{
      media_id: string;
      status: string;
      operation: string;
      job_id: string;
      output_filename: string;
    }>(`/media/${id}/edit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async mergeMedia(id: string, mediaIds: string[]) {
    return this.request<{
      media_id: string;
      status: string;
      operation: string;
      job_id: string;
      output_filename: string;
    }>(`/media/${id}/merge`, {
      method: 'POST',
      body: JSON.stringify({ media_ids: mediaIds }),
    });
  }

  async transformMedia(id: string, data: {
    operation: string;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    angle?: number;
    speed?: number;
  }) {
    return this.request<{
      media_id: string;
      status: string;
      operation: string;
      job_id: string;
      output_filename: string;
    }>(`/media/${id}/transform`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async freezeFrame(id: string, timestamp: number, duration: number = 1) {
    return this.request<{
      media_id: string;
      status: string;
      operation: string;
      job_id: string;
      output_filename: string;
    }>(`/media/${id}/freeze`, {
      method: 'POST',
      body: JSON.stringify({ timestamp, duration }),
    });
  }

  async overlayMedia(id: string, data: {
    operation?: string;
    text?: string;
    image_filename?: string;
    x?: number;
    y?: number;
    font_size?: number;
    opacity?: number;
    overlays?: {
      operation: 'text' | 'image' | 'watermark';
      text?: string;
      image_filename?: string;
      x: number;
      y: number;
      font_size: number;
      opacity: number;
    }[];
  }) {
    return this.request<{
      media_id: string;
      status: string;
      operation: string;
      job_id: string;
      output_filename: string;
    }>(`/media/${id}/overlay`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async splitMedia(id: string, splitPoints: number[]) {
    return this.request<{
      media_id: string;
      status: string;
      operation: string;
      job_id: string;
      output_prefix: string;
    }>(`/media/${id}/split`, {
      method: 'POST',
      body: JSON.stringify({ split_points: splitPoints }),
    });
  }

  async keepClips(id: string, clips: { start: number; end: number }[]) {
    return this.request<{
      media_id: string;
      status: string;
      operation: string;
      job_id: string;
      output_filename: string;
    }>(`/media/${id}/clips/keep`, {
      method: 'POST',
      body: JSON.stringify({ clips }),
    });
  }

  async deleteClips(id: string, clips: { start: number; end: number }[]) {
    return this.request<{
      media_id: string;
      status: string;
      operation: string;
      job_id: string;
      output_filename: string;
    }>(`/media/${id}/clips/delete`, {
      method: 'POST',
      body: JSON.stringify({ clips }),
    });
  }

  async reorderClips(id: string, mediaIds: string[]) {
    return this.request<{
      media_id: string;
      status: string;
      operation: string;
      job_id: string;
      output_filename: string;
    }>(`/media/${id}/clips/reorder`, {
      method: 'POST',
      body: JSON.stringify({ media_ids: mediaIds }),
    });
  }

  async appendClips(id: string, mediaIds: string[]) {
    return this.request<{
      media_id: string;
      status: string;
      operation: string;
      job_id: string;
      output_filename: string;
    }>(`/media/${id}/clips/append`, {
      method: 'POST',
      body: JSON.stringify({ media_ids: mediaIds }),
    });
  }

  async attachMediaToProject(mediaId: string, projectId: string) {
    return this.request<{
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
    }>(`/media/${mediaId}/project/${projectId}`, { method: 'PATCH' });
  }

  // Resumable upload
  async initResumableUpload(data: { original_filename: string; total_size: number; chunk_size?: number }) {
    return this.request<{ upload_id: string }>('/media/resumable/init', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadChunk(uploadId: string, index: number, chunk: Blob) {
    const formData = new FormData();
    formData.append('file', chunk);
    return this.request<{ detail: string }>(`/media/resumable/${uploadId}/chunk/${index}`, {
      method: 'POST',
      headers: {},
      body: formData,
    });
  }

  async pauseResumableUpload(uploadId: string) {
    return this.request<{ detail: string }>(`/media/resumable/${uploadId}/pause`, { method: 'POST' });
  }

  async resumeResumableUpload(uploadId: string) {
    return this.request<{ detail: string }>(`/media/resumable/${uploadId}/resume`, { method: 'POST' });
  }

  async retryChunk(uploadId: string, index: number, chunk: Blob) {
    const formData = new FormData();
    formData.append('file', chunk);
    return this.request<{ detail: string }>(`/media/resumable/${uploadId}/retry/${index}`, {
      method: 'POST',
      headers: {},
      body: formData,
    });
  }

  async cancelResumableUpload(uploadId: string) {
    return this.request<{ detail: string }>(`/media/resumable/${uploadId}`, { method: 'DELETE' });
  }

  async finalizeResumableUpload(uploadId: string) {
    return this.request<{
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
    }>(`/media/resumable/${uploadId}/finalize`, { method: 'POST' });
  }

  // Jobs
  async listJobs() {
    return this.request<{
      job_id: string;
      status: string;
      progress: number;
      stage: string;
      result: unknown;
      error: string | null;
      media_id: string | null;
      created_at: string | null;
      started_at: string | null;
      finished_at: string | null;
    }[]>('/jobs');
  }

  async getJobStatus(jobId: string) {
    return this.request<{
      job_id: string;
      status: string;
      progress: number;
      stage: string;
      result: unknown;
      error: string | null;
    }>(`/jobs/${jobId}`);
  }
}

export const api = new ApiClient();