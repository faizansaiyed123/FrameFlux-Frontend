import { test } from '@playwright/test';
import { API, createUser, uploadMedia, expectBlob } from './qa-helpers';

test('audio extraction supports every declared output format and selected section', async ({ request }) => {
  const auth = await createUser(request, 'audio-extract-regression');
  const formats = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'opus', 'aiff'];

  for (const format of formats) {
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const rate = format === 'opus' ? 48000 : 44100;
    const headers = { Authorization: 'Bearer ' + auth.token };

    const full = await request.get(
      API + `/audio/${media.id}/extract?format=${format}&bitrate=192k&sample_rate=${rate}&channels=2`,
      { headers }
    );
    await expectBlob(full, 'audio/');

    const selected = await request.get(
      API + `/audio/${media.id}/extract?format=${format}&start=0.2&end=1.2&sample_rate=${rate}&channels=2`,
      { headers }
    );
    await expectBlob(selected, 'audio/');
  }
});
