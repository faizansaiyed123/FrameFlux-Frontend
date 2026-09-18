import { test, expect } from '@playwright/test';
import path from 'node:path';
import { createUser, setAuthenticatedBrowser, uploadViaMediaDialog, API } from './qa-helpers';

async function openVideoEditor(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
  const auth = await createUser(request, 'ui-wiring');
  await setAuthenticatedBrowser(page, auth.email, auth.password);
  await page.goto('/app/dashboard/media');
  await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample.mp4'), 'sample.mp4');
  await page.getByRole('tab', { name: 'Processing' }).click();
  await expect(page.getByText('Timeline')).toBeVisible({ timeout: 30_000 });
  return auth;
}

test.describe('10 UI-to-API wiring', () => {
  test('transform controls issue transform requests for scale, crop, rotate, flip, flop and speed', async ({ page, request }) => {
    await openVideoEditor(page, request);
    await page.getByRole('button', { name: 'Transform' }).click();

    const calls: any[] = [];
    await page.route('**/media/*/transform', async route => {
      calls.push(JSON.parse(route.request().postData() || '{}'));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'queued', job_id: 'ui-test', output_filename: 'ui-test.mp4' }) });
    });

    const operationSelect = page.getByText('Operation').first().locator('..').getByRole('combobox');
    for (const operation of ['scale', 'crop', 'rotate', 'flip', 'flop', 'speed']) {
      await operationSelect.click();
      await page.getByRole('option', { name: new RegExp(operation, 'i') }).click();
      await page.getByRole('button', { name: 'Apply Transform' }).click();
      await expect.poll(() => calls.length).toBeGreaterThan(0);
      calls.length = 0;
    }
  });

  test('overlay controls add, edit, remove and apply multiple overlays', async ({ page, request }) => {
    await openVideoEditor(page, request);
    await page.getByRole('button', { name: 'Overlay' }).click();

    let requestCount = 0;
    await page.route('**/media/*/overlay', async route => {
      requestCount++;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'queued', job_id: 'ui-test', output_filename: 'ui-test.mp4' }) });
    });

    await page.getByRole('button', { name: 'Add Text' }).click();
    await expect(page.getByText('text', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await expect(page.locator('input:visible').first()).toBeVisible();

    await page.getByRole('button', { name: 'Add Watermark' }).click();
    await page.getByRole('button', { name: /Apply 2 Overlay/i }).click();
    await expect.poll(() => requestCount).toBe(1);

    await page.getByRole('button', { name: 'Remove' }).first().click();
    await expect(page.getByRole('button', { name: /Apply 1 Overlay/i })).toBeVisible();
  });

  test('subtitle controls upload supported files and issue burn/mux/sync requests', async ({ page, request }) => {
    await openVideoEditor(page, request);
    await page.getByRole('button', { name: 'Subs' }).click();

    const subtitleInput = page.locator('input[type=file][accept*=".srt"]').last();
    await subtitleInput.setInputFiles(path.resolve('e2e/fixtures/sample.srt'));
    await expect(page.getByText('sample.srt', { exact: true })).toBeVisible();

    const seen: string[] = [];
    await page.route('**/subtitles/**', async route => {
      seen.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: route.request().url().includes('/tracks') ? 'application/json' : route.request().url().includes('/sync') ? 'application/json' : 'video/mp4',
        body: route.request().url().includes('/tracks') ? '[]' : JSON.stringify({ preview_url: '/media/test/file' }),
      });
    });

    await page.getByRole('button', { name: 'Burn' }).click();
    await page.getByRole('button', { name: 'Mux' }).click();
    await page.getByRole('button', { name: 'Preview Sync' }).click();
    await page.getByRole('button', { name: 'Sync & Download' }).click();
    await page.getByRole('button', { name: 'List Tracks' }).click();

    await expect.poll(() => seen.filter(url => /\/burn|\/mux|\/sync|\/tracks/.test(url)).length).toBeGreaterThanOrEqual(4);
  });

  test('batch selection, operation selection and start button issue batch request', async ({ page, request }) => {
    const auth = await createUser(request, 'batch-ui-wiring');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/media');
    await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample.mp4'), 'sample.mp4');
    await page.goto('/app/dashboard/batch');

    const mediaRow = page.getByText('sample.mp4', { exact: true }).first().locator('..').locator('..');
    const checkbox = mediaRow.getByRole('checkbox');
    await checkbox.check();

    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Compress' }).click();

    let requested = false;
    await page.route('**/batch/process', async route => {
      requested = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        job_id: 'ui-test-batch', total_items: 1, operation: 'compress', status: 'queued', results: [{ media_id: 'x', filename: 'sample.mp4' }]
      }) });
    });
    await page.getByRole('button', { name: 'Start Batch Job' }).click();
    await expect.poll(() => requested).toBeTruthy();
  });
});
