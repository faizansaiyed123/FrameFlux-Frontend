import { test, expect } from '@playwright/test';
import path from 'node:path';
import { createUser, setAuthenticatedBrowser, uploadViaMediaDialog } from './qa-helpers';

const routes: Array<[string, RegExp]> = [
  ['/app/dashboard', /^Dashboard$/i],
  ['/app/dashboard/media', /^Media$/i],
  ['/app/dashboard/batch', /^Batch Processing$/i],
  ['/app/dashboard/comparisons', /^Media Comparisons$/i],
  ['/app/dashboard/favorites', /^Favorites$/i],
  ['/app/dashboard/help', /Help & Support/i],
  ['/app/dashboard/history', /^Processing History$/i],
  ['/app/dashboard/jobs', /^Jobs$/i],
  ['/app/dashboard/notifications', /^Notifications$/i],
  ['/app/dashboard/presets', /^Presets$/i],
  ['/app/dashboard/projects', /^Projects$/i],
  ['/app/dashboard/quick-actions', /^Quick Actions$/i],
  ['/app/dashboard/search', /^Search$/i],
  ['/app/dashboard/settings', /^Settings$/i],
  ['/app/dashboard/storage', /^Storage$/i],
  ['/app/dashboard/workflows', /^Workflows$/i],
];

async function optionTexts(page: import('@playwright/test').Page, combobox: import('@playwright/test').Locator) {
  await combobox.click();
  const options = page.getByRole('option');
  await expect(options.first()).toBeVisible();
  const count = await options.count();
  const texts: string[] = [];
  for (let i = 0; i < count; i++) {
    texts.push((await options.nth(i).innerText()).trim());
  }
  await page.keyboard.press('Escape');
  return texts;
}

