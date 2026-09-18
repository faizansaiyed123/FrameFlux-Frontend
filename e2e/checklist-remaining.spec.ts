import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { API, createUser, expectBlob, uploadMedia } from './qa-helpers';

test.describe.configure({ timeout: 180_000 });

test.describe('12 Remaining checklist coverage', () => {
  test('multiple media upload, subtitle upload and batch upload/status', async ({ request }) => {
    const auth = await createUser(request, 'remaining-upload');

    const form = new FormData();
    form.append('files', new Blob([fs.readFileSync('e2e/fixtures/sample.mp4')], { type: 'video/mp4' }), 'sample.mp4');
    form.append('files', new Blob([fs.readFileSync('e2e/fixtures/sample.mp3')], { type: 'audio/mpeg' }), 'sample.mp3');
    form.append('files', new Blob([fs.readFileSync('e2e/fixtures/sample.png')], { type: 'image/png' }), 'sample.png');
    const multipleRaw = await fetch(API + '/media/upload-multiple', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + auth.token },
      body: form,
    });
    expect(multipleRaw.ok, await multipleRaw.text()).toBeTruthy();
    expect((await multipleRaw.json()).length).toBe(3);

    const subtitle = await request.post(API + '/subtitles/upload', {
      headers: { Authorization: 'Bearer ' + auth.token },
      multipart: {
        file: {
          name: 'remaining.srt',
          mimeType: 'application/x-subrip',
          buffer: Buffer.from('1\n00:00:00,000 --> 00:00:01,000\nFrameFlux'),
        },
      },
    });
    expect(subtitle.ok(), await subtitle.text()).toBeTruthy();

    const batchUpload = await request.post(API + '/batch/upload', {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: { files: ['sample.mp4', 'sample2.mp4'] },
    });
    expect(batchUpload.ok(), await batchUpload.text()).toBeTruthy();
    const batchBody = await batchUpload.json();
    expect(batchBody.total_files).toBe(2);

    const batchStatus = await request.get(API + '/batch/' + batchBody.job_id + '/status', {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    expect(batchStatus.ok(), await batchStatus.text()).toBeTruthy();
  });

  test('video compression with target-size control completes', async ({ request }) => {
    const auth = await createUser(request, 'remaining-compress');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const response = await request.post(API + '/media/' + media.id + '/compress', {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: { format: 'mp4', quality: 24, video_bitrate: '500k', target_size_mb: 1 },
    });
    expect(response.ok(), await response.text()).toBeTruthy();

    let status: any = null;
    for (let i = 0; i < 90; i++) {
      const r = await request.get(API + '/media/' + media.id + '/status', {
        headers: { Authorization: 'Bearer ' + auth.token },
      });
      expect(r.ok(), await r.text()).toBeTruthy();
      status = await r.json();
      if (status.status === 'completed' || status.status === 'failed') break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    expect(status.status, JSON.stringify(status)).toBe('completed');
    expect(status.processed_filename).toBeTruthy();
  });

  test('media versions create/list/get/download/restore/delete', async ({ request }) => {
    const auth = await createUser(request, 'remaining-versions');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

    const created = await request.post(API + '/media/' + media.id + '/versions', {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: {
        stored_filename: media.stored_filename,
        original_filename: media.original_filename,
        file_size: media.file_size,
        mime_type: media.mime_type,
        duration: media.duration,
        width: media.width,
        height: media.height,
        label: 'QA Original Version',
      },
    });
    expect(created.ok(), await created.text()).toBeTruthy();
    const version = await created.json();

    const list = await request.get(API + '/media/' + media.id + '/versions', {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    expect(list.ok(), await list.text()).toBeTruthy();
    expect((await list.json()).some((v: any) => v.id === version.id)).toBeTruthy();

    const detail = await request.get(API + '/media/' + media.id + '/versions/' + version.id, {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    expect(detail.ok(), await detail.text()).toBeTruthy();

    await expectBlob(
      await request.get(API + '/media/' + media.id + '/versions/' + version.id + '/download', {
        headers: { Authorization: 'Bearer ' + auth.token },
      }),
      'video/'
    );

    const restore = await request.post(API + '/media/' + media.id + '/versions/' + version.id + '/restore', {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    expect(restore.ok(), await restore.text()).toBeTruthy();

    const deleted = await request.delete(API + '/media/' + media.id + '/versions/' + version.id, {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    expect([200, 204]).toContain(deleted.status());
  });

  test('audio-to-video supports background image, artist, watermark and both formats', async ({ request }) => {
    const auth = await createUser(request, 'remaining-a2v');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    const image = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.png');

    for (const output_format of ['mp4', 'webm']) {
      const response = await request.post(API + '/audio/' + audio.id + '/to-video', {
        headers: { Authorization: 'Bearer ' + auth.token },
        data: {
          background_image: image.stored_filename,
          background_color: '#101010',
          title: 'FrameFlux',
          artist: 'QA Artist',
          text: 'Remaining Coverage',
          watermark: image.stored_filename,
          show_waveform: true,
          visualizer_style: 'circle',
          resolution: '320x240',
          fps: 24,
          aspect_ratio: '4:3',
          duration: 1,
          output_format,
        },
      });
      await expectBlob(response, 'video/');
    }
  });

  test('batch download accepts multiple media items', async ({ request }) => {
    const auth = await createUser(request, 'remaining-batch-download');
    const a = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const b = await uploadMedia(request, auth.token, 'e2e/fixtures/sample2.mp4');

    const response = await request.post(API + '/media/batch-download', {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: { media_ids: [a.id, b.id] },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    const body = await response.json();
    expect(body.total).toBe(2);
    expect(body.jobs).toHaveLength(2);
  });

  test('project processing handles multiple project media', async ({ request }) => {
    const auth = await createUser(request, 'remaining-project-process');
    const projectResponse = await request.post(API + '/projects', {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: { name: 'QA Multi Project' },
    });
    expect(projectResponse.ok(), await projectResponse.text()).toBeTruthy();
    const project = await projectResponse.json();

    const a = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const b = await uploadMedia(request, auth.token, 'e2e/fixtures/sample2.mp4');
    for (const media of [a, b]) {
      const attached = await request.patch(API + '/media/' + media.id + '/project/' + project.id, {
        headers: { Authorization: 'Bearer ' + auth.token },
      });
      expect(attached.ok(), await attached.text()).toBeTruthy();
    }

    const process = await request.post(API + '/projects/' + project.id + '/process', {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    expect(process.ok(), await process.text()).toBeTruthy();
    expect((await process.json()).jobs).toHaveLength(2);
  });

  test('notifications accept every declared event class', async ({ request }) => {
    const auth = await createUser(request, 'remaining-notifications');
    const events = [
      'upload_completed',
      'processing_completed',
      'processing_failed',
      'batch_completed',
      'storage_warning',
      'share_link_created',
      'share_link_expired',
    ];
    for (const event of events) {
      const response = await request.post(API + '/notifications', {
        headers: { Authorization: 'Bearer ' + auth.token },
        data: { event, message: 'QA ' + event },
      });
      expect(response.ok(), event + ': ' + await response.text()).toBeTruthy();
      const body = await response.json();
      expect(body.event).toBe(event);
    }
  });

  test('sharing player works with allowed referer and expiration modes', async ({ request }) => {
    const auth = await createUser(request, 'remaining-sharing-player');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

    for (const expires_in_hours of [1, 24, 168, undefined]) {
      const data: any = {
        media_id: media.id,
        password: 'SharePass123!',
        allow_download: expires_in_hours !== 1,
        allowed_domains: 'example.com',
      };
      if (expires_in_hours !== undefined) data.expires_in_hours = expires_in_hours;

      const created = await request.post(API + '/sharing', {
        headers: { Authorization: 'Bearer ' + auth.token },
        data,
      });
      expect(created.ok(), await created.text()).toBeTruthy();
      const share = await created.json();

      const player = await request.get(API + '/sharing/player/' + share.token, {
        headers: { Referer: 'https://example.com/embed' },
      });
      expect(player.ok(), await player.text()).toBeTruthy();
      expect((await player.text()).toLowerCase()).toContain('<video');
    }
  });

  test('quick-actions catalog includes every declared video/audio action', async ({ request }) => {
    const auth = await createUser(request, 'remaining-actions');
    const response = await request.get(API + '/quick-actions', {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    const body = await response.json();

    const expectedVideo = [
      'convert','compress','extract-audio','generate-thumbnail','generate-preview','trim','cut',
      'crop','resize','rotate','remove-audio','replace-audio','add-subtitles','create-gif',
      'add-external-audio','sync-audio','share','download'
    ];
    const expectedAudio = [
      'convert','compress','trim','cut','split','merge','change-volume','normalize',
      'fade-in','fade-out','convert-to-video','download','share'
    ];

    for (const id of expectedVideo) expect(body.video.some((x: any) => x.id === id)).toBeTruthy();
    for (const id of expectedAudio) expect(body.audio.some((x: any) => x.id === id)).toBeTruthy();
  });

  test('video conversion accepts remaining resolution presets and custom aspect ratio', async ({ request }) => {
    const auth = await createUser(request, 'remaining-video-options');
    for (const resolution of ['720p', '1080p', '1440p', '2160p']) {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      const response = await request.post(API + '/media/' + media.id + '/convert', {
        headers: { Authorization: 'Bearer ' + auth.token },
        data: {
          format: 'mp4',
          resolution,
          fps: 24,
          quality: 5,
          video_codec: 'h264',
          audio_codec: 'aac',
          aspect_ratio: '2.35:1',
        },
      });
      expect(response.ok(), resolution + ': ' + await response.text()).toBeTruthy();
    }
  });
});
