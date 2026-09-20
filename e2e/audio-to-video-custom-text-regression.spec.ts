import { test, expect } from '@playwright/test';
import { API, createUser, uploadMedia } from './qa-helpers';

test('Add custom text', async ({ request }) => {
  const auth = await createUser(request, 'audio-to-video-custom-text');
  const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
  const response = await request.post(API + '/audio/' + media.id + '/to-video', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: { text: 'Hello FrameFlux', output_format: 'mp4', resolution: '320x240', fps: 24 },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.body();
  expect(body.byteLength).toBeGreaterThan(0);
  expect(response.headers()['content-type']).toMatch(/video\/mp4/i);
});
