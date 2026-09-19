import { test, expect } from '@playwright/test';
import { API, createUser, uploadMedia } from './qa-helpers';

test('Fade in audio', async ({ request }) => {
  const auth = await createUser(request, 'fade-in-audio');
  const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

  const response = await request.post(API + '/audio/' + media.id + '/edit', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: {
      operation: 'fade',
      fade_in: 0.25,
    },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  expect(body.output_filename).toMatch(/\.mp3$/i);
});
