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
      ...options.headers,
    };

    if (!(options.body instanceof FormData)) {
      (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
      mode: 'cors',
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

  async updateProfile(data: { full_name?: string; avatar_url?: string; preferences?: string }) {
    return this.request<{
      id: string;
      email: string;
      full_name: string | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
      avatar_url: string | null;
      preferences: string | null;
    }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
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

  async listProjectFolders(projectId: string) {
    return this.request<{
      id: string;
      name: string;
      parent_id: string | null;
    }[]>(`/projects/${projectId}/folders`);
  }

  async createProjectFolder(projectId: string, name: string, parentId?: string) {
    return this.request<{ id: string; name: string; parent_id: string | null }>(
      `/projects/${projectId}/folders?name=${encodeURIComponent(name)}${parentId ? `&parent_id=${parentId}` : ''}`,
      { method: 'POST' }
    );
  }

  async listProjectWorkflows(projectId: string) {
    return this.request<{ id: string; name: string }[]>(`/projects/${projectId}/workflows`);
  }

  async listProjectHistory(projectId: string) {
    return this.request<{
      id: string;
      operation: string;
      status: string;
      created_at: string;
    }[]>(`/projects/${projectId}/history`);
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

  async getDashboardRecentProcessing(limit?: number) {
    return this.request<any[]>(`/dashboard/recent-processing${limit ? `?limit=${limit}` : ''}`);
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
      headers: {},
      body: formData,
    });
  }

  async uploadMultipleMedia(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
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
    }[]>('/media/upload-multiple', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  }

  async listMedia(params?: {
    search?: string;
    media_type?: string;
    folder?: string;
    tag?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.media_type) query.set('media_type', params.media_type);
    if (params?.folder) query.set('folder', params.folder);
    if (params?.tag) query.set('tag', params.tag);
    const qs = query.toString();
    return this.request<{
      id: string;
      user_id: string | null;
      original_filename: string;
      stored_filename: string;
      media_type: string;
      mime_type: string;
      file_size: number;
      project_id: string | null;
      folder: string | null;
      tags: string[] | null;
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
    }[]>(`/media${qs ? `?${qs}` : ''}`);
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
      folder: string | null;
      tags: string[] | null;
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
    const response = await fetch(`${this.baseUrl}/media/${id}/download?download_type=original`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to fetch media file');
    return response.blob();
  }

  async getProcessedMedia(id: string, downloadType: string = 'processed') {
    const response = await fetch(`${this.baseUrl}/media/${id}/download?download_type=${encodeURIComponent(downloadType)}`, {
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

  async getMediaProgress(id: string) {
    return this.request<{
      media_id: string;
      status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
      progress: number;
      stage: string | null;
      job_id: string | null;
      processed_filename: string | null;
      error: string | null;
    }>(`/media/${id}/progress`);
  }

  async getUploadProgress(uploadId: string) {
    return this.request<{
      upload_id: string;
      user_id: string;
      filename: string;
      status: string;
      progress: number;
      total_size?: string;
      uploaded_size?: string;
      error?: string;
    }>(`/media/uploads/${uploadId}/progress`);
  }

  async processMedia(id: string) {
    return this.request<{
      media_id: string;
      status: string;
      job_id: string;
    }>(`/media/${id}/process`, { method: 'POST' });
  }

  async compressMedia(id: string, data: {
    format?: string;
    width?: number;
    height?: number;
    fps?: number;
    video_bitrate?: string;
    audio_bitrate?: string;
    video_codec?: string;
    audio_codec?: string;
    aspect_ratio?: string;
    compression_preset?: string;
    quality?: number;
    resolution?: string;
  }) {
    return this.request<{
      media_id: string;
      status: string;
      job_id: string;
      output_filename: string;
    }>(`/media/${id}/compress`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
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

  async batchDownload(mediaIds: string[]) {
    return this.request<{ jobs: { media_id: string; original_filename: string; file_size: number }[]; total: number }>(
      '/media/batch-download',
      {
        method: 'POST',
        body: JSON.stringify({ media_ids: mediaIds }),
      }
    );
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

  // Video Control
  async adjustVideo(id: string, data: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    gamma?: number;
    hue?: number;
  }) {
    return this.request<{
      output_filename: string;
      operation: string;
      media_id: string;
    }>(`/video/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async filterVideo(id: string, data: { operation: string; intensity?: number }) {
    return this.request<{
      output_filename: string;
      operation: string;
      media_id: string;
    }>(`/video/${id}/filter`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async fadeVideo(id: string, data: { fade_type: string; duration: number; start_time?: number }) {
    return this.request<{
      output_filename: string;
      operation: string;
      media_id: string;
    }>(`/video/${id}/fade`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async reverseVideo(id: string, data: { output_format?: string } = {}) {
    return this.request<{
      output_filename: string;
      operation: string;
      media_id: string;
    }>(`/video/${id}/reverse`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Audio Processing
  async extractAudio(mediaId: string, data: {
    format?: string;
    bitrate?: string;
    sample_rate?: number;
    start?: number;
    end?: number;
    channels?: number;
    quality_preset?: string;
  }) {
    const query = new URLSearchParams();
    if (data.format) query.set('format', data.format);
    if (data.bitrate) query.set('bitrate', data.bitrate);
    if (data.sample_rate) query.set('sample_rate', String(data.sample_rate));
    if (data.start !== undefined) query.set('start', String(data.start));
    if (data.end !== undefined) query.set('end', String(data.end));
    if (data.channels) query.set('channels', String(data.channels));
    if (data.quality_preset) query.set('quality_preset', data.quality_preset);
    const qs = query.toString();
    const response = await fetch(`${this.baseUrl}/audio/${mediaId}/extract${qs ? `?${qs}` : ''}`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to extract audio');
    return response.blob();
  }

  async adjustVolume(mediaId: string, volume: number, fadeIn?: number, fadeOut?: number) {
    return this.request<{ output_filename: string }>(`/audio/${mediaId}/volume`, {
      method: 'POST',
      body: JSON.stringify({ volume, fade_in: fadeIn, fade_out: fadeOut }),
    });
  }

  async replaceAudio(mediaId: string, audioPath: string, fadeIn?: number, fadeOut?: number) {
    const query = new URLSearchParams({ audio_path: audioPath });
    if (fadeIn !== undefined) query.set('fade_in', String(fadeIn));
    if (fadeOut !== undefined) query.set('fade_out', String(fadeOut));

    return this.request<{ output_filename: string }>(`/audio/${mediaId}/replace-audio?${query.toString()}`, {
      method: 'POST',
    });
  }

  async addAudio(mediaId: string, audioPath: string, options?: {
    audioOffset?: number;
    videoDuration?: number;
    audioDuration?: number;
    fadeIn?: number;
    fadeOut?: number;
    volume?: number;
    mixVolume?: number;
    outputFormat?: 'mp4' | 'webm';
  }) {
    const data = {
      audio_path: audioPath,
      audio_offset: options?.audioOffset ?? 0,
      video_duration: options?.videoDuration,
      audio_duration: options?.audioDuration,
      fade_in: options?.fadeIn,
      fade_out: options?.fadeOut,
      volume: options?.volume ?? 1,
      mix: true,
      mix_volume: options?.mixVolume ?? 0.5,
      output_format: options?.outputFormat ?? 'mp4',
    };

    const response = await fetch(this.baseUrl + '/audio/' + mediaId + '/sync-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}),
      },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Add audio failed' }));
      throw new Error(error.detail || 'HTTP error ' + response.status);
    }

    return response.blob();
  }
  async syncAudioVideo(mediaId: string, data: {
    audio_path: string;
    audio_offset?: number;
    video_duration?: number;
    audio_duration?: number;
    fade_in?: number;
    fade_out?: number;
    volume?: number;
    mix?: boolean;
    mix_volume?: number;
    output_format?: 'mp4' | 'webm';
  }) {
    return this.request<{
      output_filename: string;
      operation: string;
      media_id: string;
    }>(`/audio/${mediaId}/sync-audio`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async convertAudio(mediaId: string, data: {
    format: string;
    bitrate?: string;
    sample_rate?: number;
    channels?: number;
    quality?: string;
  }) {
    const query = new URLSearchParams();
    if (data.format) query.set('format', data.format);
    if (data.bitrate) query.set('bitrate', data.bitrate);
    if (data.sample_rate) query.set('sample_rate', String(data.sample_rate));
    if (data.channels) query.set('channels', String(data.channels));
    if (data.quality) query.set('quality', data.quality);
    const qs = query.toString();
    const response = await fetch(`${this.baseUrl}/audio/${mediaId}/convert${qs ? `?${qs}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to convert audio');
    return response.blob();
  }

  async editAudio(mediaId: string, data: {
    operation: string;
    start?: number;
    end?: number;
    speed?: number;
    fade_in?: number;
    fade_out?: number;
    silence_duration?: number;
    target_files?: string[];
  }) {
    return this.request<{ output_filename: string }>(`/audio/${mediaId}/edit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async audioToVideo(mediaId: string, data: {
    background_image?: string;
    background_color?: string;
    title?: string;
    text?: string;
    watermark?: string;
    show_waveform?: boolean;
    visualizer_style?: string;
    resolution?: string;
    fps?: number;
    aspect_ratio?: string;
    duration?: number;
    output_format?: string;
  }) {
    const response = await fetch(`${this.baseUrl}/audio/${mediaId}/to-video`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to convert audio to video');
    return response.blob();
  }

  // Thumbnails
  async getThumbnail(mediaId: string, timestamp?: number, width?: number, height?: number, fmt?: string) {
    const query = new URLSearchParams();
    if (timestamp !== undefined) query.set('timestamp', String(timestamp));
    if (width !== undefined) query.set('width', String(width));
    if (height !== undefined) query.set('height', String(height));
    if (fmt) query.set('fmt', fmt);
    const qs = query.toString();
    const response = await fetch(`${this.baseUrl}/thumbnails/${mediaId}${qs ? `?${qs}` : ''}`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to fetch thumbnail');
    return response.blob();
  }

  async getThumbnailSet(mediaId: string, interval?: number, width?: number, fmt?: string) {
    const query = new URLSearchParams();
    if (interval !== undefined) query.set('interval', String(interval));
    if (width !== undefined) query.set('width', String(width));
    if (fmt) query.set('fmt', fmt);
    const qs = query.toString();
    return this.request<{ thumbnails: string[] }>(`/thumbnails/${mediaId}/set${qs ? `?${qs}` : ''}`);
  }

  async cropThumbnail(mediaId: string, timestamp: number, x: number, y: number, width: number, height: number) {
    return this.request<{ path: string }>(`/thumbnails/${mediaId}/crop`, {
      method: 'POST',
      body: JSON.stringify({ timestamp, x, y, width, height }),
    });
  }

  async selectThumbnail(mediaId: string, timestamp: number, width?: number) {
    return this.request<{ selected: string }>(`/thumbnails/${mediaId}/select`, {
      method: 'POST',
      body: JSON.stringify({ timestamp, width }),
    });
  }

  // Subtitles
  async burnSubtitles(mediaId: string, subtitlePath: string, data: {
    font_size?: number;
    font_color?: string;
    background_color?: string;
    position?: string;
    font?: string;
    alignment?: string;
  }) {
    const query = new URLSearchParams();
    query.set('subtitle_path', subtitlePath);
    if (data.font_size) query.set('font_size', String(data.font_size));
    if (data.font_color) query.set('font_color', data.font_color);
    if (data.background_color) query.set('background_color', data.background_color);
    if (data.position) query.set('position', data.position);
    if (data.font) query.set('font', data.font);
    if (data.alignment) query.set('alignment', data.alignment);
    const qs = query.toString();
    const response = await fetch(`${this.baseUrl}/subtitles/${mediaId}/burn?${qs}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to burn subtitles');
    return response.json();
  }

  async uploadSubtitleFile(formData: FormData) {
    const response = await fetch(`${this.baseUrl}/subtitles/upload`, {
      method: 'POST',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload subtitle file');
    return response.json();
  }

  async muxSubtitles(mediaId: string, subtitlePath: string, data: {
    language?: string;
    is_default?: boolean;
    is_forced?: boolean;
  }) {
    const query = new URLSearchParams();
    query.set('subtitle_path', subtitlePath);
    if (data.language) query.set('language', data.language);
    if (data.is_default !== undefined) query.set('is_default', String(data.is_default));
    if (data.is_forced !== undefined) query.set('is_forced', String(data.is_forced));
    const qs = query.toString();
    const response = await fetch(`${this.baseUrl}/subtitles/${mediaId}/mux?${qs}`, {
      method: 'POST',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to mux subtitles');
    return response.blob();
  }

  async listSubtitleTracks(mediaId: string) {
    return this.request<{
      id: number | string;
      codec: string | null;
      language: string | null;
      title: string | null;
      is_default: boolean;
      is_forced: boolean;
    }[]>(`/subtitles/${mediaId}/tracks`);
  }

  async syncSubtitles(mediaId: string, data: {
    offset_seconds?: number;
    scale?: number;
    preview?: boolean;
  }) {
    const response = await fetch(`${this.baseUrl}/subtitles/${mediaId}/sync`, {
      method: 'POST',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to sync subtitles');
    if (data.preview) {
      return response.json();
    }
    return response.blob();
  }

  // Preview
  async generateVideoPreview(mediaId: string, data: {
    duration?: number;
    start?: number;
    width?: number;
    fps?: number;
  }) {
    const query = new URLSearchParams();
    if (data.duration) query.set('duration', String(data.duration));
    if (data.start) query.set('start', String(data.start));
    if (data.width) query.set('width', String(data.width));
    if (data.fps) query.set('fps', String(data.fps));
    const qs = query.toString();
    const response = await fetch(`${this.baseUrl}/preview/${mediaId}/video${qs ? `?${qs}` : ''}`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to generate video preview');
    return response.blob();
  }

  async generateGifPreview(mediaId: string, data: {
    duration?: number;
    start?: number;
    width?: number;
    fps?: number;
    quality?: number;
  }) {
    const query = new URLSearchParams();
    if (data.duration) query.set('duration', String(data.duration));
    if (data.start) query.set('start', String(data.start));
    if (data.width) query.set('width', String(data.width));
    if (data.fps) query.set('fps', String(data.fps));
    if (data.quality) query.set('quality', String(data.quality));
    const qs = query.toString();
    const response = await fetch(`${this.baseUrl}/preview/${mediaId}/gif${qs ? `?${qs}` : ''}`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to generate GIF preview');
    return response.blob();
  }

  async generateThumbnailPreview(mediaId: string, data: {
    timestamp?: number;
    width?: number;
    height?: number;
    fmt?: string;
  }) {
    const query = new URLSearchParams();
    if (data.timestamp !== undefined) query.set('timestamp', String(data.timestamp));
    if (data.width !== undefined) query.set('width', String(data.width));
    if (data.height !== undefined) query.set('height', String(data.height));
    if (data.fmt) query.set('fmt', data.fmt);
    const qs = query.toString();
    const response = await fetch(`${this.baseUrl}/preview/${mediaId}/thumbnail${qs ? `?${qs}` : ''}`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to generate thumbnail preview');
    return response.blob();
  }

  // GIF Processing
  async generateGif(mediaId: string, data: {
    start?: number;
    end?: number;
    duration?: number;
    width?: number;
    fps?: number;
    quality?: number;
  }) {
    const query = new URLSearchParams();
    if (data.start !== undefined) query.set('start', String(data.start));
    if (data.end !== undefined) query.set('end', String(data.end));
    if (data.duration !== undefined) query.set('duration', String(data.duration));
    if (data.width !== undefined) query.set('width', String(data.width));
    if (data.fps) query.set('fps', String(data.fps));
    if (data.quality !== undefined) query.set('quality', String(data.quality));
    const qs = query.toString();
    const response = await fetch(`${this.baseUrl}/gif/${mediaId}/generate${qs ? `?${qs}` : ''}`, {
      method: 'POST',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to generate GIF');
    return response.blob();
  }

  // Media Info
  async getMediaInfo(mediaId: string) {
    return this.request<{
      file_name: string;
      file_size: number;
      duration: number | null;
      resolution: string | null;
      fps: string | null;
      video_codec: string | null;
      audio_codec: string | null;
      bitrate: string | null;
      audio_channels: number | null;
      sample_rate: number | null;
      container_format: string | null;
      audio_tracks: number | null;
      subtitle_tracks: number | null;
      available_streams: any[] | null;
      metadata: Record<string, any> | null;
      creation_metadata: Record<string, any> | null;
    }>(`/media-info/${mediaId}`);
  }

  // Batch Processing
  async batchUpload(files: string[]) {
    return this.request<{ job_id: string; total_files: number; status: string }>('/batch/upload', {
      method: 'POST',
      body: JSON.stringify({ files }),
    });
  }

  async batchProcess(mediaIds: string[], operation: string, options?: Record<string, any>) {
    return this.request<{ job_id: string; total_items: number; operation: string; status: string; results: any[] }>('/batch/process', {
      method: 'POST',
      body: JSON.stringify({ media_ids: mediaIds, operation, options }),
    });
  }

  async getBatchStatus(jobId: string) {
    return this.request<{ job_id: string; status: string; total: number; completed: number; failed: number; results: any[] }>(`/batch/${jobId}/status`);
  }

  // Presets
  async listPresets() {
    return this.request<{
      id: string;
      user_id: string | null;
      name: string;
      description: string | null;
      is_builtin: boolean;
      settings: Record<string, any>;
      created_at: string;
      updated_at: string;
    }[]>('/presets');
  }

  async createPreset(data: { name: string; description?: string; settings: Record<string, any> }) {
    return this.request<{
      id: string;
      user_id: string | null;
      name: string;
      description: string | null;
      is_builtin: boolean;
      settings: Record<string, any>;
      created_at: string;
      updated_at: string;
    }>('/presets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePreset(presetId: string, data: { name?: string; description?: string; settings?: Record<string, any> }) {
    return this.request<{
      id: string;
      user_id: string | null;
      name: string;
      description: string | null;
      is_builtin: boolean;
      settings: Record<string, any>;
      created_at: string;
      updated_at: string;
    }>(`/presets/${presetId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePreset(presetId: string) {
    return this.request<void>(`/presets/${presetId}`, { method: 'DELETE' });
  }

  // Workflows
  async listWorkflows() {
    return this.request<{
      id: string;
      user_id: string | null;
      name: string;
      description: string | null;
      is_builtin: boolean;
      operations: { type: string; params: Record<string, unknown> }[];
      created_at: string;
      updated_at: string;
    }[]>('/workflows');
  }

  async createWorkflow(data: { name: string; description?: string; operations: { type: string; params?: Record<string, unknown> }[] }) {
    return this.request<{
      id: string;
      user_id: string | null;
      name: string;
      description: string | null;
      is_builtin: boolean;
      operations: { type: string; params: Record<string, unknown> }[];
      created_at: string;
      updated_at: string;
    }>('/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWorkflow(id: string) {
    return this.request<{
      id: string;
      user_id: string | null;
      name: string;
      description: string | null;
      is_builtin: boolean;
      operations: { type: string; params: Record<string, unknown> }[];
      created_at: string;
      updated_at: string;
    }>(`/workflows/${id}`);
  }

  async updateWorkflow(id: string, data: { name?: string; description?: string; operations?: { type: string; params?: Record<string, unknown> }[] }) {
    return this.request<{
      id: string;
      user_id: string | null;
      name: string;
      description: string | null;
      is_builtin: boolean;
      operations: { type: string; params: Record<string, unknown> }[];
      created_at: string;
      updated_at: string;
    }>(`/workflows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkflow(id: string) {
    return this.request<void>(`/workflows/${id}`, { method: 'DELETE' });
  }

  async runWorkflow(id: string, mediaId: string) {
    return this.request<{
      workflow_id: string;
      media_id: string;
      operations_count: number;
      status: string;
    }>(`/workflows/${id}/run?media_id=${mediaId}`, { method: 'POST' });
  }

  // Media Versions
  async listMediaVersions(mediaId: string) {
    return this.request<{
      id: string;
      version_number: number;
      label: string;
      stored_filename: string;
      processing_status: string;
      created_at: string;
    }[]>(`/media/${mediaId}/versions`);
  }

  async getMediaVersion(mediaId: string, versionId: string) {
    return this.request<{
      id: string;
      version_number: number;
      label: string;
      stored_filename: string;
      processing_status: string;
      created_at: string;
    }>(`/media/${mediaId}/versions/${versionId}`);
  }

  async getMediaVersionFile(mediaId: string, versionId: string) {
    const response = await fetch(`${this.baseUrl}/media/${mediaId}/versions/${versionId}/download`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to fetch version file');
    return response.blob();
  }

  async deleteMediaVersion(mediaId: string, versionId: string) {
    return this.request<void>(`/media/${mediaId}/versions/${versionId}`, { method: 'DELETE' });
  }

  async restoreMediaVersion(mediaId: string, versionId: string) {
    return this.request<{
      id: string;
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
    }>(`/media/${mediaId}/versions/${versionId}/restore`, { method: 'POST' });
  }

  // Comparisons
  async compareMedia(mediaAId: string, mediaBId: string) {
    return this.request<{
      media_a_id: string;
      media_b_id: string;
      size_diff: number;
      duration_diff: number | null;
      resolution_match: boolean;
      video_codec_match: boolean;
      audio_codec_match: boolean;
      storage_saved: number;
    }>(`/comparisons/${mediaAId}/${mediaBId}`);
  }

  // Sharing
  async createShare(data: { media_id: string; password?: string; expires_in_hours?: number; allow_download?: boolean; allowed_domains?: string }) {
    return this.request<{
      id: string;
      media_id: string;
      token: string;
      password: string | null;
      expires_at: string | null;
      is_active: boolean;
      allow_download: boolean;
      view_count: number;
      allowed_domains: string | null;
      created_at: string;
    }>('/sharing', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getShare(token: string) {
    return this.request<{
      id: string;
      media_id: string;
      token: string;
      password: string | null;
      expires_at: string | null;
      is_active: boolean;
      allow_download: boolean;
      view_count: number;
      allowed_domains: string | null;
      created_at: string;
    }>(`/sharing/${token}`);
  }

  async listShares() {
    return this.request<{
      id: string;
      media_id: string;
      token: string;
      password: string | null;
      expires_at: string | null;
      is_active: boolean;
      allow_download: boolean;
      view_count: number;
      allowed_domains: string | null;
      created_at: string;
    }[]>('/sharing');
  }

  async getEmbed(token: string) {
    return this.request<{
      embed_url: string;
      embed_code: string;
      media_title: string;
    }>(`/sharing/embed/${token}`);
  }

  async deleteShare(shareId: string) {
    return this.request<void>(`/sharing/${shareId}`, { method: 'DELETE' });
  }

  async disableShare(shareId: string) {
    return this.request<{
      id: string;
      media_id: string;
      token: string;
      password: string | null;
      expires_at: string | null;
      is_active: boolean;
      allow_download: boolean;
      created_at: string;
    }>(`/sharing/${shareId}/disable`, { method: 'POST' });
  }

  // Processing History
  async listHistory() {
    return this.request<{
      id: string;
      media_id: string;
      operation: string;
      status: string;
      settings: string | null;
      error: string | null;
      started_at: string | null;
      finished_at: string | null;
      created_at: string;
    }[]>('/history');
  }

  async createHistoryEntry(mediaId: string, operation: string, status: string) {
    return this.request<{
      id: string;
      media_id: string;
      operation: string;
      status: string;
      settings: string | null;
      error: string | null;
      started_at: string | null;
      finished_at: string | null;
      created_at: string;
    }>(`/history?media_id=${mediaId}&operation=${encodeURIComponent(operation)}&status=${encodeURIComponent(status)}`, {
      method: 'POST',
    });
  }

  // Storage
  async getStorageUsage() {
    return this.request<{
      total_size: number;
      total_files: number;
      user_id: string;
    }>('/storage/usage');
  }

  async getStorageByType() {
    return this.request<{ media_type: string; total_size: number; count: number }[]>('/storage/usage/by-type');
  }

  async getStorageByFolder() {
    return this.request<{ folder: string; total_size: number; count: number }[]>('/storage/usage/by-folder');
  }

  // Search
  async searchMedia(params: {
    q?: string;
    media_type?: string;
    folder?: string;
    tag?: string;
    min_size?: number;
    max_size?: number;
    min_duration?: number;
    max_duration?: number;
    processing_status?: string;
  }) {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.media_type) query.set('media_type', params.media_type);
    if (params.folder) query.set('folder', params.folder);
    if (params.tag) query.set('tag', params.tag);
    if (params.min_size !== undefined) query.set('min_size', String(params.min_size));
    if (params.max_size !== undefined) query.set('max_size', String(params.max_size));
    if (params.min_duration !== undefined) query.set('min_duration', String(params.min_duration));
    if (params.max_duration !== undefined) query.set('max_duration', String(params.max_duration));
    if (params.processing_status) query.set('processing_status', params.processing_status);
    const qs = query.toString();
    return this.request<{
      id: string;
      original_filename: string;
      media_type: string;
      file_size: number;
      duration: number | null;
      processing_status: string;
      folder: string | null;
      tags: string | null;
      created_at: string;
    }[]>(`/search/media${qs ? `?${qs}` : ''}`);
  }

  // Notifications
  async listNotifications() {
    return this.request<{
      id: string;
      event: string;
      message: string;
      is_read: boolean;
      created_at: string;
    }[]>('/notifications');
  }

  async createNotification(data: { event: string; message: string }) {
    return this.request<{
      id: string;
      event: string;
      message: string;
      is_read: boolean;
      created_at: string;
    }>('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markNotificationRead(notificationId: string) {
    return this.request<{
      id: string;
      event: string;
      message: string;
      is_read: boolean;
      created_at: string;
    }>(`/notifications/${notificationId}/read`, { method: 'POST' });
  }

  // UI Preferences
  async listPreferences() {
    return this.request<{
      id: string;
      key: string;
      value: string;
      updated_at: string;
    }[]>('/ui/preferences');
  }

  async setPreference(key: string, value: string) {
    return this.request<{
      id: string;
      key: string;
      value: string;
      updated_at: string;
    }>(`/ui/preferences/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  // Favorites
  async listFavorites() {
    return this.request<{
      id: string;
      media_id: string;
      user_id: string | null;
      created_at: string;
    }[]>('/favorites');
  }

  async addFavorite(mediaId: string) {
    return this.request<{
      id: string;
      media_id: string;
      user_id: string | null;
      created_at: string;
    }>('/favorites', {
      method: 'POST',
      body: JSON.stringify({ media_id: mediaId }),
    });
  }

  async removeFavorite(mediaId: string) {
    return this.request<void>(`/favorites/${mediaId}`, { method: 'DELETE' });
  }

  // Quick Actions
  async getQuickActions() {
    return this.request<{
      video: { id: string; label: string; icon: string }[];
      audio: { id: string; label: string; icon: string }[];
    }>('/quick-actions');
  }

  async executeQuickAction(mediaId: string, actionId: string) {
    return this.request<{
      media_id: string;
      action_id: string;
      status: string;
    }>(`/quick-actions/${mediaId}/execute?action_id=${encodeURIComponent(actionId)}`, { method: 'POST' });
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
