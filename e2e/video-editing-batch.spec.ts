import { test, expect } from '@playwright/test';
import { API, createUser, expectBlob, uploadMedia, waitForMedia } from './qa-helpers';

test.describe.configure({ timeout: 120_000 });

async function assertProcessed(request: Parameters<typeof createUser>[0], token: string, mediaId: string) {
  const status = await waitForMedia(request, token, mediaId, 60_000);
  expect(status.status, JSON.stringify(status)).toBe('completed');
  expect(status.processed_filename || status.output_filename, JSON.stringify(status)).toBeTruthy();
  const processed = await request.get(API + '/media/' + mediaId + '/processed', {
    headers: { Authorization: 'Bearer ' + token },
  });
  await expectBlob(processed, 'video/');
}

test.describe('04 Video Editing batch', () => {
  test('Delete selected section', async ({ request }) => {
    const auth = await createUser(request, 'video-delete-section');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

    const response = await request.post(API + '/media/' + media.id + '/clips/delete', {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: { clips: [{ start: 0.5, end: 1.0 }] },
    });

    expect(response.ok(), await response.text()).toBeTruthy();
    const body = await response.json();
    expect(body.operation).toBe('delete_clips');
    await assertProcessed(request, auth.token, media.id);
  });

  test('Keep selected section', async ({ request }) => {
    const auth = await createUser(request, 'video-keep-section');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

    const response = await request.post(API + '/media/' + media.id + '/clips/keep', {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: { clips: [{ start: 0.5, end: 1.0 }] },
    });

    expect(response.ok(), await response.text()).toBeTruthy();
    const body = await response.json();
    expect(body.operation).toBe('keep_clips');
    await assertProcessed(request, auth.token, media.id);
  });

  test('Reorder clips', async ({ request }) => {
    const auth = await createUser(request, 'video-reorder-clips');
    const first = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const second = await uploadMedia(request, auth.token, 'e2e/fixtures/sample2.mp4');

    const response = await request.post(API + '/media/' + first.id + '/clips/reorder', {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: { media_ids: [first.id, second.id] },
    });

    expect(response.ok(), await response.text()).toBeTruthy();
    const body = await response.json();
    expect(body.operation).toBe('reorder');
    await assertProcessed(request, auth.token, first.id);
  });
});
