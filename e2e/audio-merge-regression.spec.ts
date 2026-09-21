import { test, expect } from '@playwright/test';
import { API, createUser, uploadMedia } from './qa-helpers';

test('Merge audio', async ({ request }) => {
  const auth = await createUser(request, 'merge-audio');
  const first = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
  const second = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

  const response = await request.post(API + '/audio/' + first.id + '/edit', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: {
      operation: 'merge',
      target_files: [first.stored_filename, second.stored_filename],
    },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  expect(body.output_filename).toBeTruthy();
  expect(body.output_filename).toMatch(/\.mp3$/i);
});
