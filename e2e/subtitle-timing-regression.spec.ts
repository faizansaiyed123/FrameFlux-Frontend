import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { API, createUser, uploadMedia, expectBlob } from './qa-helpers';

test('subtitle timing controls apply a non-default offset and scale', async ({ request }) => {
  const user = await createUser(request, 'subtitle-timing');
  const video = await uploadMedia(request, user.token, path.resolve('e2e/fixtures/sample.mp4'));
  const subtitlePath = path.resolve('e2e/fixtures/timing-test.srt');
  fs.writeFileSync(subtitlePath, '1\n00:00:00,500 --> 00:00:01,500\nTiming Control Test\n');
  const upload = await request.post(`${API}/subtitles/upload`, {
    headers: { Authorization: `Bearer ${user.token}` },
    multipart: { file: { name: 'timing-test.srt', mimeType: 'application/x-subrip', buffer: fs.readFileSync(subtitlePath) } },
  });
  expect(upload.ok(), await upload.text()).toBeTruthy();
  const subtitle = await upload.json();
  const synced = await request.post(`${API}/subtitles/${video.id}/sync`, {
    headers: { Authorization: `Bearer ${user.token}` },
    data: { subtitle_path: subtitle.filename, offset_seconds: 0.5, scale: 1.5, preview: false },
  });
  const body = await expectBlob(synced, 'video/mp4');
  expect(body.length).toBeGreaterThan(1000);
});

test('subtitle timing controls are exposed in the real media tools UI', async ({ page, request }) => {
  const user = await createUser(request, 'subtitle-ui');
  const video = await uploadMedia(request, user.token, path.resolve('e2e/fixtures/sample.mp4'));
  await page.goto('/auth/login');
  await page.getByRole('textbox', { name: /email/i }).fill(user.email);
  await page.getByRole('textbox', { name: /password/i }).fill(user.password);
  await page.getByRole('button', { name: /log in|login|sign in/i }).click();
  await page.waitForURL(/\/app\/dashboard/);
  await page.goto(`/app/dashboard/media/${video.id}`);
  await page.getByRole('tab', { name: /tools/i }).click();
  const card = page.locator('div[class*="border"]').filter({ has: page.getByText('Subtitles', { exact: true }) }).first();
  await card.getByRole('combobox').click();
  await page.getByRole('option', { name: /Sync Subtitles/i }).click();
  await expect(card.getByLabel('Timing Offset')).toBeVisible();
  await expect(card.getByLabel('Timing Scale')).toBeVisible();
});