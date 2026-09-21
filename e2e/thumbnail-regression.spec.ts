import { test, expect } from '@playwright/test';
import { API, createUser, uploadMedia, expectBlob } from './qa-helpers';

test('thumbnail generation supports single, set, select and crop', async ({ request }) => {
  const auth = await createUser(request, 'thumbnail-regression');
  const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
  const headers = { Authorization: 'Bearer ' + auth.token };

  await expectBlob(await request.get(API + `/thumbnails/${media.id}?timestamp=0.5&width=160&height=120&fmt=jpg`, { headers }), 'image/');

  const set = await request.get(API + `/thumbnails/${media.id}/set?interval=0.5&width=160&fmt=png`, { headers });
  expect(set.ok(), await set.text()).toBeTruthy();
  expect((await set.json()).thumbnails.length).toBeGreaterThan(0);

  const selected = await request.post(API + `/thumbnails/${media.id}/select?timestamp=0.5&width=160`, {
    headers,
  });
  expect(selected.ok(), await selected.text()).toBeTruthy();
  expect(await selected.json()).toHaveProperty('selected');

  const crop = await request.post(API + `/thumbnails/${media.id}/crop?timestamp=0.5&x=0&y=0&width=80&height=80`, {
    headers,
  });
  expect(crop.ok(), await crop.text()).toBeTruthy();
  expect(await crop.json()).toHaveProperty('path');
});