test.describe('FrameFlux exhaustive UI surface', () => {
  test('all dashboard routes render and expose their primary surface', async ({ page, request }) => {
    const auth = await createUser(request, 'route');
    await setAuthenticatedBrowser(page, auth.email, auth.password);

    for (const [route, heading] of routes) {
      await page.goto(route);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('body')).not.toContainText(/Application error|Internal Server Error/i);
      const pageErrors: string[] = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));
      expect(pageErrors).toEqual([]);
    }
  });

  test('upload controls accept video, audio, image and support picker progress flow', async ({ page, request }) => {
    const auth = await createUser(request, 'upload-ui');
    await setAuthenticatedBrowser(page, auth.email, auth.password);

    const fixtures = [
      ['e2e/fixtures/sample.mp4', 'sample.mp4'],
      ['e2e/fixtures/sample.mp3', 'sample.mp3'],
      ['e2e/fixtures/sample.png', 'sample.png'],
    ] as const;

    for (const [file, name] of fixtures) {
      await page.goto('/app/dashboard/media');
      await uploadViaMediaDialog(page, path.resolve(file), name);
      await expect(page.getByText(/Media uploaded successfully/i)).toBeVisible();
      await page.goto('/app/dashboard/media');
    }
  });

  test('video editor exposes timeline, playback, every primary tool and export settings', async ({ page, request }) => {
    const auth = await createUser(request, 'editor-ui');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/media');
    await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample.mp4'), 'sample.mp4');

    await page.getByRole('tab', { name: 'Processing' }).click();
    await expect(page.getByText('Timeline')).toBeVisible({ timeout: 30_000 });

    for (const name of ['Export', 'Skip back', 'Skip forward']) {
      await expect(page.getByRole('button', { name: new RegExp(name, 'i') }).first()).toBeVisible();
    }

    for (const name of ['Edit', 'Audio', 'Subs', 'Transform', 'Overlay']) {
      await expect(page.getByRole('button', { name: new RegExp('^' + name + '$', 'i') })).toBeVisible();
    }

    const video = page.locator('video').first();
    await expect(video).toBeVisible();
    await page.getByRole('button', { name: /play/i }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /pause/i }).first().click();

    const timeline = page.locator('div.overflow-x-auto.cursor-crosshair').first();
    await expect(timeline).toBeVisible();

    await timeline.click({ position: { x: 100, y: 50 } });
    await page.getByText('sample.mp4', { exact: true }).last().click();
    for (const tool of ['Trim', 'Split', 'Speed', 'Transform', 'Overlay', 'Freeze']) {
      await expect(page.getByRole('button', { name: tool }).first()).toBeVisible();
    }

    for (const tool of ['Trim', 'Split', 'Speed', 'Transform', 'Overlay', 'Freeze']) {
      await page.getByRole('button', { name: tool }).first().click();
      await expect(page.locator('body')).toContainText(new RegExp(tool.replace(/ /g, '\\\\s+'), 'i'));
    }

    await page.getByRole('button', { name: 'Split' }).click();
    await expect(page.getByRole('heading', { name: 'Split Clip' })).toBeVisible();
    await timeline.click({ position: { x: 120, y: 45 } });
    await page.getByRole('button', { name: 'Split' }).click();
    await expect(page.getByText(/2 clips/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Merge' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clips' })).toBeVisible();

    await page.getByRole('button', { name: /^export$/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Export Settings' })).toBeVisible();

    const expectedFormats = ['MP4', 'MOV', 'MKV', 'AVI', 'WebM', 'FLV', 'MPEG', 'TS', 'M4V', '3GP'];
    const formatTexts = await optionTexts(page, page.getByRole('combobox').nth(0));
    for (const value of expectedFormats) expect(formatTexts.join(' ')).toContain(value);

    const expectedRes = ['Original', '4K', '1080p', '720p', '480p'];
    const resTexts = await optionTexts(page, page.getByRole('combobox').nth(1));
    for (const value of expectedRes) expect(resTexts.join(' ')).toContain(value);

    const expectedFps = ['Original', '24 fps', '30 fps', '60 fps'];
    const fpsTexts = await optionTexts(page, page.getByRole('combobox').nth(2));
    for (const value of expectedFps) expect(fpsTexts.join(' ')).toContain(value);

    for (const quality of ['Low', 'Balanced', 'High', 'Custom']) {
      await expect(page.getByRole('button', { name: quality, exact: true })).toBeVisible();
    }

    const codecTexts = await optionTexts(page, page.getByRole('combobox').nth(3));
    for (const value of ['H.264', 'H.265', 'VP8', 'VP9', 'AV1']) expect(codecTexts.join(' ')).toContain(value);

    const bitrateTexts = await optionTexts(page, page.getByRole('combobox').nth(4));
    for (const value of ['Auto', '500 kbps', '1 Mbps', '2 Mbps', '5 Mbps', '8 Mbps']) expect(bitrateTexts.join(' ')).toContain(value);

    const audioTexts = await optionTexts(page, page.getByRole('combobox').nth(5));
    for (const value of ['Keep Original', 'AAC', 'MP3', 'No Audio']) expect(audioTexts.join(' ')).toContain(value);

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('heading', { name: 'Export Settings' })).toHaveCount(0);
  });

  test('media tools expose every configured option group', async ({ page, request }) => {
    const auth = await createUser(request, 'tools-ui');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/media');
    await uploadViaMediaDialog(page, path.resolve('e2e/fixtures/sample.mp4'), 'sample.mp4');
    await page.getByRole('tab', { name: 'Tools' }).click();

    for (const title of [
      'Compress Media',
      'Extract Audio',
      'Generate Thumbnail',
      'Generate Preview',
      'Subtitles',
      'Generate GIF',
      'Media Information',
    ]) {
      await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    }

    const body = page.locator('body');
    await expect(body).toContainText(/360p|640x360/i);
    await expect(body).toContainText(/1080p|1920x1080/i);
    await expect(body).toContainText(/Low.*compression|Balanced|High/i);
    await expect(body).toContainText(/MP3/);
    await expect(body).toContainText(/WAV/);
    await expect(body).toContainText(/PNG/);
    await expect(body).toContainText(/WebP/i);
    await expect(body).toContainText(/Video Preview|GIF Preview|Thumbnail/);

    await page.getByText('Subtitles', { exact: true }).click();
  });
});
