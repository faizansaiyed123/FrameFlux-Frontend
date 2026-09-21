import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { API, createUser, expectBlob, uploadMedia, setAuthenticatedBrowser, uploadViaMediaDialog } from './qa-helpers';

test.describe.configure({ timeout: 120_000 });

test('merge subtitle entries combines consecutive cues into one cue', async ({ request }) => {
  const user = await createUser(request, 'subtitle-merge-entry');
  const video = await uploadMedia(request, user.token, 'e2e/fixtures/sample.mp4');
  const source = Buffer.from(
    '1\n00:00:00,500 --> 00:00:01,000\nFirst cue\n\n2\n00:00:01,100 --> 00:00:01,600\nSecond cue\n'
  );
  const upload = await request.post(API + '/subtitles/upload', {
    headers: { Authorization: 'Bearer ' + user.token },
    multipart: {
      file: {
        name: 'merge-entry.srt',
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
      operation: 'merge_entries',
      entry_index: 0,
    },
  });
  const body = await expectBlob(response, 'application/x-subrip');
  const text = body.toString('utf8');
  expect(text).toContain('1\n00:00:00,500 --> 00:00:01,600');
  expect(text).toContain('First cue');
  expect(text).toContain('Second cue');
  expect(text).not.toMatch(/2\n00:00:01,100 --> 00:00:01,600/);
});

test('a real user can merge subtitle entries from the media Tools UI and download them', async ({ page, request }) => {
  const user = await createUser(request, 'subtitle-merge-entry-ui');
  await setAuthenticatedBrowser(page, user.email, user.password);
  await page.goto('/app/dashboard/media');

  await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample.mp4'), 'sample.mp4');
  await page.getByRole('tab', { name: 'Tools', exact: true }).click();

  const subtitlesCard = page.getByRole('heading', { name: 'Subtitles', exact: true }).locator('xpath=../..');
  await subtitlesCard.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Merge Subtitle Entries', exact: true }).click();

  await subtitlesCard.locator('input[type=file]').setInputFiles({
    name: 'ui-merge-entry.srt',
    mimeType: 'application/x-subrip',
    buffer: Buffer.from(
      '1\n00:00:00,500 --> 00:00:01,000\nFirst UI cue\n\n2\n00:00:01,100 --> 00:00:01,600\nSecond UI cue\n'
    ),
  });

  await expect(subtitlesCard.getByText('ui-merge-entry.srt', { exact: true })).toBeVisible();
  await subtitlesCard.getByLabel('Merge Subtitle Entry').fill('1');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    subtitlesCard.getByRole('button', { name: 'Merge Entries & Download', exact: true }).click(),
  ]);

  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const downloaded = fs.readFileSync(downloadPath!, 'utf8');
  expect(downloaded).toContain('00:00:00,500 --> 00:00:01,600');
  expect(downloaded).toContain('First UI cue');
  expect(downloaded).toContain('Second UI cue');
});
