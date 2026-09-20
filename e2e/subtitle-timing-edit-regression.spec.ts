import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { API, createUser, expectBlob, uploadMedia, setAuthenticatedBrowser, uploadViaMediaDialog } from './qa-helpers';

test.describe.configure({ timeout: 120_000 });

test('edit subtitle timing updates only the selected SRT cue', async ({ request }) => {
  const user = await createUser(request, 'subtitle-timing-edit');
  const video = await uploadMedia(request, user.token, 'e2e/fixtures/sample.mp4');
  const source = Buffer.from('1\n00:00:00,500 --> 00:00:01,000\nKeep this text\n\n2\n00:00:01,200 --> 00:00:01,600\nSecond cue\n');
  const upload = await request.post(API + '/subtitles/upload', {
    headers: { Authorization: 'Bearer ' + user.token },
    multipart: {
      file: {
        name: 'timing-edit.srt',
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
      operation: 'update_timing',
      entry_index: 0,
      start: 1.25,
      end: 2.75,
    },
  });
  const body = await expectBlob(response, 'application/x-subrip');
  const text = body.toString('utf8');
  expect(text).toContain('00:00:01,250 --> 00:00:02,750');
  expect(text).toContain('Keep this text');
  expect(text).toContain('00:00:01,200 --> 00:00:01,600');
});

test('a real user can edit subtitle timing from the media Tools UI and download the result', async ({ page, request }) => {
  const user = await createUser(request, 'subtitle-timing-edit-ui');
  await setAuthenticatedBrowser(page, user.email, user.password);
  await page.goto('/app/dashboard/media');

  await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample.mp4'), 'sample.mp4');
  await page.getByRole('tab', { name: 'Tools', exact: true }).click();

  const subtitlesCard = page.getByRole('heading', { name: 'Subtitles', exact: true }).locator('xpath=../..');
  await subtitlesCard.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Edit Subtitle Timing', exact: true }).click();

  await subtitlesCard.locator('input[type=file]').setInputFiles({
    name: 'ui-timing-edit.srt',
    mimeType: 'application/x-subrip',
    buffer: Buffer.from('1\n00:00:00,500 --> 00:00:01,000\nOriginal timing\n'),
  });

  await expect(subtitlesCard.getByText('ui-timing-edit.srt', { exact: true })).toBeVisible();
  await subtitlesCard.getByLabel('Subtitle Entry').fill('1');
  await subtitlesCard.getByLabel('Edit Start Time').fill('1.25');
  await subtitlesCard.getByLabel('Edit End Time').fill('2.75');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    subtitlesCard.getByRole('button', { name: 'Update Timing & Download', exact: true }).click(),
  ]);

  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const downloaded = fs.readFileSync(downloadPath!, 'utf8');
  expect(downloaded).toContain('00:00:01,250 --> 00:00:02,750');
  expect(downloaded).toContain('Original timing');
});
