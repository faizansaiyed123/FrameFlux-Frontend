import { test, expect } from '@playwright/test';
import path from 'node:path';
import { createUser, setAuthenticatedBrowser } from './qa-helpers';

test.describe('11 Upload UX edge cases', () => {
  test('rejects unsupported subtitle file in the media uploader without starting upload', async ({ page, request }) => {
    const auth = await createUser(request, 'upload-validation');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/media');
    await page.getByRole('button', { name: /upload media/i }).click();

    const input = page.locator('input[type="file"]#file').last();
    await input.setInputFiles({
      name: 'invalid.srt',
      mimeType: 'text/plain',
      buffer: Buffer.from('1\n00:00:00,000 --> 00:00:01,000\nHello'),
    });

    await expect(page.getByText(/Invalid file type/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^upload$/i })).toBeDisabled();
  });

  test('drag-and-drop target accepts a valid video file', async ({ page, request }) => {
    const auth = await createUser(request, 'upload-dnd');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/media');
    await page.getByRole('button', { name: /upload media/i }).click();

    const dropTarget = page.locator('div.border-2.border-dashed').first();
    await expect(dropTarget).toBeVisible();

    const input = page.locator('input[type="file"]#file').last();
    await input.setInputFiles(path.resolve('e2e/fixtures/sample.mp4'));
    await expect(page.getByText('sample.mp4', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^upload$/i })).toBeEnabled();
  });
});
