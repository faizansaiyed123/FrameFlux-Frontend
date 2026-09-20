import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { API, createUser, expectBlob, uploadMedia, setAuthenticatedBrowser, uploadViaMediaDialog } from './qa-helpers';

test.describe.configure({ timeout: 120_000 });

test('split subtitle entry creates two cues with contiguous timing', async ({ request }) => {
  const user = await createUser(request, 'subtitle-split-entry');
  const video = await uploadMedia(request, user.token, 'e2e/fixtures/sample.mp4');
  const source = Buffer.from('1\n00:00:00,500 --> 00:00:02,000\nSplit me\n');
  const upload = await request.post(API + '/subtitles/upload', {
    headers: { Authorization: 'Bearer ' + user.token },
    multipart: {
      file: {
        name: 'split-entry.srt',
        mimeType: 'application/x-subrip',
        buffer: source,
      },
    },
  });
  expect(upload.ok(), await upload.text()).toBeTruthy();
  const subtitle = await upload.json();

  const response = await request.post(API + '/subtitles/' + video.id + '/edit', {
    headers: { Authorization: 'Bearer ' + user.token },
    data: {
      subtitle_path: subtitle.filename,
      operation: 'split_entry',
      entry_index: 0,
      start: 1.25,
    },
  });
  const body = await expectBlob(response, 'application/x-subrip');
  const text = body.toString('utf8');
  expect(text).toContain('1\n00:00:00,500 --> 00:00:01,250\nSplit me');
  expect(text).toContain('2\n00:00:01,250 --> 00:00:02,000\nSplit me');
});

test('a real user can split a subtitle entry from the media Tools UI and download it', async ({ page, request }) => {
  const user = await createUser(request, 'subtitle-split-entry-ui');
  await setAuthenticatedBrowser(page, user.email, user.password);
  await page.goto('/app/dashboard/media');

  await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample.mp4'), 'sample.mp4');
  await page.getByRole('tab', { name: 'Tools', exact: true }).click();

  const subtitlesCard = page.getByRole('heading', { name: 'Subtitles', exact: true }).locator('xpath=../..');
  await subtitlesCard.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Split Subtitle Entry', exact: true }).click();

  await subtitlesCard.locator('input[type=file]').setInputFiles({
    name: 'ui-split-entry.srt',
    mimeType: 'application/x-subrip',
    buffer: Buffer.from('1\n00:00:00,500 --> 00:00:02,000\nUI split\n'),
  });

  await expect(subtitlesCard.getByText('ui-split-entry.srt', { exact: true })).toBeVisible();
  await subtitlesCard.getByLabel('Split Subtitle Entry').fill('1');
  await subtitlesCard.getByLabel('Split Time').fill('1.25');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    subtitlesCard.getByRole('button', { name: 'Split Entry & Download', exact: true }).click(),
  ]);

  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const downloaded = fs.readFileSync(downloadPath!, 'utf8');
  expect(downloaded).toContain('00:00:00,500 --> 00:00:01,250');
  expect(downloaded).toContain('00:00:01,250 --> 00:00:02,000');
});
