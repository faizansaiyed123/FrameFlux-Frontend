import { test } from '@playwright/test';
import { API, createUser, uploadMedia, expectBlob } from './qa-helpers';

test('GIF generation supports declared FPS and quality presets', async ({ request }) => {
  const auth = await createUser(request, 'gif-regression');
  const headers = { Authorization: 'Bearer ' + auth.token };

  for (const fps of [10, 12, 15, 20, 24, 30]) {
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const response = await request.post(
      API + `/gif/${media.id}/generate?start=0&duration=1&width=160&fps=${fps}&quality=10`,
      { headers },
    );
    await expectBlob(response, 'image/gif');
  }

  for (const quality of [5, 10, 15, 20]) {
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const response = await request.post(
      API + `/gif/${media.id}/generate?start=0&duration=1&width=160&fps=10&quality=${quality}`,
      { headers },
    );
    await expectBlob(response, 'image/gif');
  }
});
