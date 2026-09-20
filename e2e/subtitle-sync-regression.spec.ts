import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { API, createUser, uploadMedia, expectBlob } from './qa-helpers';

test('subtitle timeline synchronization uses uploaded subtitle timestamps', async ({ request }) => {
  const user = await createUser(request, 'subtitle-sync');
  const video = await uploadMedia(request, user.token, path.resolve('e2e/fixtures/sample.mp4'));
  const subtitlePath = path.resolve('e2e/fixtures/sync-test.srt');
  fs.writeFileSync(subtitlePath, '1\n00:00:00,500 --> 00:00:01,500\nHello FrameFlux Sync\n');
  const subtitle = await request.post(`${API}/subtitles/upload`, {
    headers: { Authorization: `Bearer ${user.token}` },
    multipart: { file: { name: 'sync-test.srt', mimeType: 'application/x-subrip', buffer: fs.readFileSync(subtitlePath) } },
  });
  expect(subtitle.ok(), await subtitle.text()).toBeTruthy();
  const subtitleBody = await subtitle.json();
  const synced = await request.post(`${API}/subtitles/${video.id}/sync`, {
    headers: { Authorization: `Bearer ${user.token}` },
    data: { subtitle_path: subtitleBody.filename, offset_seconds: 0.25, scale: 1.0, preview: true },
  });
  const body = await expectBlob(synced, 'video/mp4');
  expect(body.length).toBeGreaterThan(1000);
});