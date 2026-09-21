import { test, expect } from '@playwright/test';
import { API, createUser, expectBlob, uploadMedia } from './qa-helpers';

test('WMA audio conversion', async ({ request }) => {
  const auth = await createUser(request, 'wma-conversion');
  const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

  const response = await request.post(API + '/audio/' + media.id + '/convert', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: {
      format: 'wma',
      bitrate: '192k',
      sample_rate: 44100,
      channels: 2,
      quality: 'medium',
    },
  });

  await expectBlob(response, 'audio/');
});
