import { test, expect } from '@playwright/test';
import path from 'node:path';
import { createUser, setAuthenticatedBrowser, uploadMedia } from './qa-helpers';

test('Add audio: mix separately uploaded audio with video and download result', async ({ page, request }) => {
  const auth = await createUser(request, 'add-audio-regression');
  const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
  const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

  await setAuthenticatedBrowser(page, auth.email, auth.password);
  await page.goto(`/app/dashboard/media/${video.id}`);

  await page.getByRole('tab', { name: 'Processing', exact: true }).click();
  await page.getByRole('button', { name: /^Audio$/i }).click();
  const audioPath = audio.stored_filename;

  await page.getByLabel('Add Audio', { exact: true }).click().catch(() => {});
  const field = page.locator('#addAudioFile');
  await expect(field).toBeVisible();
  await field.fill(audioPath);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Add Audio$/i }).click();
  const download = await downloadPromise;

  await expect(download.suggestedFilename()).toContain('_with_audio.mp4');
  await expect(page.getByText(new RegExp('Audio added and mixed', 'i'))).toBeVisible({ timeout: 30_000 });
});
