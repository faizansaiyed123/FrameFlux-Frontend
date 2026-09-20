import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { API, createUser, uploadMedia, expectBlob } from './qa-helpers';

test('subtitle timing offset supports moving subtitle timestamps', async ({ request }) => {
  const user = await createUser(request, 'subtitle-offset');
  const video = await uploadMedia(request, user.token, path.resolve('e2e/fixtures/sample.mp4'));
  const subtitlePath = path.resolve('e2e/fixtures/offset-test.srt');
  fs.writeFileSync(subtitlePath, '1\n00:00:00,500 --> 00:00:01,000\nOffset Test\n');
  const upload = await request.post(`${API}/subtitles/upload`, {
    headers: { Authorization: `Bearer ${user.token}` },
    multipart: { file: { name: 'offset-test.srt', mimeType: 'application/x-subrip', buffer: fs.readFileSync(subtitlePath) } },
  });
  expect(upload.ok(), await upload.text()).toBeTruthy();
  const subtitle = await upload.json();
  for (const offset of [0.5, -0.25]) {
    const response = await request.post(`${API}/subtitles/${video.id}/sync`, {
      headers: { Authorization: `Bearer ${user.token}` },
      data: { subtitle_path: subtitle.filename, offset_seconds: offset, scale: 1, preview: false },
    });
    const body = await expectBlob(response, 'video/mp4');
    expect(body.length).toBeGreaterThan(1000);
  }
});