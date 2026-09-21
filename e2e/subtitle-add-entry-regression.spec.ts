import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { API, createUser, expectBlob, uploadMedia, setAuthenticatedBrowser, uploadViaMediaDialog } from './qa-helpers';

test.describe.configure({ timeout: 120_000 });

test('add subtitle entry appends a new SRT cue and renumbers entries', async ({ request }) => {
  const user = await createUser(request, 'subtitle-add-entry');
  const video = await uploadMedia(request, user.token, 'e2e/fixtures/sample.mp4');
  const source = Buffer.from('1\n00:00:00,500 --> 00:00:01,000\nFirst cue\n');
  const upload = await request.post(API + '/subtitles/upload', {
    headers: { Authorization: 'Bearer ' + user.token },
    multipart: {
      file: {
        name: 'add-entry.srt',
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
      operation: 'add_entry',
      start: 1.25,
      end: 2.25,
      text: 'Second cue',
    },
  });
  const body = await expectBlob(response, 'application/x-subrip');
  const text = body.toString('utf8');
  expect(text).toContain('1\n00:00:00,500 --> 00:00:01,000\nFirst cue');
  expect(text).toContain('2\n00:00:01,250 --> 00:00:02,250\nSecond cue');
});

test('a real user can add a subtitle entry from the media Tools UI and download it', async ({ page, request }) => {
  const user = await createUser(request, 'subtitle-add-entry-ui');
  await setAuthenticatedBrowser(page, user.email, user.password);
  await page.goto('/app/dashboard/media');

  await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample.mp4'), 'sample.mp4');
  await page.getByRole('tab', { name: 'Tools', exact: true }).click();

  const subtitlesCard = page.getByRole('heading', { name: 'Subtitles', exact: true }).locator('xpath=../..');
  await subtitlesCard.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Add Subtitle Entry', exact: true }).click();

  await subtitlesCard.locator('input[type=file]').setInputFiles({
    name: 'ui-add-entry.srt',
    mimeType: 'application/x-subrip',
    buffer: Buffer.from('1\n00:00:00,500 --> 00:00:01,000\nExisting cue\n'),
  });

  await expect(subtitlesCard.getByText('ui-add-entry.srt', { exact: true })).toBeVisible();
  await subtitlesCard.getByLabel('Insert After Entry').fill('');
  await subtitlesCard.getByLabel('Add Start Time').fill('1.25');
  await subtitlesCard.getByLabel('Add End Time').fill('2.25');
  await subtitlesCard.getByLabel('Add Subtitle Text').fill('Added from real user flow');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    subtitlesCard.getByRole('button', { name: 'Add Entry & Download', exact: true }).click(),
  ]);

  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const downloaded = fs.readFileSync(downloadPath!, 'utf8');
  expect(downloaded).toContain('00:00:01,250 --> 00:00:02,250');
  expect(downloaded).toContain('Added from real user flow');
});
