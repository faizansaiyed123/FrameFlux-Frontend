import { test, expect } from '@playwright/test';
import path from 'node:path';
import { API, createUser, uploadMedia, setAuthenticatedBrowser, uploadViaMediaDialog } from './qa-helpers';

test.describe.configure({ timeout: 120_000 });

test('subtitle burn supports top, center and bottom positions', async ({ request }) => {
  const user = await createUser(request, 'subtitle-position');
  const video = await uploadMedia(request, user.token, 'e2e/fixtures/sample.mp4');
  const upload = await request.post(API + '/subtitles/upload', {
    headers: { Authorization: 'Bearer ' + user.token },
    multipart: {
      file: {
        name: 'position-test.srt',
        mimeType: 'application/x-subrip',
        buffer: Buffer.from('1\n00:00:00,000 --> 00:00:01,000\nPosition test\n'),
      },
    },
  });
  expect(upload.ok(), await upload.text()).toBeTruthy();
  const subtitle = await upload.json();

  for (const position of ['top', 'center', 'bottom']) {
    const response = await request.post(API + '/subtitles/' + video.id + '/burn?subtitle_path=' +
      encodeURIComponent(subtitle.filename) + '&font_size=24&font_color=white&position=' + position, {
      headers: { Authorization: 'Bearer ' + user.token },
    });
    expect(response.ok(), position + ': ' + await response.text()).toBeTruthy();
    const body = await response.json();
    expect(body.version_number, position).toBeGreaterThan(0);
    expect(body.label, position).toContain(position);
  }
});

test('a real user can choose subtitle position from the Tools UI and apply it', async ({ page, request }) => {
  const user = await createUser(request, 'subtitle-position-ui');
  await setAuthenticatedBrowser(page, user.email, user.password);
  await page.goto('/app/dashboard/media');

  await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample.mp4'), 'sample.mp4');
  await page.getByRole('tab', { name: 'Tools', exact: true }).click();

  const subtitlesCard = page.getByRole('heading', { name: 'Subtitles', exact: true }).locator('xpath=../..');
  await subtitlesCard.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Burn Subtitles', exact: true }).click();
  await subtitlesCard.locator('input[type=file]').setInputFiles({
    name: 'ui-position.srt',
    mimeType: 'application/x-subrip',
    buffer: Buffer.from('1\n00:00:00,000 --> 00:00:01,000\nUI position\n'),
  });
  await expect(subtitlesCard.getByText('ui-position.srt', { exact: true })).toBeVisible();

  const position = subtitlesCard.getByRole('combobox').last();
  await position.click();
  await page.getByRole('option', { name: 'Top', exact: true }).click();

  const response = await page.waitForResponse(
    response => response.url().includes('/subtitles/') && response.url().includes('/burn') && response.status() === 200
  );
  await Promise.all([
    response,
    subtitlesCard.getByRole('button', { name: 'Run & Download', exact: true }).click(),
  ]);
});
