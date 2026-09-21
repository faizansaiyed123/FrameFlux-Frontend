import { test, expect, APIRequestContext } from '@playwright/test';
import { API, createUser, expectBlob, uploadMedia, waitForMedia } from './qa-helpers';

test.describe.configure({ timeout: 120_000 });

async function processedVideo(request: APIRequestContext, token: string, mediaId: string) {
  const status = await waitForMedia(request, token, mediaId, 60_000);
  expect(status.status, JSON.stringify(status)).toBe('completed');
  expect(status.processed_filename || status.output_filename, JSON.stringify(status)).toBeTruthy();
  await expectBlob(
    await request.get(API + '/media/' + mediaId + '/processed', {
      headers: { Authorization: 'Bearer ' + token },
    }),
    'video/',
  );
}

async function expectOutputFilename(response: Awaited<ReturnType<APIRequestContext['post']>>) {
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  expect(body.output_filename).toBeTruthy();
  return body.output_filename as string;
}

async function syncVideo(
  request: APIRequestContext,
  token: string,
  videoId: string,
  audioPath: string,
  data: Record<string, unknown>,
) {
  const response = await request.post(API + '/audio/' + videoId + '/sync-audio', {
    headers: { Authorization: 'Bearer ' + token },
    data: {
      audio_path: audioPath,
      output_format: 'mp4',
      ...data,
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  expect(body.output_filename).toMatch(/\.mp4$/i);
  expect(body.media_id).toBe(videoId);

  const processed = await request.get(API + '/media/' + videoId + '/processed', {
    headers: { Authorization: 'Bearer ' + token },
  });
  await expectBlob(processed, 'video/');
}

test.describe('05 Video Audio Control batch', () => {
  test('Remove audio', async ({ request }) => {
    const auth = await createUser(request, 'audio-remove');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

    const response = await request.post(API + '/media/' + video.id + '/convert', {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: {
        format: 'mp4',
        width: 320,
        height: 240,
        fps: 24,
        quality: 5,
        video_codec: 'h264',
        audio_codec: 'none',
      },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    await processedVideo(request, auth.token, video.id);
  });

  test('Add audio', async ({ request }) => {
    const auth = await createUser(request, 'audio-add');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

    await syncVideo(request, auth.token, video.id, audio.stored_filename, {
      mix: true,
      mix_volume: 0.5,
      audio_offset: 0,
      volume: 1,
    });
  });

  test('Replace audio', async ({ request }) => {
    const auth = await createUser(request, 'audio-replace');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

    const response = await request.post(
      API + '/audio/' + video.id + '/replace-audio?audio_path=' + encodeURIComponent(audio.stored_filename),
      { headers: { Authorization: 'Bearer ' + auth.token } },
    );
    await expectOutputFilename(response);
  });

  test('Mute original audio', async ({ request }) => {
    const auth = await createUser(request, 'audio-mute');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

    await syncVideo(request, auth.token, video.id, audio.stored_filename, {
      mix: false,
      volume: 1,
    });
  });

  test('Mix original + new audio', async ({ request }) => {
    const auth = await createUser(request, 'audio-mix');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

    await syncVideo(request, auth.token, video.id, audio.stored_filename, {
      mix: true,
      mix_volume: 0.5,
      volume: 1,
    });
  });

  test('Audio delay', async ({ request }) => {
    const auth = await createUser(request, 'audio-delay');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

    await syncVideo(request, auth.token, video.id, audio.stored_filename, {
      audio_offset: 0.25,
      volume: 1,
      mix: false,
    });
  });

  test('Audio offset', async ({ request }) => {
    const auth = await createUser(request, 'audio-offset');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

    await syncVideo(request, auth.token, video.id, audio.stored_filename, {
      audio_offset: -0.25,
      volume: 1,
      mix: false,
    });
  });

  test('Fade audio in', async ({ request }) => {
    const auth = await createUser(request, 'audio-fade-in');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

    const response = await request.post(
      API + '/audio/' + video.id + '/replace-audio?audio_path=' +
        encodeURIComponent(audio.stored_filename) + '&fade_in=0.25',
      { headers: { Authorization: 'Bearer ' + auth.token } },
    );
    await expectOutputFilename(response);
  });

  test('Fade audio out', async ({ request }) => {
    const auth = await createUser(request, 'audio-fade-out');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

    const response = await request.post(
      API + '/audio/' + video.id + '/replace-audio?audio_path=' +
        encodeURIComponent(audio.stored_filename) + '&fade_out=0.25',
      { headers: { Authorization: 'Bearer ' + auth.token } },
    );
    await expectOutputFilename(response);
  });
});
