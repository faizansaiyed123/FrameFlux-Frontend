import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { API, createUser, expectBlob, uploadMedia, waitForMedia, mimeFor } from './qa-helpers';

test.describe.configure({ timeout: 180_000 });

async function postJson(request: any, token: string, endpoint: string, data: any) {
  const res = await request.post(`${API}${endpoint}`, {
    headers: { Authorization: 'Bearer ' + token },
    data,
  });
  expect(res.ok(), `${endpoint}: ${await res.text()}`).toBeTruthy();
  return res;
}

async function queuedMediaOperation(request: any, token: string, mediaId: string, endpoint: string, data: any = {}) {
  const res = await postJson(request, token, `${endpoint}`, data);
  const body = await res.json();
  expect(body.status || body.operation || body.output_filename).toBeTruthy();
  if (body.job_id || body.status === 'queued' || body.status === 'processing' || body.status === 'pending') {
    const status = await waitForMedia(request, token, mediaId);
    expect(status.status, JSON.stringify(status)).toBe('completed');
  }
  return body;
}

test.describe('01 Auth, upload, resumable upload and media lifecycle', () => {
  test('signup, duplicate signup, login, me, profile update, password change, logout and protected-route rejection', async ({ request }) => {
    const auth = await createUser(request, 'auth-matrix');

    const duplicate = await request.post(`${API}/auth/signup`, {
      data: { email: auth.email, password: auth.password, full_name: 'Duplicate' },
    });
    expect(duplicate.status()).toBe(409);

    const me = await request.get(`${API}/auth/me`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(me.ok()).toBeTruthy();

    const profile = await request.patch(`${API}/auth/me`, {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: { full_name: 'Updated QA Name', avatar_url: 'https://example.com/avatar.png', preferences: '{"theme":"dark"}' },
    });
    expect(profile.ok(), await profile.text()).toBeTruthy();

    const change = await request.post(`${API}/auth/change-password`, {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: { current_password: auth.password, new_password: 'NewTestPass123!' },
    });
    expect(change.ok(), await change.text()).toBeTruthy();

    const newLogin = await request.post(`${API}/auth/login`, {
      data: { email: auth.email, password: 'NewTestPass123!' },
    });
    expect(newLogin.ok()).toBeTruthy();

    const forgotKnown = await request.post(`${API}/auth/forgot-password`, { data: { email: auth.email } });
    expect(forgotKnown.ok()).toBeTruthy();

    const forgotUnknown = await request.post(`${API}/auth/forgot-password`, { data: { email: 'does-not-exist@example.com' } });
    expect(forgotUnknown.ok()).toBeTruthy();

    const logout = await request.post(`${API}/auth/logout`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(logout.ok(), await logout.text()).toBeTruthy();

    const afterLogout = await request.get(`${API}/auth/me`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(afterLogout.status()).toBe(401);
  });

  test('normal upload, original download, media info and delete', async ({ request }) => {
    const auth = await createUser(request, 'media-lifecycle');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

    const detail = await request.get(`${API}/media/${media.id}`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(detail.ok()).toBeTruthy();

    const original = await request.get(`${API}/media/${media.id}/download?download_type=original`, {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    await expectBlob(original, 'video/');

    const info = await request.get(`${API}/media-info/${media.id}`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(info.ok(), await info.text()).toBeTruthy();
    const infoBody = await info.json();
    for (const key of ['file_name', 'file_size', 'duration', 'resolution', 'fps', 'video_codec', 'audio_codec', 'bitrate', 'audio_channels', 'sample_rate', 'container_format', 'audio_tracks', 'subtitle_tracks', 'available_streams']) {
      expect(infoBody).toHaveProperty(key);
    }

    const usage = await request.get(`${API}/storage/usage`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(usage.ok()).toBeTruthy();

    const del = await request.delete(`${API}/media/${media.id}`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect([200, 204]).toContain(del.status());

    const missing = await request.get(`${API}/media/${media.id}`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(missing.status()).toBe(404);
  });

  test('resumable init, pause, resume, chunk upload, retry and finalize', async ({ request }) => {
    const auth = await createUser(request, 'resumable');
    const file = fs.readFileSync('e2e/fixtures/sample.mp4');
    const chunkSize = Math.max(1024, Math.ceil(file.length / 4));

    const init = await postJson(request, auth.token, '/media/resumable/init', {
      original_filename: 'resumable.mp4',
      total_size: file.length,
      chunk_size: chunkSize,
    });
    const uploadId = (await init.json()).upload_id;

    const pause = await postJson(request, auth.token, `/media/resumable/${uploadId}/pause`, {});
    expect((await pause.json()).detail).toBe('paused');
    const resume = await postJson(request, auth.token, `/media/resumable/${uploadId}/resume`, {});
    expect((await resume.json()).detail).toBe('resumed');

    const totalChunks = Math.ceil(file.length / chunkSize);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(file.length, start + chunkSize);
      const buf = file.subarray(start, end);
      const response = await request.post(`${API}/media/resumable/${uploadId}/chunk/${i}`, {
        headers: { Authorization: 'Bearer ' + auth.token },
        multipart: { file: { name: 'chunk.part', mimeType: 'video/mp4', buffer: buf } },
      });
      expect(response.ok(), await response.text()).toBeTruthy();
      if (i === 0) {
        const retry = await request.post(`${API}/media/resumable/${uploadId}/retry/0?index=0`, {
          headers: { Authorization: 'Bearer ' + auth.token },
          multipart: { file: { name: 'chunk.part', mimeType: 'video/mp4', buffer: buf } },
        });
        expect([200, 201]).toContain(retry.status());
      }
    }

    const finalize = await postJson(request, auth.token, `/media/resumable/${uploadId}/finalize`, {});
    expect((await finalize.json()).mime_type).toBe('video/mp4');
  });

  test('resumable cancel removes the resumable session', async ({ request }) => {
    const auth = await createUser(request, 'resumable-cancel');
    const init = await postJson(request, auth.token, '/media/resumable/init', {
      original_filename: 'cancel.mp4',
      total_size: fs.statSync('e2e/fixtures/sample.mp4').size,
      chunk_size: 4096,
    });
    const uploadId = (await init.json()).upload_id;
    const cancel = await request.delete(`${API}/media/resumable/${uploadId}`, {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    expect([200, 204]).toContain(cancel.status());
  });
});

test.describe('02 Video conversion and editing matrix', () => {
  const formats = ['mp4', 'webm', 'mkv', 'mov', 'avi', 'flv', 'mpeg', 'ts', 'm4v', '3gp'];

  test('convert video through every declared output format', async ({ request }) => {
    const auth = await createUser(request, 'video-format');
    for (const format of formats) {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      const res = await request.post(`${API}/media/${media.id}/convert`, {
        headers: { Authorization: 'Bearer ' + auth.token },
        data: {
          format,
          width: 160,
          height: 120,
          fps: 24,
          quality: 5,
          video_codec: 'h264',
          audio_codec: 'aac',
        },
      });
      expect(res.ok(), `${format}: ${await res.text()}`).toBeTruthy();
      const status = await waitForMedia(request, auth.token, media.id);
      expect(status.status, `${format}: ${JSON.stringify(status)}`).toBe('completed');
    }
  });

  test('trim, cut and extract selected video section', async ({ request }) => {
    const auth = await createUser(request, 'video-edit');
    for (const operation of ['trim', 'cut', 'extract']) {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      await queuedMediaOperation(request, auth.token, media.id, `/media/${media.id}/edit`, { operation, start: 0.25, end: 1.25 });
    }
  });

  test('split, keep clips, delete clips, merge, reorder and append', async ({ request }) => {
    const auth = await createUser(request, 'video-clips');
    const a = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const b = await uploadMedia(request, auth.token, 'e2e/fixtures/sample2.mp4');

    await queuedMediaOperation(request, auth.token, a.id, `/media/${a.id}/split`, { split_points: [1] });
    await queuedMediaOperation(request, auth.token, a.id, `/media/${a.id}/clips/keep`, { clips: [{ start: 0, end: 1 }] });
    await queuedMediaOperation(request, auth.token, a.id, `/media/${a.id}/clips/delete`, { clips: [{ start: 1, end: 1.5 }] });
    await queuedMediaOperation(request, auth.token, a.id, `/media/${a.id}/merge`, { media_ids: [a.id, b.id] });
    await queuedMediaOperation(request, auth.token, a.id, `/media/${a.id}/clips/reorder`, { media_ids: [b.id, a.id] });
    await queuedMediaOperation(request, auth.token, a.id, `/media/${a.id}/clips/append`, { media_ids: [b.id] });
  });

  for (const operation of ['crop', 'resize', 'rotate', 'flip', 'flop', 'speed']) {
    test(`transform: ${operation}`, async ({ request }) => {
      const auth = await createUser(request, 'video-transform');
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      const data: any =
        operation === 'crop' ? { operation, width: 160, height: 120, x: 0, y: 0 } :
        operation === 'resize' ? { operation, width: 160, height: 120 } :
        operation === 'rotate' ? { operation, angle: 90 } :
        operation === 'speed' ? { operation, speed: 1.5 } :
        { operation };
      await queuedMediaOperation(request, auth.token, media.id, `/media/${media.id}/transform`, data);
    });
  }

  test('freeze frame and all overlay variants', async ({ request }) => {
    const auth = await createUser(request, 'video-overlay');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    await queuedMediaOperation(request, auth.token, media.id, `/media/${media.id}/freeze`, { timestamp: 1, duration: 1 });
    await queuedMediaOperation(request, auth.token, media.id, `/media/${media.id}/overlay`, { operation: 'text', text: 'FrameFlux', x: 10, y: 10, font_size: 24, opacity: 1 });
    const image = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.png');
    await queuedMediaOperation(request, auth.token, media.id, `/media/${media.id}/overlay`, { operation: 'image', image_filename: image.stored_filename, x: 10, y: 10, font_size: 24, opacity: 0.8 });
    await queuedMediaOperation(request, auth.token, media.id, `/media/${media.id}/overlay`, { operation: 'watermark', image_filename: image.stored_filename, x: 15, y: 15, font_size: 24, opacity: 0.5 });
    await queuedMediaOperation(request, auth.token, media.id, `/media/${media.id}/overlay`, {
      operation: 'multi_overlay',
      overlays: [
        { operation: 'text', text: 'A', x: 10, y: 10, font_size: 20, opacity: 1 },
        { operation: 'image', image_filename: image.stored_filename, x: 40, y: 40, font_size: 20, opacity: 0.5 },
      ],
    });
  });

  test('video adjustment, filter, fade and reverse endpoints', async ({ request }) => {
    const auth = await createUser(request, 'video-effects');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    for (const [endpoint, data] of [
      [`/video/${media.id}/adjust`, { brightness: 0.1, contrast: 1, saturation: 1, gamma: 1, hue: 0 }],
      [`/video/${media.id}/filter`, { operation: 'sharpen', intensity: 1 }],
      [`/video/${media.id}/filter`, { operation: 'blur', intensity: 1 }],
      [`/video/${media.id}/fade`, { fade_type: 'in', duration: 0.5, start_time: 0 }],
      [`/video/${media.id}/reverse`, { output_format: 'mp4' }],
    ] as const) {
      const res = await postJson(request, auth.token, endpoint, data);
      expect(await res.json()).toHaveProperty('output_filename');
    }
  });
});

test.describe('03b Image processing and video setting permutations', () => {
  test('image conversion across JPG/PNG/WebP/GIF/BMP/TIFF plus compression', async ({ request }) => {
    const auth = await createUser(request, 'image');
    const image = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.png');
    for (const format of ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff']) {
      const response = await request.post(`${API}/images/${image.id}/convert`, {
        headers: { Authorization: 'Bearer ' + auth.token },
        data: { format, width: 160, height: 120, quality: 80 },
      });
      expect(response.ok(), format + ': ' + await response.text()).toBeTruthy();
      await expectBlob(response, 'image/');
    }
    const compressed = await request.post(`${API}/images/${image.id}/compress?quality=70&max_width=160&max_height=120`, {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    expect(compressed.ok(), await compressed.text()).toBeTruthy();
    expect(await compressed.json()).toHaveProperty('output_filename');
  });

  test('video conversion permutations cover resolution, FPS, bitrate, quality, codecs and aspect ratios', async ({ request }) => {
    const auth = await createUser(request, 'video-options');
    const resolutions = [
      { width: 160, height: 90, resolution: '144p' },
      { width: 160, height: 120, resolution: '240p' },
      { width: 160, height: 120, resolution: '360p' },
      { width: 160, height: 120, resolution: '480p' },
    ];
    const fpsValues = [24, 25, 30, 50, 60];
    const aspectRatios = ['16:9', '9:16', '4:3', '1:1'];
    const codecs = ['h264', 'h265', 'vp8', 'vp9', 'av1'];

    for (const resSpec of resolutions) {
      for (const fps of fpsValues) {
        const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
        const response = await request.post(`${API}/media/${media.id}/convert`, {
          headers: { Authorization: 'Bearer ' + auth.token },
          data: {
            format: 'mp4', width: resSpec.width, height: resSpec.height, resolution: resSpec.resolution,
            fps, video_bitrate: '500k', audio_bitrate: '128k', video_codec: 'h264', audio_codec: 'aac',
            aspect_ratio: aspectRatios[fps % aspectRatios.length], quality: 5,
          },
        });
        expect(response.ok(), fps + ': ' + await response.text()).toBeTruthy();
      }
    }

    for (const codec of codecs) {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      const response = await request.post(`${API}/media/${media.id}/convert`, {
        headers: { Authorization: 'Bearer ' + auth.token },
        data: { format: 'mp4', width: 160, height: 120, fps: 24, video_codec: codec, audio_codec: 'aac', quality: 5 },
      });
      expect(response.ok(), codec + ': ' + await response.text()).toBeTruthy();
    }

    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const converted = await postJson(request, auth.token, `/media/${media.id}/convert`, {
      format: 'mp4', width: 160, height: 120, fps: 24, video_bitrate: '500k', audio_bitrate: '128k',
      quality: 5, video_codec: 'h264', audio_codec: 'aac', aspect_ratio: '16:9',
    });
    expect(converted).toHaveProperty('output_filename');
    const status = await waitForMedia(request, auth.token, media.id);
    expect(status.status).toBe('completed');
    const processed = await request.get(`${API}/media/${media.id}/download?download_type=processed`, {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    await expectBlob(processed, 'video/');
  });
});

test.describe('03 Audio processing matrix', () => {
  const audioFormats = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'opus', 'aiff'];

  test('extract complete and selected audio in every declared format', async ({ request }) => {
    const auth = await createUser(request, 'audio-extract');
    for (const format of audioFormats) {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      await expectBlob(await request.get(`${API}/audio/${media.id}/extract?format=${format}&bitrate=192k&sample_rate=${format === 'opus' ? 48000 : 44100}&channels=2`, {
        headers: { Authorization: 'Bearer ' + auth.token },
      }), 'audio/');
      await expectBlob(await request.get(`${API}/audio/${media.id}/extract?format=${format}&start=0.2&end=1.2&channels=2`, {
        headers: { Authorization: 'Bearer ' + auth.token },
      }), 'audio/');
    }
  });

  test('audio conversion in every declared format', async ({ request }) => {
    const auth = await createUser(request, 'audio-convert');
    for (const format of [...audioFormats, 'wma']) {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
      const res = await request.post(`${API}/audio/${media.id}/convert`, {
        headers: { Authorization: 'Bearer ' + auth.token, 'Content-Type': 'application/json' },
        data: { format, bitrate: '192k', sample_rate: format === 'opus' ? 48000 : 44100, channels: 2, quality: 'medium' },
      });
      expect(res.ok(), `${format}: ${await res.text()}`).toBeTruthy();
      await expectBlob(res, 'audio/');
    }
  });

  for (const operation of ['trim', 'cut', 'split', 'merge', 'speed', 'normalize', 'fade', 'silence']) {
    test(`audio edit operation: ${operation}`, async ({ request }) => {
      const auth = await createUser(request, 'audio-edit');
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
      const data: any =
        ['trim', 'cut', 'split'].includes(operation) ? { operation, start: 0.2, end: 1.2 } :
        operation === 'merge' ? { operation, target_files: [media.stored_filename] } :
        operation === 'speed' ? { operation, speed: 1.25 } :
        operation === 'fade' ? { operation, fade_in: 0.25, fade_out: 0.25 } :
        operation === 'silence' ? { operation, silence_duration: 0.5 } :
        { operation };
      const res = await postJson(request, auth.token, `/audio/${media.id}/edit`, data);
      expect(await res.json()).toHaveProperty('output_filename');
    });
  }

  test('volume adjustment, replace audio, audio sync and audio-to-video MP4/WebM', async ({ request }) => {
    const auth = await createUser(request, 'audio-composite');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

    let res = await postJson(request, auth.token, `/audio/${video.id}/volume?volume=0.75&fade_in=0.2&fade_out=0.2`, {});
    expect(await res.json()).toHaveProperty('output_filename');

    res = await postJson(request, auth.token, `/audio/${video.id}/replace-audio?audio_path=${encodeURIComponent(audio.stored_filename)}&fade_in=0.2&fade_out=0.2`, {});
    expect(await res.json()).toHaveProperty('output_filename');

    res = await postJson(request, auth.token, `/audio/${video.id}/sync-audio`, {
      audio_path: audio.stored_filename,
      audio_offset: 0.1,
      video_duration: 2,
      audio_duration: 2,
      fade_in: 0.1,
      fade_out: 0.1,
      volume: 1,
      mix: true,
      mix_volume: 0.5,
      output_format: 'mp4',
    });
    expect(await res.json()).toHaveProperty('output_filename');

    for (const output_format of ['mp4', 'webm']) {
      res = await postJson(request, auth.token, `/audio/${audio.id}/to-video`, {
        background_color: '#202020',
        title: 'FrameFlux',
        text: 'QA',
        show_waveform: true,
        visualizer_style: 'bars',
        resolution: '320x240',
        fps: 24,
        aspect_ratio: '4:3',
        duration: 2,
        output_format,
      });
      await expectBlob(res, 'video/');
    }
  });
});

test.describe('04 Thumbnails, GIF, preview and subtitles', () => {
  test('thumbnail generation: single, set, select and crop', async ({ request }) => {
    const auth = await createUser(request, 'thumbs');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

    await expectBlob(await request.get(`${API}/thumbnails/${media.id}?timestamp=0.5&width=160&height=120&fmt=jpg`, { headers: { Authorization: 'Bearer ' + auth.token } }), 'image/');
    const set = await request.get(`${API}/thumbnails/${media.id}/set?interval=0.5&width=160&fmt=png`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(set.ok(), await set.text()).toBeTruthy();
    expect((await set.json()).thumbnails.length).toBeGreaterThan(0);

    const selected = await postJson(request, auth.token, `/thumbnails/${media.id}/select`, { timestamp: 0.5, width: 160 });
    expect(await selected.json()).toHaveProperty('selected');

    const crop = await postJson(request, auth.token, `/thumbnails/${media.id}/crop`, { timestamp: 0.5, x: 0, y: 0, width: 80, height: 80 });
    expect(await crop.json()).toHaveProperty('path');
  });

  test('GIF generate, preview and extract frames', async ({ request }) => {
    const auth = await createUser(request, 'gif');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

    const gifRes = await request.post(`${API}/gif/${media.id}/generate?start=0&duration=1&width=160&fps=10&quality=10`, { headers: { Authorization: 'Bearer ' + auth.token } });
    await expectBlob(gifRes, 'image/gif');
    const content = gifRes.headers()['content-disposition'] || '';
    expect(content).toContain('.gif');

    const filenameMatch = content.match(/filename="?([^";]+)"?/i);
    expect(filenameMatch?.[1]).toBeTruthy();
    const gifName = filenameMatch![1];

    await expectBlob(await request.get(`${API}/gif/${gifName}/preview`, { headers: { Authorization: 'Bearer ' + auth.token } }), 'image/gif');
    const frames = await request.get(`${API}/gif/${gifName}/frames`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(frames.ok(), await frames.text()).toBeTruthy();
    expect((await frames.json()).frames.length).toBeGreaterThan(0);
  });

  test('video preview, GIF preview and thumbnail preview', async ({ request }) => {
    const auth = await createUser(request, 'preview');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

    await expectBlob(await request.get(`${API}/preview/${media.id}/video?duration=1&start=0&width=160&fps=10`, { headers: { Authorization: 'Bearer ' + auth.token } }), 'video/');
    await expectBlob(await request.get(`${API}/preview/${media.id}/gif?duration=1&start=0&width=160&fps=10&quality=10`, { headers: { Authorization: 'Bearer ' + auth.token } }), 'image/gif');
    await expectBlob(await request.get(`${API}/preview/${media.id}/thumbnail?timestamp=0.5&width=160&height=120&fmt=webp`, { headers: { Authorization: 'Bearer ' + auth.token } }), 'image/');
  });

  test('subtitle SRT/VTT/ASS upload, track listing, burn and mux', async ({ request }) => {
    const auth = await createUser(request, 'subs');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

    const subtitleNames = ['sample.srt', 'sample.vtt', 'sample.ass'];
    for (const name of subtitleNames) {
      const file = fs.readFileSync(path.join('e2e/fixtures', name));
      const upload = await request.post(`${API}/subtitles/upload`, {
        headers: { Authorization: 'Bearer ' + auth.token },
        multipart: { file: { name, mimeType: mimeFor(name), buffer: file } },
      });
      expect(upload.ok(), await upload.text()).toBeTruthy();
      const subtitlePath = (await upload.json()).filename;

      const burn = await request.post(`${API}/subtitles/${media.id}/burn?subtitle_path=${encodeURIComponent(subtitlePath)}&font_size=24&font_color=white&background_color=black@0.5&position=bottom&alignment=2`, {
        headers: { Authorization: 'Bearer ' + auth.token },
      });
      expect(burn.ok(), `${name}: ${await burn.text()}`).toBeTruthy();
      expect(await burn.json()).toHaveProperty('version_number');

      const mux = await request.post(`${API}/subtitles/${media.id}/mux?subtitle_path=${encodeURIComponent(subtitlePath)}&language=en&is_default=true&is_forced=false`, {
        headers: { Authorization: 'Bearer ' + auth.token },
      });
      await expectBlob(mux, 'video/');
    }

    const tracks = await request.get(`${API}/subtitles/${media.id}/tracks`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(tracks.ok(), await tracks.text()).toBeTruthy();
  });

  test('subtitle sync preview and export', async ({ request }) => {
    const auth = await createUser(request, 'subs-sync');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

    const preview = await request.post(`${API}/subtitles/${media.id}/sync`, {
      headers: { Authorization: 'Bearer ' + auth.token, 'Content-Type': 'application/json' },
      data: { offset_seconds: 0.05, scale: 1.0, preview: true },
    });
    expect(preview.ok(), await preview.text()).toBeTruthy();
    expect(await preview.json()).toHaveProperty('preview_url');

    const exportResponse = await request.post(`${API}/subtitles/${media.id}/sync`, {
      headers: { Authorization: 'Bearer ' + auth.token, 'Content-Type': 'application/json' },
      data: { offset_seconds: 0.05, scale: 1.0, preview: false },
    });
    expect(exportResponse.ok(), await exportResponse.text()).toBeTruthy();
    await expectBlob(exportResponse, 'video/');
  });
});

test.describe('05 Batch, presets, workflows and projects', () => {
  test('batch processing UI contract: every declared operation is accepted by the batch API', async ({ request }) => {
    const auth = await createUser(request, 'batch');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const operations = ['convert','compress','extract_audio','generate_thumbnail','generate_preview','trim','cut','crop','resize','rotate','remove_audio','replace_audio','add_subtitles','create_gif'];
    for (const operation of operations) {
      const res = await postJson(request, auth.token, '/batch/process', {
        media_ids: [video.id],
        operation,
        options: operation === 'replace_audio' ? { audio_path: 'sample.mp3' } : {},
      });
      expect(res.status(), `${operation}: ${await res.text()}`).toBeLessThan(500);
    }
  });

  test('presets CRUD and built-in preset read-only protection', async ({ request }) => {
    const auth = await createUser(request, 'presets');
    const list = await request.get(`${API}/presets`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(list.ok()).toBeTruthy();

    const builtins = (await list.json()).filter((p: any) => p.is_builtin);
    const custom = await postJson(request, auth.token, '/presets', {
      name: 'QA Preset',
      description: 'Exhaustive test preset',
      settings: { format: 'mp4', resolution: '1080p', fps: 30, video_codec: 'h264', aspect_ratio_preset: '16:9' },
    });
    const preset = await custom.json();

    const update = await request.patch(`${API}/presets/${preset.id}`, {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: { name: 'QA Preset Renamed', settings: { format: 'webm', fps: 60 } },
    });
    expect(update.ok(), await update.text()).toBeTruthy();

    if (builtins[0]) {
      const delBuiltin = await request.delete(`${API}/presets/${builtins[0].id}`, { headers: { Authorization: 'Bearer ' + auth.token } });
      expect(delBuiltin.status()).not.toBe(204);
    }

    const del = await request.delete(`${API}/presets/${preset.id}`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect([200,204]).toContain(del.status());
  });

  test('workflow create, read, update, delete and run', async ({ request }) => {
    const auth = await createUser(request, 'workflows');
    const created = await postJson(request, auth.token, '/workflows', {
      name: 'QA Workflow',
      description: 'Convert then compress',
      operations: [
        { type: 'convert', params: { format: 'mp4', resolution: '360p' } },
        { type: 'compress', params: { quality: 5 } },
      ],
    });
    const workflow = await created.json();

    const get = await request.get(`${API}/workflows/${workflow.id}`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(get.ok()).toBeTruthy();

    const update = await request.patch(`${API}/workflows/${workflow.id}`, {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: { name: 'QA Workflow Renamed' },
    });
    expect(update.ok(), await update.text()).toBeTruthy();

    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const run = await request.post(`${API}/workflows/${workflow.id}/run?media_id=${media.id}`, {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    expect(run.ok(), await run.text()).toBeTruthy();

    const del = await request.delete(`${API}/workflows/${workflow.id}`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect([200,204]).toContain(del.status());
  });

  test('projects, folders, media attachment, status and project history/workflows', async ({ request }) => {
    const auth = await createUser(request, 'projects');
    const created = await postJson(request, auth.token, '/projects', { name: 'QA Project', description: 'Project test' });
    const project = await created.json();

    const update = await request.patch(`${API}/projects/${project.id}`, {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: { name: 'QA Project Renamed' },
    });
    expect(update.ok()).toBeTruthy();

    const folder = await request.post(`${API}/projects/${project.id}/folders?name=Assets`, {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    expect(folder.ok(), await folder.text()).toBeTruthy();

    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const attach = await request.patch(`${API}/media/${media.id}/project/${project.id}`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(attach.ok(), await attach.text()).toBeTruthy();

    for (const endpoint of [
      `/projects/${project.id}`,
      `/projects/${project.id}/media`,
      `/projects/${project.id}/folders`,
      `/projects/${project.id}/workflows`,
      `/projects/${project.id}/history`,
      `/projects/${project.id}/status`,
    ]) {
      const response = await request.get(`${API}${endpoint}`, { headers: { Authorization: 'Bearer ' + auth.token } });
      expect(response.ok(), `${endpoint}: ${await response.text()}`).toBeTruthy();
    }

    const del = await request.delete(`${API}/projects/${project.id}`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect([200,204]).toContain(del.status());
  });
});

test.describe('06 Favorites, search, notifications, sharing, history, comparison, storage and jobs', () => {
  test('favorites add/list/remove', async ({ request }) => {
    const auth = await createUser(request, 'favorites');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const add = await postJson(request, auth.token, '/favorites', { media_id: media.id });
    expect(add.ok()).toBeTruthy();
    const list = await request.get(`${API}/favorites`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(list.ok()).toBeTruthy();
    expect((await list.json()).some((x: any) => x.media_id === media.id)).toBeTruthy();
    const remove = await request.delete(`${API}/favorites/${media.id}`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect([200,204]).toContain(remove.status());
  });

  test('search across filename/type/folder/tag/size/duration/status filters', async ({ request }) => {
    const auth = await createUser(request, 'search');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const params = [
      '?q=sample',
      '?media_type=video',
      '?min_size=1',
      '?max_size=999999999',
      '?min_duration=0',
      '?max_duration=60',
      '?processing_status=pending',
      '?folder=QA',
      '?tag=demo',
    ];
    for (const query of params) {
      const res = await request.get(`${API}/search/media${query}`, { headers: { Authorization: 'Bearer ' + auth.token } });
      expect(res.ok(), `${query}: ${await res.text()}`).toBeTruthy();
    }
    expect(media.id).toBeTruthy();
  });

  test('notifications create/list/read', async ({ request }) => {
    const auth = await createUser(request, 'notifications');
    const created = await postJson(request, auth.token, '/notifications', { event: 'qa_test', message: 'QA notification' });
    const notification = await created.json();
    expect(notification.is_read).toBeFalsy();

    const list = await request.get(`${API}/notifications`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(list.ok()).toBeTruthy();

    const read = await request.post(`${API}/notifications/${notification.id}/read`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(read.ok(), await read.text()).toBeTruthy();
  });

  test('sharing create/list/embed/disable/delete with password and expiration modes', async ({ request }) => {
    const auth = await createUser(request, 'sharing');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

    for (const expires_in_hours of [1, 24, 168, undefined]) {
      const data: any = { media_id: media.id, password: 'SharePass123!', allow_download: expires_in_hours !== 1, allowed_domains: 'example.com' };
      if (expires_in_hours !== undefined) data.expires_in_hours = expires_in_hours;
      const created = await postJson(request, auth.token, '/sharing', data);
      const share = await created.json();

      const get = await request.get(`${API}/sharing/${share.token}`);
      expect(get.ok(), await get.text()).toBeTruthy();

      const embed = await request.get(`${API}/sharing/embed/${share.token}`, { headers: { Authorization: 'Bearer ' + auth.token } });
      expect(embed.ok(), await embed.text()).toBeTruthy();
      expect(await embed.json()).toHaveProperty('embed_code');

      const disable = await request.post(`${API}/sharing/${share.id}/disable`, { headers: { Authorization: 'Bearer ' + auth.token } });
      expect(disable.ok(), await disable.text()).toBeTruthy();

      const del = await request.delete(`${API}/sharing/${share.id}`, { headers: { Authorization: 'Bearer ' + auth.token } });
      expect([200,204]).toContain(del.status());
    }
  });

  test('processing history create/list', async ({ request }) => {
    const auth = await createUser(request, 'history');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const created = await request.post(`${API}/history?media_id=${media.id}&operation=qa&status=completed`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(created.ok(), await created.text()).toBeTruthy();
    const list = await request.get(`${API}/history`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(list.ok()).toBeTruthy();
  });

  test('media comparison returns all comparison fields', async ({ request }) => {
    const auth = await createUser(request, 'compare');
    const a = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const b = await uploadMedia(request, auth.token, 'e2e/fixtures/sample2.mp4');
    const res = await request.get(`${API}/comparisons/${a.id}/${b.id}`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    for (const key of ['media_a_id','media_b_id','size_diff','duration_diff','resolution_match','video_codec_match','audio_codec_match','storage_saved']) {
      expect(body).toHaveProperty(key);
    }
  });

  test('dashboard overview, recent processing, jobs list and quick actions catalog', async ({ request }) => {
    const auth = await createUser(request, 'dashboard');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

    for (const endpoint of ['/dashboard/overview', '/dashboard/recent-processing', '/jobs', '/quick-actions', '/storage/usage/by-type', '/storage/usage/by-folder', '/ui/preferences']) {
      const response = await request.get(`${API}${endpoint}`, { headers: { Authorization: 'Bearer ' + auth.token } });
      expect(response.ok(), `${endpoint}: ${await response.text()}`).toBeTruthy();
    }

    const prefs = await postJson(request, auth.token, '/ui/preferences/theme', { value: 'dark' });
    expect(prefs.ok()).toBeTruthy();

    const actions = await request.get(`${API}/quick-actions`, { headers: { Authorization: 'Bearer ' + auth.token } });
    const actionBody = await actions.json();
    expect(actionBody.video.length + actionBody.audio.length + (actionBody.image?.length || 0)).toBeGreaterThan(0);

    const firstAction = actionBody.video[0] || actionBody.audio[0] || actionBody.image[0];
    const execution = await request.post(`${API}/quick-actions/${media.id}/execute?action_id=${encodeURIComponent(firstAction.id)}`, {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    expect(execution.status()).toBeLessThan(500);
  });
});
