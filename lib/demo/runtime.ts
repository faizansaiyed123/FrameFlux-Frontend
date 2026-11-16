
import type {
  DashboardOverviewResponse,
  Media,
  NotificationResponse,
  Project,
  ProjectFolder,
  ProjectHistoryEntry,
  User,
} from '@/types/api';
import {
  getDemoUser,
  loadDemoState,
  resetDemoState,
  saveDemoState,
  updateDemoState,
} from './store';
import type { DemoJob, DemoMedia, DemoResumable } from './seed';

const DEMO_ENABLED = process.env.NEXT_PUBLIC_FRAMEFLUX_DEMO !== 'false';
const DEMO_BACKEND_URL =
  process.env.NEXT_PUBLIC_FRAMEFLUX_DEMO_BACKEND_URL?.trim() || '';

const DEMO_TIMEOUT_MS = 1_250;

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function blobResponse(blob: Blob, status = 200) {
  return new Response(blob, {
    status,
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
  });
}

function id(prefix: string) {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return prefix + '-' + uuid;
}

function isoNow() {
  return new Date().toISOString();
}

function parseUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') {
    return new URL(input, window.location.origin);
  }
  if (input instanceof URL) return input;
  return new URL(input.url, window.location.origin);
}

function bodyJson(init?: RequestInit) {
  if (!init?.body || typeof init.body !== 'string') return {};
  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function inferMediaType(fileName: string, mimeType: string) {
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['mp3', 'wav', 'm4a', 'aac', 'flac'].includes(ext || '')) return 'audio';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return 'image';
  return 'video';
}

function mediaCopy(media: DemoMedia): DemoMedia {
  return structuredClone(media);
}

function refreshJob(job: DemoJob, stateMedia: DemoMedia[]) {
  if (job.status === 'completed' || job.status === 'failed') return;

  const elapsed = Math.max(0, Date.now() - job.started_at);
  const progress = Math.min(100, Math.floor(elapsed / 75));
  job.progress = progress;
  job.status = progress >= 100 ? 'completed' : progress < 8 ? 'queued' : 'processing';
  job.stage =
    job.status === 'queued'
      ? 'Queued'
      : job.status === 'completed'
        ? 'Completed'
        : progress < 35
          ? 'Preparing'
          : progress < 80
            ? 'Encoding'
            : 'Finalizing';

  if (job.status === 'completed') {
    if (job.media_id) {
      const media = stateMedia.find((item) => item.id === job.media_id);
      if (media) {
        media.processing_status = 'completed';
        media.processing_error = null;
        media.processed_filename =
          media.processed_filename || media.stored_filename;
      }
    }
    if (job.result == null) {
      job.result = {
        output_filename: job.media_id
          ? stateMedia.find((item) => item.id === job.media_id)?.stored_filename
          : undefined,
      };
    }
  }
}

function refreshAllJobs(jobs: DemoJob[], media: DemoMedia[]) {
  jobs.forEach((job) => refreshJob(job, media));
}

function statusForMedia(state: ReturnType<typeof loadDemoState>, media: DemoMedia) {
  const job = state.jobs.find((item) => item.media_id === media.id && item.status !== 'completed');
  if (job) refreshJob(job, state.media);
  const active = state.jobs
    .filter((item) => item.media_id === media.id)
    .sort((a, b) => b.started_at - a.started_at)[0];

  return {
    media_id: media.id,
    status: media.processing_status as 'pending' | 'queued' | 'processing' | 'completed' | 'failed',
    progress:
      media.processing_status === 'completed'
        ? 100
        : active?.progress ?? 0,
    stage: active?.stage ?? null,
    job_id: active?.job_id ?? null,
    processed_filename: media.processed_filename,
    error: media.processing_error,
  };
}

