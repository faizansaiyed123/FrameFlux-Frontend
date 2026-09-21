import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { API, createUser, uploadMedia, expectBlob } from './qa-helpers';

test('move subtitles forward and backward changes subtitle timestamps', async ({ request }) => {
  const user = await createUser(request, 'subtitle-direction');
  const video = await uploadMedia(request, user.token, path.resolve('e2e/fixtures/sample.mp4'));
  const subtitlePath = path.resolve('e2e/fixtures/direction-test.srt');
  fs.writeFileSync(subtitlePath, '1\n00:00:00,500 --> 00:00:01,000\nDirection Test\n');

  const upload = await request.post(`${API}/subtitles/upload`, {
    headers: { Authorization: `Bearer ${user.token}` },
    multipart: {
      file: {
        name: 'direction-test.srt',
        mimeType: 'application/x-subrip',
        buffer: fs.readFileSync(subtitlePath),
      },
    },
  });
  expect(upload.ok(), await upload.text()).toBeTruthy();
  const subtitle = await upload.json();

  for (const [label, offset, expectedStart] of [['forward', 0.5, 1.0], ['backward', -0.25, 0.25]] as const) {
    const response = await request.post(`${API}/subtitles/${video.id}/sync`, {
      headers: { Authorization: `Bearer ${user.token}` },
      data: { subtitle_path: subtitle.filename, offset_seconds: offset, scale: 1, preview: false },
    });
    const body = await expectBlob(response, 'video/mp4');
    expect(body.length, label).toBeGreaterThan(1000);

    const output = path.resolve('e2e/fixtures', `direction-${label}.mp4`);
    fs.writeFileSync(output, body);
    const probe = JSON.parse(execFileSync('ffprobe', [
      '-v', 'error',
      '-show_packets',
      '-select_streams', 's:0',
      '-show_entries', 'packet=pts_time',
      '-of', 'json',
      output,
    ], { encoding: 'utf8' }));
    const firstPts = Number(probe.packets?.[0]?.pts_time);
    expect(firstPts).toBeCloseTo(expectedStart, 2);
  }
});