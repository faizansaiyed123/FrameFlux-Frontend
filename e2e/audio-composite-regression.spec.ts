import { test, expect } from '@playwright/test';
import { API, createUser, uploadMedia, expectBlob } from './qa-helpers';

test('video audio control and sync composite operations work end-to-end', async ({ request }) => {
  const auth = await createUser(request, 'audio-composite-regression');
  const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
  const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
  const headers = { Authorization: 'Bearer ' + auth.token };

  let response = await request.post(API + `/audio/${video.id}/volume?volume=0.75`, { headers });
  expect(response.ok(), await response.text()).toBeTruthy();
  expect((await response.json()).output_filename).toBeTruthy();

  response = await request.post(API + `/audio/${video.id}/replace-audio?audio_path=${encodeURIComponent(audio.stored_filename)}&fade_in=0.2&fade_out=0.2`, { headers });
  expect(response.ok(), await response.text()).toBeTruthy();

  response = await request.post(API + `/audio/${video.id}/sync-audio`, {
    headers,
    data: {
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
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();

  for (const output_format of ['mp4', 'webm']) {
    const a = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    const result = await request.post(API + `/audio/${a.id}/to-video`, {
      headers,
      data: { background_color: '#202020', resolution: '320x240', fps: 24, duration: 1, output_format },
    });
    await expectBlob(result, 'video/');
  }
});
