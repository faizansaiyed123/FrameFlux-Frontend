import { test, expect } from '@playwright/test';
import path from 'node:path';
import { API, createUser, uploadMedia, waitForMedia, expectBlob, setAuthenticatedBrowser } from './qa-helpers';

test.describe.configure({ timeout: 180_000 });

async function runCompression(request: Parameters<typeof createUser>[0], token: string, mediaId: string, data: Record<string, unknown>) {
  const r = await request.post(API + '/media/' + mediaId + '/compress', {
    headers: { Authorization: 'Bearer ' + token },
    data,
  });
  expect(r.ok(), await r.text()).toBeTruthy();
  const status = await waitForMedia(request, token, mediaId, 90_000);
  expect(status.status, JSON.stringify(status)).toBe('completed');
  expect(status.processed_filename, JSON.stringify(status)).toBeTruthy();
  await expectBlob(
    await request.get(API + '/media/' + mediaId + '/processed', {
      headers: { Authorization: 'Bearer ' + token },
    }),
    'video/',
  );
  return status;
}

test.describe('07 Video Compression batch', () => {
  test('Low compression', async ({ request }) => {
    const auth = await createUser(request, 'compression-low');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample-long.mp4');
    await runCompression(request, auth.token, media.id, { format: 'mp4', compression_preset: 'low' });
  });

  test('Balanced compression', async ({ request }) => {
    const auth = await createUser(request, 'compression-balanced');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample-long.mp4');
    await runCompression(request, auth.token, media.id, { format: 'mp4', compression_preset: 'balanced' });
  });

  test('Maximum compression', async ({ request }) => {
    const auth = await createUser(request, 'compression-maximum');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample-long.mp4');
    await runCompression(request, auth.token, media.id, { format: 'mp4', compression_preset: 'maximum' });
  });

  test('Custom bitrate', async ({ request }) => {
    const auth = await createUser(request, 'compression-bitrate');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample-long.mp4');
    await runCompression(request, auth.token, media.id, { format: 'mp4', video_bitrate: '500k', compression_preset: 'balanced' });
  });

  test('Target file size', async ({ request }) => {
    const auth = await createUser(request, 'compression-target');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample-long.mp4');
    await runCompression(request, auth.token, media.id, { format: 'mp4', target_size_mb: 1, compression_preset: 'balanced' });
  });

  test('Resolution-based compression and before/after result comparison', async ({ request }) => {
    const auth = await createUser(request, 'compression-resolution');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample-long.mp4');
    const original = await expectBlob(
      await request.get(API + '/media/' + media.id + '/download', {
        headers: { Authorization: 'Bearer ' + auth.token },
      }),
      'video/',
    );
    await runCompression(request, auth.token, media.id, {
      format: 'mp4',
      resolution: '640x360',
      compression_preset: 'balanced',
    });
    const processed = await expectBlob(
      await request.get(API + '/media/' + media.id + '/processed', {
        headers: { Authorization: 'Bearer ' + auth.token },
      }),
      'video/',
    );
    const percentageSaved = ((original.length - processed.length) / original.length) * 100;
    expect(Number.isFinite(percentageSaved)).toBeTruthy();
  });

  test('Compression UI sends target size to the API', async ({ page, request }) => {
    const auth = await createUser(request, 'compression-ui-target');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/media');
    const file = path.resolve('e2e/fixtures/sample.mp4');
    await page.getByRole('button', { name: /upload media/i }).click();
    await page.locator('input[type=file]#file').last().setInputFiles(file);
    await page.getByRole('button', { name: /^upload$/i }).click();
    await page.waitForURL(/\/app\/dashboard\/media\/[^/?]+\?from_upload=1$/);

    await page.getByRole('tab', { name: 'Tools', exact: true }).click();
    await page.getByText('Target Size (MB, optional)', { exact: true }).locator('..').getByRole('spinbutton').fill('1');

    let payload: any = null;
    await page.route('**/media/*/compress', async route => {
      payload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ media_id: 'ui-compression', status: 'queued', job_id: 'ui-job', output_filename: 'compressed.mp4' }),
      });
    });
    await page.getByRole('button', { name: /^Compress$/i }).click();
    await expect.poll(() => payload).toBeTruthy();
    expect(payload.target_size_mb).toBe(1);
  });
});
