import { test, expect } from '@playwright/test';
import { API, createUser, uploadMedia } from './qa-helpers';

test('Favorites: add, list, and remove a media favorite', async ({ request }) => {
  const auth = await createUser(request, 'favorite-regression');
  const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
  const headers = { Authorization: 'Bearer ' + auth.token };

  const added = await request.post(API + '/favorites', {
    headers,
    data: { media_id: media.id },
  });
  expect(added.ok(), await added.text()).toBeTruthy();
  expect((await added.json()).media_id).toBe(media.id);

  const listed = await request.get(API + '/favorites', { headers });
  expect(listed.ok(), await listed.text()).toBeTruthy();
  expect((await listed.json()).some((item: any) => item.media_id === media.id)).toBeTruthy();

  const removed = await request.delete(API + '/favorites/' + media.id, { headers });
  expect([200, 204]).toContain(removed.status());

  const after = await request.get(API + '/favorites', { headers });
  expect(after.ok(), await after.text()).toBeTruthy();
  expect((await after.json()).some((item: any) => item.media_id === media.id)).toBeFalsy();
});
