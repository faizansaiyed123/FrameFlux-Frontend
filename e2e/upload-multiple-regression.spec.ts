import { test, expect } from '@playwright/test';
import path from 'node:path';
import { createUser, setAuthenticatedBrowser } from './qa-helpers';

test('Upload multiple files: select three files, upload, and verify all appear', async ({ page, request }) => {
  const auth = await createUser(request, 'upload-multiple-regression');
  await setAuthenticatedBrowser(page, auth.email, auth.password);
  await page.goto('/app/dashboard/media');

  await page.getByRole('button', { name: /upload media/i }).click();

  const input = page.locator('input[type=file]#file').last();
  await expect(input).toHaveAttribute('multiple');

  await input.setInputFiles([
    path.resolve('e2e/fixtures/sample.mp4'),
    path.resolve('e2e/fixtures/sample.mp3'),
    path.resolve('e2e/fixtures/sample.png'),
  ]);

  await expect(page.getByText('3 files selected', { exact: true })).toBeVisible();
  await expect(page.getByText('sample.mp4', { exact: true })).toBeVisible();
  await expect(page.getByText('sample.mp3', { exact: true })).toBeVisible();
  await expect(page.getByText('sample.png', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /^Upload$/i }).click();

  await expect(page.getByText('sample.mp4', { exact: true }).last()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('sample.mp3', { exact: true }).last()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('sample.png', { exact: true }).last()).toBeVisible({ timeout: 30_000 });
});
