import { test, expect } from '@playwright/test';
import { API, createUser, expectBlob, uploadMedia } from './qa-helpers';

test('AIFF audio extraction', async ({ request }) => {
  const auth = await createUser(request, 'aiff-extraction');
  const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

  const response = await request.get(
    API + '/audio/' + media.id + '/extract?format=aiff&bitrate=192k&sample_rate=44100&channels=2',
    { headers: { Authorization: 'Bearer ' + auth.token } }
  );

  const body = await expectBlob(response, 'audio/');
  expect(body.length).toBeGreaterThan(100);
});
