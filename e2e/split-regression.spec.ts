import { test, expect } from '@playwright/test';
import { API, createUser, setAuthenticatedBrowser, uploadMedia, waitForMedia } from './qa-helpers';

test('Split video: choose split point, split media, complete processing', async ({ page, request }) => {
  const auth = await createUser(request, 'split-regression');
  const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

  await setAuthenticatedBrowser(page, auth.email, auth.password);
  await page.goto(`/app/dashboard/media/${media.id}`);
  await page.getByRole('tab', { name: 'Processing', exact: true }).click();

  await page.getByRole('button', { name: /^Split\b/i }).click();
  const points = page.getByLabel(/Split Points (seconds)/i);
  await points.fill('1');
  await page.getByRole('button', { name: /^Split Media$/i }).click();

  await expect(page.getByText(/Processing started/i)).toBeVisible({ timeout: 10_000 });

  const status = await waitForMedia(request, auth.token, media.id, 60_000);
  expect(status.status, JSON.stringify(status)).toBe('completed');
  expect(status.processed_filename || status.output_filename, JSON.stringify(status)).toBeTruthy();
});