function createJob(
  state: ReturnType<typeof loadDemoState>,
  mediaId: string | null,
  projectId: string | null,
  operation: string,
) {
  const job: DemoJob = {
    job_id: id('job'),
    media_id: mediaId,
    project_id: projectId,
    operation,
    status: 'queued',
    progress: 0,
    stage: 'Queued',
    result: null,
    error: null,
    started_at: Date.now(),
    created_at: isoNow(),
  };

  state.jobs.unshift(job);

  if (mediaId) {
    const media = state.media.find((item) => item.id === mediaId);
    if (media) {
      media.processing_status = 'queued';
      media.processing_error = null;
    }
  }

  return job;
}

function actionResponse(job: DemoJob, extra: Record<string, unknown> = {}) {
  return {
    media_id: job.media_id,
    status: job.status,
    job_id: job.job_id,
    ...extra,
  };
}

function mediaOutputName(media: DemoMedia, operation: string) {
  const dot = media.original_filename.lastIndexOf('.');
  const base = dot > 0 ? media.original_filename.slice(0, dot) : media.original_filename;
  return base + '-' + operation + '-demo.mp4';
}

function demoSvg(label: string, width = 1280, height = 720) {
  const safe = label.replace(/[<>&"]/g, '');
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    width +
    '" height="' +
    height +
    '">' +
    '<defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#111827"/><stop offset="1" stop-color="#312e81"/></linearGradient></defs>' +
    '<rect width="100%" height="100%" fill="url(#g)"/>' +
    '<rect x="40" y="40" width="' +
    (width - 80) +
    '" height="' +
    (height - 80) +
    '" rx="32" fill="none" stroke="#818cf8" stroke-opacity=".55"/>' +
    '<text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="#f8fafc" font-family="Arial, sans-serif" font-size="' +
    Math.max(28, Math.floor(width / 28)) +
    '" font-weight="700">' +
    safe +
    '</text>' +
    '<text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="' +
    Math.max(16, Math.floor(width / 60)) +
    '">FrameFlux demo media</text>' +
    '</svg>';
  return new Blob([svg], { type: 'image/svg+xml' });
}

function demoAudioBlob() {
  const sampleRate = 8_000;
  const seconds = 1;
  const dataLength = sampleRate * seconds * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const write = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, dataLength, true);
  return new Blob([buffer], { type: 'audio/wav' });
}

function demoMediaBlob(media: DemoMedia, processed: boolean) {
  if (media.media_type === 'audio') return demoAudioBlob();
  return demoSvg((processed ? 'Processed' : 'Original') + ': ' + media.original_filename, media.width || 1280, media.height || 720);
}

async function localDemoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = parseUrl(input);
  const method = (init?.method || 'GET').toUpperCase();
  const path = url.pathname;
  const state = loadDemoState();
  refreshAllJobs(state.jobs, state.media);
  saveDemoState(state);

  if (path === '/auth/login' && method === 'POST') {
    return jsonResponse({
      access_token: 'frameflux-demo-token',
      token_type: 'bearer',
      expires_in: 86_400,
    });
  }

  if (path === '/auth/signup' && method === 'POST') {
    const body = bodyJson(init);
    state.user.email = String(body.email || state.user.email);
    state.user.full_name = String(body.full_name || state.user.full_name);
    state.user.updated_at = isoNow();
    saveDemoState(state);
    return jsonResponse({
      access_token: 'frameflux-demo-token',
      token_type: 'bearer',
      expires_in: 86_400,
    });
  }

  if (path === '/auth/logout' && method === 'POST') {
    return jsonResponse({ detail: 'Logged out from demo workspace.' });
  }

  if (path === '/auth/me' && method === 'GET') {
    return jsonResponse(getDemoUser());
  }

  if (path === '/auth/me' && method === 'PATCH') {
    const body = bodyJson(init);
    state.user = {
      ...state.user,
      full_name: body.full_name === undefined ? state.user.full_name : String(body.full_name),
      avatar_url: body.avatar_url === undefined ? state.user.avatar_url : String(body.avatar_url),
      preferences: body.preferences === undefined ? state.user.preferences : String(body.preferences),
      updated_at: isoNow(),
    };
    saveDemoState(state);
    return jsonResponse(state.user);
  }

  if (path.startsWith('/auth/')) {
    return jsonResponse({ detail: 'Demo request accepted.' });
  }

  if (path === '/dashboard/overview') {
    const recentProjects = state.projects
      .map((project) => ({
        ...project,
        media_count: state.media.filter((item) => item.project_id === project.id).length,
      }))
      .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
      .slice(0, 5);

    const mediaByType: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    let storage = 0;

    state.media.forEach((item) => {
      mediaByType[item.media_type] = (mediaByType[item.media_type] || 0) + 1;
      statusCounts[item.processing_status] =
        (statusCounts[item.processing_status] || 0) + 1;
      storage += item.file_size;
    });

    const response: DashboardOverviewResponse = {
      total_projects: state.projects.length,
      total_media: state.media.length,
      media_by_type: mediaByType,
      processing_status_counts: statusCounts,
      total_storage_used_bytes: storage,
      recent_projects: recentProjects,
      recent_media: state.media.slice(0, 6),
      active_jobs_count: state.jobs.filter((job) => job.status !== 'completed' && job.status !== 'failed').length,
    };

    return jsonResponse(response);
  }

  if (path === '/dashboard/recent-processing') {
    return jsonResponse(
      state.media
        .filter((item) => item.processing_status !== 'completed')
        .slice(0, Number(url.searchParams.get('limit') || '10')),
    );
  }

  if (path === '/projects' && method === 'GET') return jsonResponse(state.projects);

  if (path === '/projects' && method === 'POST') {
    const body = bodyJson(init);
    const project: Project = {
      id: id('project'),
      user_id: state.user.id,
      name: String(body.name || 'Untitled project'),
      description: body.description ? String(body.description) : null,
      created_at: isoNow(),
      updated_at: isoNow(),
    };
    state.projects.unshift(project);
    state.folders[project.id] = [];
    state.workflows[project.id] = [];
    state.history[project.id] = [];
    saveDemoState(state);
    return jsonResponse(project, 201);
  }

  const projectMatch = path.match(/^\/projects\/([^/]+)(?:\/(media|process|status|folders|workflows|history))?$/);
  if (projectMatch) {
    const projectId = projectMatch[1];
    const suffix = projectMatch[2];
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) return jsonResponse({ detail: 'Project not found' }, 404);

    if (!suffix && method === 'GET') return jsonResponse(project);

    if (!suffix && method === 'PATCH') {
      const body = bodyJson(init);
      project.name = body.name === undefined ? project.name : String(body.name);
      project.description =
        body.description === undefined ? project.description : String(body.description);
      project.updated_at = isoNow();
      saveDemoState(state);
      return jsonResponse(project);
    }

    if (!suffix && method === 'DELETE') {
      state.projects = state.projects.filter((item) => item.id !== projectId);
      state.media.forEach((item) => {
        if (item.project_id === projectId) item.project_id = null;
      });
      saveDemoState(state);
      return new Response(null, { status: 204 });
    }

    if (suffix === 'media' && method === 'GET') {
      return jsonResponse(state.media.filter((item) => item.project_id === projectId));
    }

    if (suffix === 'process' && method === 'POST') {
      const jobs = state.media
        .filter((item) => item.project_id === projectId)
        .map((item) => createJob(state, item.id, projectId, 'project-process'));
      state.history[projectId] = [
        ...(state.history[projectId] || []),
        {
          id: id('history'),
          operation: 'project-process',
          status: 'queued',
          created_at: isoNow(),
        },
      ];
      saveDemoState(state);
      return jsonResponse({
        project_id: projectId,
        status: 'queued',
        jobs: jobs.map((job) => ({ media_id: job.media_id, job_id: job.job_id })),
      });
    }

    if (suffix === 'status' && method === 'GET') {
      const items = state.media.filter((item) => item.project_id === projectId);
      const counts = {
        completed: items.filter((item) => item.processing_status === 'completed').length,
        processing: items.filter((item) => item.processing_status === 'processing').length,
        queued: items.filter((item) => item.processing_status === 'queued' || item.processing_status === 'pending').length,
        failed: items.filter((item) => item.processing_status === 'failed').length,
      };
      const status =
        counts.failed > 0 ? 'failed' : counts.processing > 0 ? 'processing' : counts.queued > 0 ? 'queued' : 'completed';
      return jsonResponse({
        project_id: projectId,
        status: items.length === 0 ? 'empty' : status,
        total: items.length,
        ...counts,
      });
    }

    if (suffix === 'folders' && method === 'GET') {
      return jsonResponse(state.folders[projectId] || []);
    }

    if (suffix === 'folders' && method === 'POST') {
      const name = url.searchParams.get('name') || 'New folder';
      const folder: ProjectFolder = {
        id: id('folder'),
        name,
        parent_id: url.searchParams.get('parent_id'),
      };
      state.folders[projectId] = [...(state.folders[projectId] || []), folder];
      saveDemoState(state);
      return jsonResponse(folder, 201);
    }

    if (suffix === 'workflows' && method === 'GET') return jsonResponse(state.workflows[projectId] || []);
    if (suffix === 'history' && method === 'GET') return jsonResponse(state.history[projectId] || []);
  }

  if (path === '/media/upload' && method === 'POST') {
    const formData = init?.body instanceof FormData ? init.body : null;
    const file = formData?.get('file');
    if (!(file instanceof File)) return jsonResponse({ detail: 'No demo file supplied.' }, 400);

    const media: DemoMedia = {
      id: id('media'),
      user_id: state.user.id,
      original_filename: file.name,
      stored_filename: id('stored') + '-' + file.name,
      media_type: inferMediaType(file.name, file.type),
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
      project_id: null,
      folder: null,
      tags: [],
      processing_status: 'pending',
      processed_filename: null,
      processing_error: null,
      duration: null,
      width: null,
      height: null,
      video_codec: null,
      audio_codec: null,
      fps: null,
      created_at: isoNow(),
    };
    state.media.unshift(media);
    saveDemoState(state);
    return jsonResponse(media, 201);
  }

  if (path === '/media/upload-multiple' && method === 'POST') {
    const formData = init?.body instanceof FormData ? init.body : null;
    const files = formData?.getAll('files').filter((item): item is File => item instanceof File) || [];
    const created = files.map((file) => ({
      id: id('media'),
      user_id: state.user.id,
      original_filename: file.name,
      stored_filename: id('stored') + '-' + file.name,
      media_type: inferMediaType(file.name, file.type),
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
      project_id: null,
      folder: null,
      tags: [],
      processing_status: 'pending',
      processed_filename: null,
      processing_error: null,
      duration: null,
      width: null,
      height: null,
      video_codec: null,
      audio_codec: null,
      fps: null,
      created_at: isoNow(),
    })) satisfies DemoMedia[];
    state.media.unshift(...created);
    saveDemoState(state);
    return jsonResponse(created, 201);
  }

  if (path === '/media' && method === 'GET') {
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const mediaType = url.searchParams.get('media_type');
    const folder = url.searchParams.get('folder');
    const tag = url.searchParams.get('tag');
    const result = state.media.filter((item) => {
      if (search && !item.original_filename.toLowerCase().includes(search)) return false;
      if (mediaType && item.media_type !== mediaType) return false;
      if (folder && item.folder !== folder) return false;
      if (tag && !(item.tags || []).includes(tag)) return false;
      return true;
    });
    return jsonResponse(result);
  }

  const mediaMatch = path.match(/^\/media\/([^/]+)(?:\/(status|progress|process|compress|convert|edit|merge|transform|freeze|overlay|split|clips\/keep|clips\/delete|clips\/reorder|clips\/append|project\/[^/]+|download|file|processed|versions))?$/);
  if (mediaMatch) {
    const mediaId = mediaMatch[1];
    const action = mediaMatch[2];
    const media = state.media.find((item) => item.id === mediaId);
    if (!media) return jsonResponse({ detail: 'Media not found' }, 404);

    if (!action && method === 'GET') return jsonResponse(mediaCopy(media));
    if (!action && method === 'DELETE') {
      state.media = state.media.filter((item) => item.id !== mediaId);
      state.jobs = state.jobs.filter((job) => job.media_id !== mediaId);
      saveDemoState(state);
      return new Response(null, { status: 204 });
    }

    if (action === 'status' || action === 'progress') {
      return jsonResponse(statusForMedia(state, media));
    }

    if (action === 'download' || action === 'file' || action === 'processed') {
      const isProcessed = action !== 'file';
      return blobResponse(demoMediaBlob(media, isProcessed));
    }

    if (action === 'versions' && method === 'GET') {
      return jsonResponse([
        {
          id: id('version'),
          version_number: 1,
          label: 'Original demo',
          stored_filename: media.stored_filename,
          processing_status: media.processing_status,
          created_at: media.created_at,
        },
        ...(media.processed_filename
          ? [
              {
                id: id('version'),
                version_number: 2,
                label: 'Latest processed demo',
                stored_filename: media.processed_filename,
                processing_status: 'completed',
                created_at: isoNow(),
              },
            ]
          : []),
      ]);
    }

    if (action?.startsWith('project/') && method === 'PATCH') {
      const projectId = action.split('/')[1];
      media.project_id = projectId;
      saveDemoState(state);
      return jsonResponse(media);
    }

    if (['process', 'compress', 'convert', 'edit', 'merge', 'transform', 'freeze', 'overlay', 'split'].includes(action || '')) {
      const job = createJob(state, mediaId, null, action || 'process');
      const output = mediaOutputName(media, action || 'process');
      job.result = { output_filename: output };
      state.history[media.project_id || 'unassigned'] = [
        ...(state.history[media.project_id || 'unassigned'] || []),
        {
          id: id('history'),
          operation: action || 'process',
          status: 'queued',
          created_at: isoNow(),
        },
      ];
      saveDemoState(state);

      return jsonResponse(
        actionResponse(job, {
          output_filename: output,
          operation: action,
        }),
        200,
      );
    }

    if (action?.startsWith('clips/')) {
      const job = createJob(state, mediaId, null, action);
      saveDemoState(state);
      return jsonResponse(actionResponse(job, { output_filename: mediaOutputName(media, 'clips') }));
    }
  }

  if (path === '/media/batch-download' && method === 'POST') {
    const body = bodyJson(init);
    const ids = Array.isArray(body.media_ids) ? body.media_ids.map(String) : [];
    const selected = state.media.filter((item) => ids.includes(item.id));
    return jsonResponse({
      jobs: selected.map((item) => ({
        media_id: item.id,
        original_filename: item.original_filename,
        file_size: item.file_size,
      })),
      total: selected.length,
    });
  }

  if (path.startsWith('/media/uploads/') && path.endsWith('/progress')) {
    const uploadId = path.split('/')[3];
    const upload = state.resumables.find((item) => item.upload_id === uploadId);
    if (!upload) return jsonResponse({ detail: 'Upload session not found' }, 404);
    return jsonResponse({
      upload_id: upload.upload_id,
      user_id: state.user.id,
      filename: upload.filename,
      status: upload.status,
      progress: upload.progress,
      total_size: String(upload.total_size),
      uploaded_size: String(upload.uploaded_size),
    });
  }

  if (path === '/media/resumable/init' && method === 'POST') {
    const body = bodyJson(init);
    const upload: DemoResumable = {
      upload_id: id('upload'),
      filename: String(body.original_filename || 'demo-upload.bin'),
      total_size: Number(body.total_size || 0),
      uploaded_size: 0,
      status: 'active',
      progress: 0,
    };
    state.resumables.unshift(upload);
    saveDemoState(state);
    return jsonResponse({ upload_id: upload.upload_id });
  }

  const resumableMatch = path.match(/^\/media\/resumable\/([^/]+)(?:\/(chunk|pause|resume|retry|finalize))?(?:\/(\d+))?$/);
  if (resumableMatch) {
    const upload = state.resumables.find((item) => item.upload_id === resumableMatch[1]);
    if (!upload) return jsonResponse({ detail: 'Upload session not found' }, 404);

    const action = resumableMatch[2];
    if (action === 'pause') upload.status = 'paused';
    if (action === 'resume') upload.status = 'active';
    if (action === 'retry' || action === 'chunk') {
      const blob = init?.body instanceof FormData ? init.body.get('file') : null;
      const size = blob instanceof Blob ? blob.size : 0;
      upload.uploaded_size = Math.min(upload.total_size, upload.uploaded_size + size);
      upload.progress = upload.total_size ? Math.round((upload.uploaded_size / upload.total_size) * 100) : 100;
      upload.status = 'active';
    }
    if (action === 'finalize') {
      upload.status = 'completed';
      upload.uploaded_size = upload.total_size;
      upload.progress = 100;
      const media: DemoMedia = {
        id: id('media'),
        user_id: state.user.id,
        original_filename: upload.filename,
        stored_filename: id('stored') + '-' + upload.filename,
        media_type: inferMediaType(upload.filename, ''),
        mime_type: 'application/octet-stream',
        file_size: upload.total_size,
        project_id: null,
        folder: null,
        tags: [],
        processing_status: 'pending',
        processed_filename: null,
        processing_error: null,
        duration: null,
        width: null,
        height: null,
        video_codec: null,
        audio_codec: null,
        fps: null,
        created_at: isoNow(),
      };
      state.media.unshift(media);
      saveDemoState(state);
      return jsonResponse(media);
    }
    saveDemoState(state);
    if (action === 'retry' || action === 'chunk') return jsonResponse({ detail: 'Demo chunk accepted.' });
    return jsonResponse({ detail: 'Demo upload state updated.' });
  }

  if (path === '/media/resumable' && method === 'DELETE') {
    return jsonResponse({ detail: 'Demo upload cancelled.' });
  }

  if (path.startsWith('/jobs/')) {
    const jobId = path.split('/')[2];
    const job = state.jobs.find((item) => item.job_id === jobId);
    if (!job) return jsonResponse({ detail: 'Job not found' }, 404);
    refreshJob(job, state.media);
    saveDemoState(state);
    return jsonResponse({
      job_id: job.job_id,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      result: job.result,
      error: job.error,
    });
  }

  if (path === '/jobs' && method === 'GET') {
    return jsonResponse(state.jobs.map((job) => ({
      job_id: job.job_id,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      result: job.result,
      error: job.error,
    })));
  }

  if (path.startsWith('/notifications')) {
    return jsonResponse(state.notifications);
  }

  if (path.startsWith('/favorites')) {
    if (method === 'GET') {
      return jsonResponse(
        state.favorites.map((mediaId) => ({
          id: id('favorite'),
          media_id: mediaId,
          user_id: state.user.id,
          created_at: isoNow(),
        })),
      );
    }
    return jsonResponse({ detail: 'Favorite updated in demo workspace.' });
  }

  if (path.startsWith('/search')) {
    const q = (url.searchParams.get('q') || url.searchParams.get('search') || '').toLowerCase();
    return jsonResponse(
      state.media
        .filter((item) => !q || item.original_filename.toLowerCase().includes(q))
        .map((item) => ({
          id: item.id,
          original_filename: item.original_filename,
          media_type: item.media_type,
          file_size: item.file_size,
          duration: item.duration,
          processing_status: item.processing_status,
          folder: item.folder,
          tags: item.tags?.join(', ') || null,
          created_at: item.created_at,
        })),
    );
  }

  if (path.startsWith('/thumbnails/')) {
    if (path.includes('/set') && method === 'GET') {
      const id = path.split('/')[2];
      const thumb = encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="#111827"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#f8fafc" font-family="Arial" font-size="28">FrameFlux demo thumbnail</text></svg>',
      );
      return jsonResponse({
        thumbnails: [
          'data:image/svg+xml;charset=UTF-8,' + thumb + '-' + id,
        ],
      });
    }
    if (path.includes('/crop') && method === 'POST') {
      return jsonResponse({ path: 'demo://thumbnail/cropped-' + path.split('/')[2] });
    }
    if (path.includes('/select') && method === 'POST') {
      return jsonResponse({ selected: 'demo://thumbnail/selected-' + path.split('/')[2] });
    }
    if (method === 'GET') {
      return blobResponse(demoSvg('Thumbnail preview'));
    }
    return jsonResponse({ path: 'demo://thumbnail/' + path.split('/')[2] });
  }

  if (path.startsWith('/storage')) {
    const total = state.media.reduce((sum, item) => sum + item.file_size, 0);
    return jsonResponse({
      total_size: total,
      total_files: state.media.length,
      user_id: state.user.id,
    });
  }

  if (path.startsWith('/presets')) {
    return jsonResponse(state.presets);
  }

  if (
    path.startsWith('/video/') ||
    path.startsWith('/audio/') ||
    path.startsWith('/images/') ||
    path.startsWith('/export/') ||
    path.startsWith('/metadata/') ||
    path.startsWith('/preview/') ||
    path.startsWith('/sharing/') ||
    path.startsWith('/comparisons/') ||
    path.startsWith('/workflows/') ||
    path.startsWith('/quick-actions/') ||
    path.startsWith('/batch/')
  ) {
    const mediaId = path.split('/')[2];
    const media = state.media.find((item) => item.id === mediaId);
    if (path.includes('/thumbnail') || path.includes('/preview') || path.includes('/extract') || path.includes('/convert') || path.includes('/to-video')) {
      return blobResponse(media ? demoMediaBlob(media, true) : demoSvg('FrameFlux demo output'));
    }
    if (media) {
      const job = createJob(state, media.id, null, path.split('/')[1] || 'operation');
      saveDemoState(state);
      return jsonResponse({
        output_filename: mediaOutputName(media, path.split('/')[1] || 'operation'),
        operation: path.split('/')[1] || 'operation',
        media_id: media.id,
        status: job.status,
        job_id: job.job_id,
      });
    }
    return jsonResponse({ detail: 'Demo operation completed.' });
  }

  if (path === '/demo/reset' && method === 'POST') {
    resetDemoState();
    return jsonResponse({ detail: 'Demo workspace reset.' });
  }

  return jsonResponse({ detail: 'Demo endpoint simulated.' });
}

export async function fetchWithDemo(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (!DEMO_ENABLED) return fetch(input, init);

  if (DEMO_BACKEND_URL) {
    const request = new Request(input, init);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), DEMO_TIMEOUT_MS);
    try {
      const response = await fetch(
        DEMO_BACKEND_URL + parseUrl(input).pathname + parseUrl(input).search,
        {
          ...init,
          method: init?.method || 'GET',
          headers: init?.headers,
          credentials: 'include',
          signal: controller.signal,
        },
      );
      if (response.ok) return response;
    } catch {
      // The deployed recruiter demo remains usable even when its optional API is down.
    } finally {
      window.clearTimeout(timer);
    }
  }

  return localDemoFetch(input, init);
}

export { DEMO_ENABLED, resetDemoState };
