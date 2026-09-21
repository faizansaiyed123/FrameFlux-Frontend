import { test } from '@playwright/test';
import { API, createUser, uploadMedia, expectBlob } from './qa-helpers';

test('video preview supports video, GIF and thumbnail variants', async ({ request }) => {
  const auth = await createUser(request, 'preview-regression');
  const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
  const headers = { Authorization: 'Bearer ' + auth.token };

  await expectBlob(await request.get(API + `/preview/${media.id}/video?duration=1&start=0&width=160&fps=10`, { headers }), 'video/');
  await expectBlob(await request.get(API + `/preview/${media.id}/gif?duration=1&start=0&width=160&fps=10&quality=10`, { headers }), 'image/gif');
  await expectBlob(await request.get(API + `/preview/${media.id}/thumbnail?timestamp=0.5&width=160&height=120&fmt=webp`, { headers }), 'image/');
});
