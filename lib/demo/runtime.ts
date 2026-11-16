
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
const ENV_DEMO_BACKEND_URL =
  (process.env.NEXT_PUBLIC_FRAMEFLUX_DEMO_BACKEND_URL?.trim() || '').replace(/\/+$/, '');
const DEMO_BACKEND_SESSION_KEY = 'frameflux-demo-backend-url-v1';
const DEMO_BACKEND_QUERY_PARAM = 'demoBackend';

const DEMO_TIMEOUT_MS = 10_000;
const DEMO_UPLOAD_TIMEOUT_MS = 90_000;
let demoBackendFallbackWarningShown = false;

function normalizeQuickTunnelUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.trim());
    const projectPath = url.pathname.replace(/\/+$/, '');
    const validProjectPath =
      projectPath === '' ||
      /^\/[a-z0-9](?:[a-z0-9-]{0,47}[a-z0-9])?$/.test(projectPath);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !validProjectPath ||
      url.search ||
      url.hash ||
      !url.hostname.toLowerCase().endsWith('.trycloudflare.com')
    ) {
      return null;
    }
    return url.origin + projectPath;
  } catch {
    return null;
  }
}

function getDemoBackendUrl(): string {
  if (typeof window === 'undefined') return ENV_DEMO_BACKEND_URL;

  try {
    const pageUrl = new URL(window.location.href);
    if (pageUrl.searchParams.has(DEMO_BACKEND_QUERY_PARAM)) {
      const suppliedUrl = pageUrl.searchParams.get(DEMO_BACKEND_QUERY_PARAM) || '';
      if (suppliedUrl.toLowerCase() === 'local') {
        window.sessionStorage.setItem(DEMO_BACKEND_SESSION_KEY, 'local');
      } else {
        const tunnelUrl = normalizeQuickTunnelUrl(suppliedUrl);
        if (tunnelUrl) {
          window.sessionStorage.setItem(DEMO_BACKEND_SESSION_KEY, tunnelUrl);
        } else {
          window.sessionStorage.removeItem(DEMO_BACKEND_SESSION_KEY);
          console.warn(
            'FrameFlux demo backend URL was ignored. Expected an HTTPS Cloudflare Quick Tunnel URL ending in .trycloudflare.com, optionally followed by one project path such as /frameflux.',
          );
        }
      }

      pageUrl.searchParams.delete(DEMO_BACKEND_QUERY_PARAM);
      window.history.replaceState(
        window.history.state,
        '',
        pageUrl.pathname + pageUrl.search + pageUrl.hash,
      );
    }

    const storedUrl = window.sessionStorage.getItem(DEMO_BACKEND_SESSION_KEY);
    if (storedUrl === 'local') return '';
    if (storedUrl) return storedUrl;
  } catch {
    // Private browsing or restrictive storage settings should not break the demo.
  }

  return ENV_DEMO_BACKEND_URL;
}

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


  if (path.startsWith('/media/') && path.includes('/versions')) {
    const parts = path.split('/');
    const mediaId = parts[2];
    const media = state.media.find((item) => item.id === mediaId);
    if (!media) return jsonResponse({ detail: 'Media not found' }, 404);
    const versionId = parts[4];
    const versions = [
      {
        id: media.id + '-v1',
        version_number: 1,
        label: 'Original demo',
        stored_filename: media.stored_filename,
        processing_status: 'completed',
        created_at: media.created_at,
      },
      ...(media.processed_filename
        ? [{
            id: media.id + '-v2',
            version_number: 2,
            label: 'Latest processed demo',
            stored_filename: media.processed_filename,
            processing_status: 'completed',
            created_at: isoNow(),
          }]
        : []),
    ];
    if (parts.length === 4 && method === 'GET') return jsonResponse(versions);
    const version = versions.find((item) => item.id === versionId);
    if (!version) return jsonResponse({ detail: 'Version not found' }, 404);
    if (parts[5] === 'download' && method === 'GET') return blobResponse(demoMediaBlob(media, true));
    if (parts[5] === 'restore' && method === 'POST') {
      media.processing_status = 'completed';
      media.processed_filename = version.stored_filename;
      media.processing_error = null;
      saveDemoState(state);
      return jsonResponse(media);
    }
    if (parts.length === 5 && method === 'GET') return jsonResponse(version);
    if (parts.length === 5 && method === 'DELETE') return new Response(null, { status: 204 });
  }

  if (path === '/batch/upload' && method === 'POST') {
    const body = bodyJson(init);
    const files = Array.isArray(body.files) ? body.files.map(String) : [];
    const job: DemoJob = {
      job_id: id('batch-job'),
      media_id: null,
      project_id: null,
      operation: 'batch-upload',
      status: 'completed',
      progress: 100,
      stage: 'Completed',
      result: { files, total_files: files.length },
      error: null,
      started_at: Date.now() - 500,
      created_at: isoNow(),
    };
    state.jobs.unshift(job);
    saveDemoState(state);
    return jsonResponse({ job_id: job.job_id, total_files: files.length, status: job.status });
  }

  if (path === '/batch/process' && method === 'POST') {
    const body = bodyJson(init);
    const ids = Array.isArray(body.media_ids) ? body.media_ids.map(String) : [];
    const operation = String(body.operation || 'process');
    const selected = state.media.filter((item) => ids.includes(item.id));
    const results = selected.map((item) => {
      const child = createJob(state, item.id, null, 'batch:' + operation);
      child.result = { output_filename: mediaOutputName(item, operation) };
      return { media_id: item.id, filename: mediaOutputName(item, operation), job_id: child.job_id };
    });
    const batchJob: DemoJob = {
      job_id: id('batch-job'),
      media_id: null,
      project_id: null,
      operation,
      status: results.length ? 'processing' : 'completed',
      progress: results.length ? 0 : 100,
      stage: results.length ? 'Queued' : 'Completed',
      result: { total: results.length, completed: 0, failed: 0, results },
      error: null,
      started_at: Date.now(),
      created_at: isoNow(),
    };
    state.jobs.unshift(batchJob);
    saveDemoState(state);
    return jsonResponse({
      job_id: batchJob.job_id,
      total_items: selected.length,
      operation,
      status: batchJob.status,
      results: results.map(({ media_id, filename }) => ({ media_id, filename })),
    });
  }

  const batchStatusMatch = path.match(/^\/batch\/([^/]+)\/status$/);
  if (batchStatusMatch && method === 'GET') {
    const job = state.jobs.find((item) => item.job_id === batchStatusMatch[1]);
    if (!job) return jsonResponse({ detail: 'Batch job not found' }, 404);
    const result = (job.result || {}) as { results?: { media_id: string; filename: string; job_id?: string }[] };
    const child = (result.results || []).map((item) => {
      const childJob = item.job_id ? state.jobs.find((candidate) => candidate.job_id === item.job_id) : null;
      if (childJob) refreshJob(childJob, state.media);
      return {
        media_id: item.media_id,
        filename: item.filename,
        status: childJob?.status || 'completed',
        progress: childJob?.progress ?? 100,
        error: childJob?.error || undefined,
        output_filename: childJob?.result && typeof childJob.result === 'object'
          ? (childJob.result as { output_filename?: string }).output_filename
          : item.filename,
      };
    });
    const completed = child.filter((item) => item.status === 'completed').length;
    const failed = child.filter((item) => item.status === 'failed').length;
    const total = child.length;
    job.progress = total ? Math.round(child.reduce((sum, item) => sum + item.progress, 0) / total) : 100;
    job.status = failed ? 'failed' : completed === total ? 'completed' : 'processing';
    job.stage = job.status === 'completed' ? 'Completed' : 'Processing';
    saveDemoState(state);
    return jsonResponse({ job_id: job.job_id, status: job.status, total, completed, failed, results: child });
  }

  if (path === '/presets' && method === 'GET') return jsonResponse(state.presets);
  if (path === '/presets' && method === 'POST') {
    const body = bodyJson(init);
    const preset = {
      id: id('preset'),
      user_id: state.user.id,
      name: String(body.name || 'Untitled preset'),
      description: body.description ? String(body.description) : null,
      is_builtin: false,
      settings: (body.settings && typeof body.settings === 'object' ? body.settings : {}) as Record<string, unknown>,
      created_at: isoNow(),
      updated_at: isoNow(),
    };
    state.presets.unshift(preset);
    saveDemoState(state);
    return jsonResponse(preset, 201);
  }

  const presetMatch = path.match(/^\/presets\/([^/]+)$/);
  if (presetMatch) {
    const preset = state.presets.find((item) => item.id === presetMatch[1]);
    if (!preset) return jsonResponse({ detail: 'Preset not found' }, 404);
    if (method === 'GET') return jsonResponse(preset);
    if (method === 'PATCH') {
      const body = bodyJson(init);
      if (body.name !== undefined) preset.name = String(body.name);
      if (body.description !== undefined) preset.description = body.description ? String(body.description) : null;
      if (body.settings && typeof body.settings === 'object') preset.settings = body.settings as Record<string, unknown>;
      preset.updated_at = isoNow();
      saveDemoState(state);
      return jsonResponse(preset);
    }
    if (method === 'DELETE') {
      state.presets = state.presets.filter((item) => item.id !== preset.id);
      saveDemoState(state);
      return new Response(null, { status: 204 });
    }
  }

  const globalWorkflows = () => state.workflows.__global__ || [];
  if (path === '/workflows' && method === 'GET') return jsonResponse(globalWorkflows());
  if (path === '/workflows' && method === 'POST') {
    const body = bodyJson(init);
    const workflow = {
      id: id('workflow'),
      user_id: state.user.id,
      name: String(body.name || 'Untitled workflow'),
      description: body.description ? String(body.description) : null,
      is_builtin: false,
      operations: Array.isArray(body.operations)
        ? body.operations.map((operation) => ({
            type: String((operation as Record<string, unknown>).type || 'process'),
            params: ((operation as Record<string, unknown>).params || {}) as Record<string, unknown>,
          }))
        : [],
      created_at: isoNow(),
      updated_at: isoNow(),
    };
    state.workflows.__global__ = [workflow, ...globalWorkflows()];
    saveDemoState(state);
    return jsonResponse(workflow, 201);
  }

  const workflowMatch = path.match(/^\/workflows\/([^/]+)(?:\/run)?$/);
  if (workflowMatch) {
    const workflow = globalWorkflows().find((item) => item.id === workflowMatch[1]);
    if (!workflow) return jsonResponse({ detail: 'Workflow not found' }, 404);
    if (path.endsWith('/run') && method === 'POST') {
      const mediaId = url.searchParams.get('media_id');
      if (mediaId) createJob(state, mediaId, null, 'workflow:' + workflow.id);
      saveDemoState(state);
      return jsonResponse({ workflow_id: workflow.id, media_id: mediaId, operations_count: workflow.operations.length, status: 'queued' });
    }
    if (method === 'GET') return jsonResponse(workflow);
    if (method === 'PATCH') {
      const body = bodyJson(init);
      if (body.name !== undefined) workflow.name = String(body.name);
      if (body.description !== undefined) workflow.description = body.description ? String(body.description) : null;
      if (Array.isArray(body.operations)) {
        workflow.operations = body.operations.map((operation) => ({
          type: String((operation as Record<string, unknown>).type || 'process'),
          params: ((operation as Record<string, unknown>).params || {}) as Record<string, unknown>,
        }));
      }
      workflow.updated_at = isoNow();
      saveDemoState(state);
      return jsonResponse(workflow);
    }
    if (method === 'DELETE') {
      state.workflows.__global__ = globalWorkflows().filter((item) => item.id !== workflow.id);
      saveDemoState(state);
      return new Response(null, { status: 204 });
    }
  }

  if (path === '/storage/usage' && method === 'GET') {
    const total = state.media.reduce((sum, item) => sum + item.file_size, 0);
    return jsonResponse({ total_size: total, total_files: state.media.length, user_id: state.user.id });
  }
  if (path === '/storage/usage/by-type' && method === 'GET') {
    const grouped = new Map<string, { total_size: number; count: number }>();
    state.media.forEach((item) => {
      const current = grouped.get(item.media_type) || { total_size: 0, count: 0 };
      current.total_size += item.file_size;
      current.count += 1;
      grouped.set(item.media_type, current);
    });
    return jsonResponse(Array.from(grouped, ([media_type, value]) => ({ media_type, ...value })));
  }
  if (path === '/storage/usage/by-folder' && method === 'GET') {
    const grouped = new Map<string, { total_size: number; count: number }>();
    state.media.forEach((item) => {
      const folder = item.folder || 'Unfiled';
      const current = grouped.get(folder) || { total_size: 0, count: 0 };
      current.total_size += item.file_size;
      current.count += 1;
      grouped.set(folder, current);
    });
    return jsonResponse(Array.from(grouped, ([folder, value]) => ({ folder, ...value })));
  }

  if (path.startsWith('/search/media')) {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const mediaType = url.searchParams.get('media_type');
    const folder = url.searchParams.get('folder');
    const tag = url.searchParams.get('tag');
    const status = url.searchParams.get('processing_status');
    const minSize = Number(url.searchParams.get('min_size') || 0);
    const maxSize = Number(url.searchParams.get('max_size') || Number.MAX_SAFE_INTEGER);
    const minDuration = Number(url.searchParams.get('min_duration') || 0);
    const maxDuration = Number(url.searchParams.get('max_duration') || Number.MAX_SAFE_INTEGER);
    return jsonResponse(
      state.media
        .filter((item) => !q || item.original_filename.toLowerCase().includes(q))
        .filter((item) => !mediaType || item.media_type === mediaType)
        .filter((item) => !folder || item.folder === folder)
        .filter((item) => !tag || (item.tags || []).includes(tag))
        .filter((item) => !status || item.processing_status === status)
        .filter((item) => item.file_size >= minSize && item.file_size <= maxSize)
        .filter((item) => item.duration == null || (item.duration >= minDuration && item.duration <= maxDuration))
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

  if (path === '/history' && method === 'GET') {
    return jsonResponse(Object.entries(state.history).flatMap(([projectId, entries]) => entries.map((entry) => ({
      ...entry,
      media_id: state.media.find((item) => item.project_id === projectId)?.id || null,
      settings: null,
      error: null,
      started_at: entry.created_at,
      finished_at: entry.status === 'completed' ? entry.created_at : null,
    }))));
  }
  if (path === '/history' && method === 'POST') {
    const mediaId = url.searchParams.get('media_id');
    const operation = url.searchParams.get('operation') || 'operation';
    const historyStatus = url.searchParams.get('status') || 'completed';
    const entry = { id: id('history'), operation, status: historyStatus, created_at: isoNow() };
    const projectId = mediaId ? state.media.find((item) => item.id === mediaId)?.project_id : null;
    if (projectId) state.history[projectId] = [entry, ...(state.history[projectId] || [])];
    saveDemoState(state);
    return jsonResponse({ ...entry, media_id: mediaId, settings: null, error: null, started_at: entry.created_at, finished_at: historyStatus === 'completed' ? entry.created_at : null }, 201);
  }

  if (path.startsWith('/comparisons/') && method === 'GET') {
    const [, , aId, bId] = path.split('/');
    const a = state.media.find((item) => item.id === aId);
    const b = state.media.find((item) => item.id === bId);
    if (!a || !b) return jsonResponse({ detail: 'Media not found' }, 404);
    return jsonResponse({
      media_a_id: a.id,
      media_b_id: b.id,
      size_diff: a.file_size - b.file_size,
      duration_diff: a.duration != null && b.duration != null ? a.duration - b.duration : null,
      resolution_match: a.width === b.width && a.height === b.height,
      video_codec_match: a.video_codec === b.video_codec,
      audio_codec_match: a.audio_codec === b.audio_codec,
      storage_saved: Math.max(0, b.file_size - a.file_size),
    });
  }

  if (path === '/notifications' && method === 'GET') {
    const page = Number(url.searchParams.get('page') || 1);
    const pageSize = Number(url.searchParams.get('page_size') || 20);
    const unreadOnly = url.searchParams.get('unread_only') === 'true';
    const filtered = unreadOnly ? state.notifications.filter((item) => !item.is_read) : state.notifications;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return jsonResponse({
      items,
      page,
      page_size: pageSize,
      total: filtered.length,
      total_pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    });
  }
  if (path === '/notifications/unread-count' && method === 'GET') {
    return jsonResponse({ unread_count: state.notifications.filter((item) => !item.is_read).length });
  }
  if (path === '/notifications/read-all' && method === 'POST') {
    state.notifications.forEach((item) => { item.is_read = true; });
    saveDemoState(state);
    return new Response(null, { status: 204 });
  }
  if (path === '/notifications' && method === 'POST') {
    const body = bodyJson(init);
    const notification = {
      id: id('notification'),
      event: String(body.event || 'demo.event'),
      message: String(body.message || 'Demo notification'),
      is_read: false,
      created_at: isoNow(),
    };
    state.notifications.unshift(notification);
    saveDemoState(state);
    return jsonResponse(notification, 201);
  }
  const notificationReadMatch = path.match(/^\/notifications\/([^/]+)\/read$/);
  if (notificationReadMatch && method === 'POST') {
    const notification = state.notifications.find((item) => item.id === notificationReadMatch[1]);
    if (!notification) return jsonResponse({ detail: 'Notification not found' }, 404);
    notification.is_read = true;
    saveDemoState(state);
    return jsonResponse(notification);
  }

  if (path === '/ui/preferences' && method === 'GET') {
    return jsonResponse(Object.entries(state.preferences).map(([key, value]) => ({ id: 'preference-' + key, key, value, updated_at: isoNow() })));
  }
  const preferenceMatch = path.match(/^\/ui\/preferences\/([^/]+)$/);
  if (preferenceMatch && method === 'PUT') {
    const key = decodeURIComponent(preferenceMatch[1]);
    const body = bodyJson(init);
    state.preferences[key] = String(body.value ?? '');
    saveDemoState(state);
    return jsonResponse({ id: 'preference-' + key, key, value: state.preferences[key], updated_at: isoNow() });
  }

  if (path === '/favorites' && method === 'GET') {
    return jsonResponse(state.favorites.map((mediaId) => ({ id: 'favorite-' + mediaId, media_id: mediaId, user_id: state.user.id, created_at: isoNow() })));
  }
  if (path === '/favorites' && method === 'POST') {
    const body = bodyJson(init);
    const mediaId = String(body.media_id || '');
    if (mediaId && !state.favorites.includes(mediaId)) state.favorites.push(mediaId);
    saveDemoState(state);
    return jsonResponse({ id: 'favorite-' + mediaId, media_id: mediaId, user_id: state.user.id, created_at: isoNow() }, 201);
  }
  const favoriteMatch = path.match(/^\/favorites\/([^/]+)$/);
  if (favoriteMatch && method === 'DELETE') {
    state.favorites = state.favorites.filter((mediaId) => mediaId !== favoriteMatch[1]);
    saveDemoState(state);
    return new Response(null, { status: 204 });
  }

  if (path === '/quick-actions' && method === 'GET') return jsonResponse(state.quickActions);
  const quickActionMatch = path.match(/^\/quick-actions\/([^/]+)\/execute$/);
  if (quickActionMatch && method === 'POST') {
    const mediaId = quickActionMatch[1];
    const actionId = url.searchParams.get('action_id') || 'process';
    const media = state.media.find((item) => item.id === mediaId);
    if (!media) return jsonResponse({ detail: 'Media not found' }, 404);
    const job = createJob(state, media.id, null, 'quick-action:' + actionId);
    saveDemoState(state);
    return jsonResponse({ media_id: media.id, action_id: actionId, status: job.status });
  }

  if (path === '/sharing' && method === 'GET') return jsonResponse(state.shares);
  if (path.startsWith('/sharing/embed/') && method === 'GET') {
    const token = path.split('/')[3];
    const share = state.shares.find((item) => item.token === token);
    if (!share) return jsonResponse({ detail: 'Share not found' }, 404);
    const media = state.media.find((item) => item.id === share.media_id);
    return jsonResponse({
      embed_url: 'https://demo.frameflux.local/share/' + share.token,
      embed_code: '<iframe src="https://demo.frameflux.local/share/' + share.token + '" title="FrameFlux demo share"></iframe>',
      media_title: media?.original_filename || 'FrameFlux demo media',
    });
  }
  if (path.startsWith('/sharing/') && method === 'GET') {
    const token = path.split('/')[2];
    const share = state.shares.find((item) => item.token === token || item.id === token);
    if (!share) return jsonResponse({ detail: 'Share not found' }, 404);
    return jsonResponse(share);
  }
  if (path === '/sharing' && method === 'POST') {
    const body = bodyJson(init);
    const share = {
      id: id('share'),
      media_id: String(body.media_id || ''),
      token: id('share-token').replace('share-token-', ''),
      has_password: Boolean(body.password),
      expires_at: body.expires_in_hours ? new Date(Date.now() + Number(body.expires_in_hours) * 3600_000).toISOString() : null,
      is_active: true,
      allow_download: body.allow_download !== false,
      view_count: 0,
      allowed_domains: body.allowed_domains ? String(body.allowed_domains) : null,
      created_at: isoNow(),
    };
    state.shares.unshift(share);
    saveDemoState(state);
    return jsonResponse(share, 201);
  }
  const shareMutationMatch = path.match(/^\/sharing\/([^/]+)(?:\/(disable))?$/);
  if (shareMutationMatch) {
    const share = state.shares.find((item) => item.id === shareMutationMatch[1] || item.token === shareMutationMatch[1]);
    if (!share) return jsonResponse({ detail: 'Share not found' }, 404);
    if (shareMutationMatch[2] === 'disable' && method === 'POST') {
      share.is_active = false;
      saveDemoState(state);
      return jsonResponse(share);
    }
    if (method === 'DELETE') {
      state.shares = state.shares.filter((item) => item.id !== share.id);
      saveDemoState(state);
      return new Response(null, { status: 204 });
    }
  }

  if (path.startsWith('/media-info/') && method === 'GET') {
    const mediaId = path.split('/')[2];
    const media = state.media.find((item) => item.id === mediaId);
    if (!media) return jsonResponse({ detail: 'Media not found' }, 404);
    return jsonResponse({
      file_name: media.original_filename,
      file_size: media.file_size,
      duration: media.duration,
      resolution: media.width && media.height ? media.width + 'x' + media.height : null,
      fps: media.fps,
      video_codec: media.video_codec,
      audio_codec: media.audio_codec,
      bitrate: null,
      audio_channels: media.media_type === 'audio' ? 2 : media.audio_codec ? 2 : null,
      sample_rate: media.media_type === 'audio' ? 48000 : null,
      container_format: media.original_filename.split('.').pop()?.toLowerCase() || null,
      audio_tracks: media.audio_codec ? 1 : 0,
      subtitle_tracks: 1,
      available_streams: [],
      metadata: { demo: true, source: 'FrameFlux demo runtime' },
      creation_metadata: {},
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


  if (path.startsWith('/preview/') && method === 'GET') {
    const mediaId = path.split('/')[2];
    const media = state.media.find((item) => item.id === mediaId);
    return blobResponse(media ? demoMediaBlob(media, true) : demoSvg('FrameFlux preview'));
  }

  if (path.startsWith('/gif/') && method === 'POST') {
    const mediaId = path.split('/')[2];
    const media = state.media.find((item) => item.id === mediaId);
    return blobResponse(media ? demoMediaBlob(media, true) : demoSvg('FrameFlux GIF output'));
  }

  if (path.startsWith('/subtitles/')) {
    if (path.endsWith('/tracks') && method === 'GET') {
      return jsonResponse([
        {
          id: 1,
          codec: 'subrip',
          language: 'en',
          title: 'English (demo)',
          is_default: true,
          is_forced: false,
        },
      ]);
    }
    if (path === '/subtitles/upload' && method === 'POST') {
      return jsonResponse({
        path: 'demo://subtitle/' + id('uploaded'),
        filename: 'demo-subtitles.srt',
      }, 201);
    }
    if (path.endsWith('/sync') && method === 'POST') {
      const body = bodyJson(init);
      if (body.preview) {
        return jsonResponse({
          preview_url: 'demo://subtitle-preview/' + path.split('/')[2],
          offset: Number(body.offset_seconds || 0),
          scale: Number(body.scale || 1),
        });
      }
      return blobResponse(demoSvg('Subtitle sync output'));
    }
    if (path.endsWith('/edit') && method === 'POST') {
      return blobResponse(demoSvg('Edited subtitles'));
    }
    if (path.includes('/burn') && method === 'POST') {
      return jsonResponse({ output_filename: 'subtitle-burn-demo.mp4', status: 'completed' });
    }
    if (path.includes('/mux') && method === 'POST') {
      return blobResponse(demoSvg('Muxed subtitles'));
    }
  }
  if (path.startsWith('/thumbnails/')) {
    if (path.includes('/set') && method === 'GET') {
      const id = path.split('/')[2];
      const thumb = encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="#111827"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#f8fafc" font-family="Arial" font-size="28">FrameFlux demo thumbnail</text></svg>',
      );
      return jsonResponse({
        thumbnails: [
          'data:image/svg+xml;charset=UTF-8,' + thumb,
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

  const backendUrl = getDemoBackendUrl();
  if (backendUrl) {
    const requestUrl = parseUrl(input);
    const method = (init?.method || 'GET').toUpperCase();
    const isMediaUpload =
      method === 'POST' &&
      (requestUrl.pathname === '/media/upload' ||
        requestUrl.pathname === '/media/upload-multiple' ||
        /^\/media\/resumable\/[^/]+\/(?:chunk\/\d+|retry)$/.test(requestUrl.pathname));
    const timeoutMs = isMediaUpload ? DEMO_UPLOAD_TIMEOUT_MS : DEMO_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(backendUrl + requestUrl.pathname + requestUrl.search, {
        ...init,
        method,
        headers: init?.headers,
        credentials: 'include',
        signal: controller.signal,
      });
      if (response.ok) {
        demoBackendFallbackWarningShown = false;
        return response;
      }
      if (!demoBackendFallbackWarningShown) {
        console.warn(
          `FrameFlux demo API returned HTTP ${response.status}; using the browser-only simulation for this request.`,
        );
        demoBackendFallbackWarningShown = true;
      }
    } catch (error) {
      if (!demoBackendFallbackWarningShown) {
        console.warn(
          'FrameFlux demo API could not be reached; using the browser-only simulation for this request.',
          error,
        );
        demoBackendFallbackWarningShown = true;
      }
    } finally {
      window.clearTimeout(timer);
    }
  }

  return localDemoFetch(input, init);
}


export async function resetDemoWorkspace(): Promise<void> {
  resetDemoState();

  const backendUrl = getDemoBackendUrl();
  if (!DEMO_ENABLED || !backendUrl) return;

  try {
    await fetch(backendUrl + '/demo/reset', {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
    });
  } catch {
    // The browser-local workspace has already been reset; the remote demo API
    // remains optional and will be reset on its next explicit successful call.
  }
}

export { DEMO_ENABLED, getDemoUser, resetDemoState };
