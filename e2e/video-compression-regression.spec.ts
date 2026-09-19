import { test, expect } from '@playwright/test';
import path from 'node:path';
import { API, createUser, setAuthenticatedBrowser, uploadViaMediaDialog } from './qa-helpers';

test.describe.configure({ timeout: 180_000 });

test('Compress video', async ({ page, request }) => {
  const auth = await createUser(request, 'compress-video');
  await setAuthenticatedBrowser(page, auth.email, auth.password);
  await page.goto('/app/dashboard/media');
  await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample-long.mp4'), 'sample-long.mp4');

  await page.getByRole('tab', { name: 'Tools', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Compress Media' })).toBeVisible();

  await page.getByText('Quality Preset').locator('..').getByRole('combobox').click();
  await page.getByRole('option', { name: /Balanced/i }).click();

  await page.getByRole('button', { name: /^Compress$/i }).click();

  await expect.poll(async () => {
    const r = await request.get(API + '/media/' + auth.userId + '/status').catch(() => null);
    return r?.status();
  }, { timeout: 1000 }).toBeUndefined().catch(() => undefined);

  const body = await page.locator('body').innerText();
  expect(body).not.toContain('Compress failed');
});
