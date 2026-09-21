import { test, expect } from '@playwright/test';
import path from 'node:path';
import { API, createUser, setAuthenticatedBrowser, uploadMedia, uploadViaMediaDialog } from './qa-helpers';

test.describe.configure({ timeout: 180_000 });

test.describe('11 Checklist completion gates', () => {
  test('media detail: overview, processing, tools, versions, sharing, metadata and downloads', async ({ page, request }) => {
    const auth = await createUser(request, 'media-detail-gates');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/media');
    await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample.mp4'), 'sample.mp4');

    for (const tab of ['Overview', 'Processing', 'Tools', 'Versions', 'Sharing', 'Metadata']) {
      await expect(page.getByRole('tab', { name: tab, exact: true })).toBeVisible();
      await page.getByRole('tab', { name: tab, exact: true }).click();
    }

    await page.getByRole('tab', { name: 'Overview', exact: true }).click();
    await expect(page.getByRole('button', { name: /Download Original/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Download Processed/i })).toBeVisible();
  });

  test('compression UI sends target size instead of dropping the field', async ({ page, request }) => {
    const auth = await createUser(request, 'compress-wiring');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/media');
    await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample.mp4'), 'sample.mp4');
    await page.getByRole('tab', { name: 'Tools', exact: true }).click();

    const target = page.getByLabel(/Target Size \(MB, optional\)/i);
    await target.fill('1');

    let payload: Record<string, unknown> | null = null;
    await page.route('**/media/*/compress', async route => {
      payload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'queued', job_id: 'ui-compress', output_filename: 'compressed.mp4' }),
      });
    });

    await page.getByRole('button', { name: /^Compress$/i }).click();
    await expect.poll(() => payload).toBeTruthy();
    expect(payload.target_size_mb ?? payload.targetSize).toBe(1);
  });

  test('resumable upload UI exposes pause, resume, retry and cancel controls', async ({ page, request }) => {
    const auth = await createUser(request, 'resumable-ui-gates');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/media');

    await page.route('**/media/resumable/**', async route => {
      const url = route.request().url();
      if (url.endsWith('/init')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ upload_id: 'ui-upload', chunk_size: 1024 }) });
        return;
      }
      if (url.includes('/chunk/')) {
        await new Promise(r => setTimeout(r, 1_000));
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        return;
      }
      if (url.includes('/finalize')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'ui-media', original_filename: 'sample.mp4' }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.getByRole('button', { name: /upload media/i }).click();
    await page.locator('input[type=file]#file').last().setInputFiles(path.resolve('e2e/fixtures/sample.mp4'));
    await page.getByRole('button', { name: /^upload$/i }).click();
    await expect(page.getByText('Uploading media', { exact: true })).toBeVisible();

    for (const label of [/pause upload/i, /resume upload/i, /retry upload/i, /cancel upload/i]) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }
  });

  test('media library exposes organization and rich filtering controls', async ({ page, request }) => {
    const auth = await createUser(request, 'library-gates');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/media');

    for (const label of [
      /sort/i, /media type/i, /folder/i, /tag/i, /date/i, /duration/i,
      /file size/i, /resolution/i, /processing status/i, /recently uploaded/i,
    ]) {
      await expect(page.locator('body')).toContainText(label);
    }
  });

  test('workflow editor exposes operation reordering', async ({ page, request }) => {
    const auth = await createUser(request, 'workflow-order-gates');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/workflows');
    await page.getByRole('button', { name: /new workflow/i }).click();
    await page.getByLabel('Name').fill('QA Order Workflow');
    await page.getByRole('button', { name: /add operation/i }).click();
    await expect(page.getByText('Operations (executed in order)', { exact: true })).toBeVisible();
    expect(await page.getByRole('button', { name: /move up|move down|reorder/i }).count()).toBeGreaterThan(0);
  });

  test('storage usage exposes total, media-type and folder breakdowns', async ({ page, request }) => {
    const auth = await createUser(request, 'storage-gates');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/storage');
    for (const text of ['Total Storage', 'By Media Type', 'By Folder']) {
      await expect(page.locator('body')).toContainText(text);
    }
  });

  test('processing history exposes persisted operation records', async ({ page, request }) => {
    const auth = await createUser(request, 'history-gates');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const history = await request.post(API + '/history', {
      headers: { Authorization: 'Bearer ' + auth.token },
      params: { media_id: media.id, operation: 'convert', status: 'completed' },
    });
    expect(history.ok(), await history.text()).toBeTruthy();

    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/history');
    await expect(page.getByRole('heading', { name: 'Processing History' })).toBeVisible();
    await expect(page.locator('body')).toContainText(/convert|completed/i);
  });

  test('settings expose theme and language controls', async ({ page, request }) => {
    const auth = await createUser(request, 'language-gates');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/settings');
    await expect(page.getByText(/Language/i).first()).toBeVisible();
    const selects = page.getByRole('combobox');
    expect(await selects.count()).toBeGreaterThanOrEqual(2);
    await selects.nth(1).click();
    await expect(page.getByRole('option', { name: /English/i })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('tool option surfaces cover audio extraction, thumbnails, GIF, preview and subtitles', async ({ page, request }) => {
    const auth = await createUser(request, 'tools-gates');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/media');
    await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample.mp4'), 'sample.mp4');
    await page.getByRole('tab', { name: 'Tools', exact: true }).click();

    for (const text of ['MP3', 'WAV', 'AAC', 'FLAC', 'OGG', 'M4A', 'Opus', 'AIFF', 'Bitrate', 'Sample Rate', 'Mono', 'Stereo', 'Thumbnail', 'JPG', 'PNG', 'WebP', 'GIF', 'Preview', 'Duration', 'Start', 'FPS', 'Quality', 'SRT', 'VTT', 'ASS', 'Burn', 'Mux']) {
      await expect(page.locator('body')).toContainText(text);
    }
  });

  test('main media flow reaches conversion, result preview and download controls', async ({ page, request }) => {
    const auth = await createUser(request, 'main-flow-gates');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/media');
    await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample.mp4'), 'sample.mp4');

    await page.getByRole('tab', { name: 'Processing', exact: true }).click();
    await expect(page.getByText('Timeline')).toBeVisible();
    await page.getByRole('button', { name: /^Export$/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Export Settings' })).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();

    await page.getByRole('tab', { name: 'Tools', exact: true }).click();
    await expect(page.getByText('Generate Preview', { exact: true })).toBeVisible();
    await expect(page.getByText('Download', { exact: true }).first()).toBeVisible();
  });
});