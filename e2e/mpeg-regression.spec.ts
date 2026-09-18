import { test, expect } from '@playwright/test';
import { API, createUser, setAuthenticatedBrowser, uploadMedia, waitForMedia } from './qa-helpers';

test('Convert video to MPEG: select MPEG, complete conversion, download result', async ({ page, request }) => {
  const auth = await createUser(request, 'mpeg-regression');
  const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

  await setAuthenticatedBrowser(page, auth.email, auth.password);
  await page.goto(`/app/dashboard/media/${media.id}`);
  await page.getByRole('tab', { name: 'Processing', exact: true }).click();

  await page.getByRole('button', { name: /^Export$/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Export Settings', exact: true })).toBeVisible();

  const format = page.getByRole('combobox').first();
  await format.click();
  await page.getByRole('option', { name: 'MPEG', exact: true }).click();

  await page.getByRole('button', { name: /^Export$/i }).last().click();

  const status = await waitForMedia(request, auth.token, media.id, 60_000);
  expect(status.status, JSON.stringify(status)).toBe('completed');
  expect(status.processed_filename, JSON.stringify(status)).toMatch(/\.mpeg$/i);

  const download = await request.get(
    API + `/media/${media.id}/download?download_type=processed`,
    { headers: { Authorization: 'Bearer ' + auth.token } }
  );
  expect(download.ok(), await download.text()).toBeTruthy();
  expect(download.headers()['content-type'] || '').toContain('video/');
  expect((await download.body()).length).toBeGreaterThan(0);
});
