import { test, expect } from '@playwright/test';
import path from 'node:path';
import { API, createUser, setAuthenticatedBrowser, uploadMedia, waitForMedia } from './qa-helpers';

test('Convert video to WebM: select WebM, use default compatible audio, complete conversion, download result', async ({ page, request }) => {
  const auth = await createUser(request, 'webm-regression');
  const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

  await setAuthenticatedBrowser(page, auth.email, auth.password);
  await page.goto(`/app/dashboard/media/${media.id}`);
  await page.getByRole('tab', { name: 'Processing', exact: true }).click();

  const format = page.getByRole('combobox').first();
  await format.click();
  await page.getByRole('option', { name: 'WebM', exact: true }).click();

  const audioCodec = page.getByLabel('Audio Codec');
  await expect(audioCodec).toContainText('Default');

  await page.getByRole('button', { name: /^Convert$/i }).last().click();
  await expect(page.getByText(/Processing started/i)).toBeVisible({ timeout: 10_000 });

  const status = await waitForMedia(request, auth.token, media.id, 60_000);
  expect(status.status, JSON.stringify(status)).toBe('completed');
  expect(status.processed_filename).toMatch(/\\.webm$/i);

  const download = await request.get(
    API + `/media/${media.id}/download?download_type=processed`,
    { headers: { Authorization: 'Bearer ' + auth.token } }
  );
  expect(download.ok(), await download.text()).toBeTruthy();
  expect(download.headers()['content-type'] || '').toContain('video/');
  expect((await download.body()).length).toBeGreaterThan(0);
});
