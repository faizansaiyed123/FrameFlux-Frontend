import { test, expect, APIRequestContext } from '@playwright/test';
import path from 'node:path';
import { API, createUser, expectBlob, setAuthenticatedBrowser, uploadMedia } from './qa-helpers';

test.describe.configure({ timeout: 120_000 });

async function syncVideo(
  request: APIRequestContext,
  token: string,
  videoId: string,
  audioPath: string,
  data: Record<string, unknown> = {},
) {
  const response = await request.post(API + '/audio/' + videoId + '/sync-audio', {
    headers: { Authorization: 'Bearer ' + token },
    data: {
      audio_path: audioPath,
      output_format: 'mp4',
      volume: 1,
      mix: false,
      mix_volume: 0.5,
      ...data,
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  expect(body.output_filename).toBeTruthy();
  const output = await request.get(API + '/media/' + videoId + '/download?download_type=processed', {
    headers: { Authorization: 'Bearer ' + token },
  });
  await expectBlob(output, 'video/');
}

test.describe('06 Video + External Audio Sync batch', () => {
  test('Upload video', async ({ request }) => {
    const auth = await createUser(request, 'sync-upload-video');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    expect(media.media_type).toBe('video');
  });

  test('Separate audio file', async ({ request }) => {
    const auth = await createUser(request, 'sync-upload-audio');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    expect(media.media_type).toBe('audio');
  });

  test('Add external audio', async ({ request }) => {
    const auth = await createUser(request, 'sync-add');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    await syncVideo(request, auth.token, video.id, audio.stored_filename, { mix: true, mix_volume: 0.5 });
  });

  test('Replace original audio', async ({ request }) => {
    const auth = await createUser(request, 'sync-replace');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    await syncVideo(request, auth.token, video.id, audio.stored_filename, { mix: false });
  });

  test('Keep original audio', async ({ request }) => {
    const auth = await createUser(request, 'sync-keep');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    await syncVideo(request, auth.token, video.id, audio.stored_filename, { mix: true, mix_volume: 1 });
  });

  test('Mix original + external audio', async ({ request }) => {
    const auth = await createUser(request, 'sync-mix');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    await syncVideo(request, auth.token, video.id, audio.stored_filename, { mix: true, mix_volume: 0.5 });
  });

  test('Mute original audio', async ({ request }) => {
    const auth = await createUser(request, 'sync-mute');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    await syncVideo(request, auth.token, video.id, audio.stored_filename, { mix: false });
  });

  test('Match audio duration to video', async ({ request }) => {
    const auth = await createUser(request, 'sync-audio-duration');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    await syncVideo(request, auth.token, video.id, audio.stored_filename, { audio_duration: 2 });
  });

  test('Match video duration to audio', async ({ request }) => {
    const auth = await createUser(request, 'sync-video-duration');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample-long.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    await syncVideo(request, auth.token, video.id, audio.stored_filename, { video_duration: 3 });
  });

  test('Trim audio automatically', async ({ request }) => {
    const auth = await createUser(request, 'sync-trim-audio');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    await syncVideo(request, auth.token, video.id, audio.stored_filename, { audio_duration: 1 });
  });

  test('Trim video automatically', async ({ request }) => {
    const auth = await createUser(request, 'sync-trim-video');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample-long.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    await syncVideo(request, auth.token, video.id, audio.stored_filename, { video_duration: 1 });
  });

  test('Choose audio starting position', async ({ request }) => {
    const auth = await createUser(request, 'sync-start-position');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    await syncVideo(request, auth.token, video.id, audio.stored_filename, { audio_offset: 0.125 });
  });

  test('Audio delay adjustment', async ({ request }) => {
    const auth = await createUser(request, 'sync-delay');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    await syncVideo(request, auth.token, video.id, audio.stored_filename, { audio_offset: 0.25 });
  });

  test('Audio offset adjustment', async ({ request }) => {
    const auth = await createUser(request, 'sync-offset');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    await syncVideo(request, auth.token, video.id, audio.stored_filename, { audio_offset: -0.25 });
  });

  test('Fine/millisecond timing adjustment', async ({ request }) => {
    const auth = await createUser(request, 'sync-fine');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    await syncVideo(request, auth.token, video.id, audio.stored_filename, { audio_offset: 0.015 });
  });

  test('Preview synchronization', async ({ page, request }) => {
    const auth = await createUser(request, 'sync-preview');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/media/' + video.id);
    await page.getByRole('tab', { name: 'Processing', exact: true }).click();
    await page.getByRole('button', { name: /^Audio$/i }).click();
    await page.getByRole('button', { name: /Sync External Audio/i }).click();
    await page.getByLabel('External Audio File (stored filename)', { exact: true }).fill(audio.stored_filename);
    await page.getByRole('button', { name: /Preview \(5s\)/i }).click();
    await expect(page.getByRole('heading', { name: 'Sync Preview (5s)' })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('video')).toBeVisible();
  });

  test('Export synchronized video', async ({ request }) => {
    const auth = await createUser(request, 'sync-export');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    await syncVideo(request, auth.token, video.id, audio.stored_filename, { audio_offset: 0.1 });
  });
});
