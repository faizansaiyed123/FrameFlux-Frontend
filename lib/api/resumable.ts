import { api } from '@/lib/api/client';

export interface ResumableUploadState {
  uploadId: string | null;
  totalSize: number;
  uploadedChunks: Set<number>;
  totalChunks: number;
  status: 'idle' | 'uploading' | 'paused' | 'complete' | 'error';
  error: string | null;
}

export class ResumableUploader {
  private uploadId: string | null = null;
  private totalSize: number = 0;
  private chunkSize: number = 1024 * 1024;
  private uploadedChunks: Set<number> = new Set();
  private totalChunks: number = 0;
  private paused: boolean = false;
  private cancelled: boolean = false;
  private abortController: AbortController | null = null;
  private file: File | null = null;

  get state(): ResumableUploadState {
    return {
      uploadId: this.uploadId,
      totalSize: this.totalSize,
      uploadedChunks: new Set(this.uploadedChunks),
      totalChunks: this.totalChunks,
      status: this.cancelled ? 'error' : this.paused ? 'paused' : this.uploadedChunks.size === this.totalChunks && this.totalChunks > 0 ? 'complete' : 'idle',
      error: null,
    };
  }

  get progress(): number {
    if (this.totalChunks === 0) return 0;
    return Math.round((this.uploadedChunks.size / this.totalChunks) * 100);
  }

  async init(file: File, chunkSize?: number): Promise<string> {
    this.file = file;
    this.totalSize = file.size;
    this.chunkSize = chunkSize || 1024 * 1024;
    this.totalChunks = Math.ceil(file.size / this.chunkSize);
    this.uploadedChunks = new Set();
    this.paused = false;
    this.cancelled = false;

    const { upload_id } = await api.initResumableUpload({
      original_filename: file.name,
      total_size: file.size,
      chunk_size: this.chunkSize,
    });
    this.uploadId = upload_id;
    return upload_id;
  }

  async uploadChunk(index: number): Promise<void> {
    if (!this.uploadId || this.paused || this.cancelled) return;
    if (this.uploadedChunks.has(index)) return;

    const start = index * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.totalSize);
    const chunk = this.file!.slice(start, end);

    try {
      await api.uploadChunk(this.uploadId, index, chunk);
      this.uploadedChunks.add(index);
    } catch (err) {
      throw err;
    }
  }

  async uploadAll(onProgress?: (progress: number, uploaded: number, total: number) => void): Promise<void> {
    this.paused = false;
    this.cancelled = false;

    for (let i = 0; i < this.totalChunks; i++) {
      if (this.cancelled) {
        throw new Error('Upload cancelled');
      }
      while (this.paused) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (this.cancelled) {
          throw new Error('Upload cancelled');
        }
      }
      await this.uploadChunk(i);
      onProgress?.(this.progress, this.uploadedChunks.size, this.totalChunks);
    }
  }

  async pause(): Promise<void> {
    this.paused = true;
    if (this.uploadId) {
      await api.pauseResumableUpload(this.uploadId).catch(() => {});
    }
  }

  async resume(): Promise<void> {
    this.paused = false;
    if (this.uploadId) {
      await api.resumeResumableUpload(this.uploadId).catch(() => {});
    }
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
    this.paused = false;
    if (this.uploadId) {
      await api.cancelResumableUpload(this.uploadId).catch(() => {});
    }
    this.uploadId = null;
    this.uploadedChunks = new Set();
  }

  async retryChunk(index: number): Promise<void> {
    this.uploadedChunks.delete(index);
    await this.uploadChunk(index);
  }

  async finalize(): Promise<any> {
    if (!this.uploadId) {
      throw new Error('Upload not initialized');
    }
    if (this.uploadedChunks.size !== this.totalChunks) {
      throw new Error(`Missing chunks: ${this.totalChunks - this.uploadedChunks.size} remaining`);
    }
    return api.finalizeResumableUpload(this.uploadId);
  }
}
