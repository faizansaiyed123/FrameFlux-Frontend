import { test, expect } from '@playwright/test';
import { API, createUser, uploadMedia, expectBlob } from './qa-helpers';

test('audio conversion supports every declared output format including WMA', async ({ request }) => {
  const auth = await createUser(request, 'audio-convert-regression');
  const formats = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'opus', 'aiff', 'wma'];

  for (const format of formats) {
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    const rate = format === 'opus' ? 48000 : 44100;
    const response = await request.post(API + `/audio/${media.id}/convert`, {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: { format, bitrate: '192k', sample_rate: rate, channels: 2, quality: 'medium' },
    });
    expect(response.ok(), `${format}: ${await response.text()}`).toBeTruthy();
    await expectBlob(response, 'audio/');
  }
});
