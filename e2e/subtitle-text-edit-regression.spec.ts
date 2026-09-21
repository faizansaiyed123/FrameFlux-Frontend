import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { API, createUser, expectBlob, uploadMedia, setAuthenticatedBrowser, uploadViaMediaDialog } from './qa-helpers';

test.describe.configure({ timeout: 120_000 });

test('edit subtitle text updates the selected SRT cue', async ({ request }) => {
  const user = await createUser(request, 'subtitle-text-edit');
  const video = await uploadMedia(request, user.token, 'e2e/fixtures/sample.mp4');
  const source = Buffer.from('1\n00:00:00,500 --> 00:00:01,000\nOriginal subtitle\n');
  const upload = await request.post(API + '/subtitles/upload', {
    headers: { Authorization: 'Bearer ' + user.token },
    multipart: {
      file: {
        name: 'text-edit.srt',
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
      operation: 'update_text',
      entry_index: 0,
      text: 'Edited by FrameFlux QA',
    },
  });
  const body = await expectBlob(response, 'application/x-subrip');
  const text = body.toString('utf8');
  expect(text).toContain('Edited by FrameFlux QA');
  expect(text).toContain('00:00:00,500 --> 00:00:01,000');
  expect(text).not.toContain('Original subtitle');
});

test('a real user can edit subtitle text from the media Tools UI and download the result', async ({ page, request }) => {
  const user = await createUser(request, 'subtitle-text-edit-ui');
  await setAuthenticatedBrowser(page, user.email, user.password);
  await page.goto('/app/dashboard/media');

  await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample.mp4'), 'sample.mp4');
  await page.getByRole('tab', { name: 'Tools', exact: true }).click();

  const subtitlesCard = page.getByRole('heading', { name: 'Subtitles', exact: true }).locator('xpath=../..');
  await subtitlesCard.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Edit Subtitle Text', exact: true }).click();

  await subtitlesCard.locator('input[type=file]').setInputFiles({
    name: 'ui-text-edit.srt',
    mimeType: 'application/x-subrip',
    buffer: Buffer.from('1\n00:00:00,500 --> 00:00:01,000\nOriginal UI subtitle\n'),
  });

  await expect(subtitlesCard.getByText('ui-text-edit.srt', { exact: true })).toBeVisible();
  await subtitlesCard.getByLabel('Subtitle Entry').fill('1');
  await subtitlesCard.getByLabel('Subtitle Text').fill('Edited from real user flow');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    subtitlesCard.getByRole('button', { name: 'Edit & Download', exact: true }).click(),
  ]);

  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const downloaded = fs.readFileSync(downloadPath!, 'utf8');
  expect(downloaded).toContain('Edited from real user flow');
  expect(downloaded).toContain('00:00:00,500 --> 00:00:01,000');
});
