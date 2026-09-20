import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { API, createUser, expectBlob, uploadMedia, setAuthenticatedBrowser, uploadViaMediaDialog } from './qa-helpers';

test.describe.configure({ timeout: 120_000 });

test('delete subtitle entry removes the selected SRT cue and renumbers remaining cues', async ({ request }) => {
  const user = await createUser(request, 'subtitle-delete-entry');
  const video = await uploadMedia(request, user.token, 'e2e/fixtures/sample.mp4');
  const source = Buffer.from(
    '1\n00:00:00,500 --> 00:00:01,000\nFirst cue\n\n2\n00:00:01,200 --> 00:00:01,600\nDelete me\n\n3\n00:00:01,800 --> 00:00:02,200\nKeep me\n'
  );
  const upload = await request.post(API + '/subtitles/upload', {
    headers: { Authorization: 'Bearer ' + user.token },
    multipart: {
      file: {
        name: 'delete-entry.srt',
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
      operation: 'delete_entry',
      entry_index: 1,
    },
  });
  const body = await expectBlob(response, 'application/x-subrip');
  const text = body.toString('utf8');
  expect(text).toContain('1\n00:00:00,500 --> 00:00:01,000\nFirst cue');
  expect(text).toContain('2\n00:00:01,800 --> 00:00:02,200\nKeep me');
  expect(text).not.toContain('Delete me');
});

test('a real user can delete a subtitle entry from the media Tools UI and download it', async ({ page, request }) => {
  const user = await createUser(request, 'subtitle-delete-entry-ui');
  await setAuthenticatedBrowser(page, user.email, user.password);
  await page.goto('/app/dashboard/media');

  await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample.mp4'), 'sample.mp4');
  await page.getByRole('tab', { name: 'Tools', exact: true }).click();

  const subtitlesCard = page.getByRole('heading', { name: 'Subtitles', exact: true }).locator('xpath=../..');
  await subtitlesCard.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Delete Subtitle Entry', exact: true }).click();

  await subtitlesCard.locator('input[type=file]').setInputFiles({
    name: 'ui-delete-entry.srt',
    mimeType: 'application/x-subrip',
    buffer: Buffer.from(
      '1\n00:00:00,500 --> 00:00:01,000\nKeep first\n\n2\n00:00:01,200 --> 00:00:01,600\nDelete this\n'
    ),
  });

  await expect(subtitlesCard.getByText('ui-delete-entry.srt', { exact: true })).toBeVisible();
  await subtitlesCard.getByLabel('Delete Subtitle Entry').fill('2');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    subtitlesCard.getByRole('button', { name: 'Delete Entry & Download', exact: true }).click(),
  ]);

  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const downloaded = fs.readFileSync(downloadPath!, 'utf8');
  expect(downloaded).toContain('Keep first');
  expect(downloaded).not.toContain('Delete this');
});
