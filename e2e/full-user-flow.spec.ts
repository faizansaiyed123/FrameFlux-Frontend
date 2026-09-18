import { test, expect } from '@playwright/test';

test.describe('FrameFlux real-user end-to-end flow', () => {
  test('landing → signup → media upload → processing editor → tools → export dialog', async ({ page }) => {
    const email = `qa_${Date.now()}@example.com`;
    const password = 'TestPass123!';

    await page.goto('/');
    await expect(page).toHaveTitle(/FrameFlux/i);
    await expect(page.getByRole('link', { name: /frameflux/i }).first()).toBeVisible();

    await page.goto('/auth/signup');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    await page.getByLabel(/full name/i).fill('QA Browser User');
    await page.getByLabel(/email/i).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForURL(/\/app\/dashboard$/, { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.goto('/app/dashboard/media');
    await expect(page.getByRole('heading', { name: 'Media' })).toBeVisible();
    await expect(page.getByRole('button', { name: /upload media/i })).toBeVisible();

    await page.getByRole('button', { name: /upload media/i }).click();
    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/drag & drop a file here/i).click();
    const chooser = await chooserPromise;
    await chooser.setFiles('e2e/fixtures/sample.mp4');
    await expect(page.getByText('sample.mp4', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: /^upload$/i }).click();

    await page.waitForURL(/\/app\/dashboard\/media\/[^/?]+\?from_upload=1$/, { timeout: 120_000 });
    await expect(page.getByText(/media uploaded successfully/i)).toBeVisible();

    // Media detail navigation is part of the real user flow.
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Processing' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Tools' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Versions' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Sharing' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Metadata' })).toBeVisible();

    // Verify the built-in tools surface.
    await page.getByRole('tab', { name: 'Tools' }).click();
    await expect(page.getByText('Compress Media')).toBeVisible();
    await expect(page.getByText('Extract Audio')).toBeVisible();
    await expect(page.getByText('Generate Thumbnail')).toBeVisible();
    await expect(page.getByText('Generate Preview')).toBeVisible();
    await expect(page.getByText('Subtitles')).toBeVisible();
    await expect(page.getByText('Generate GIF')).toBeVisible();
    await expect(page.getByText('Media Information')).toBeVisible();

    // Open the actual editor.
    await page.getByRole('tab', { name: 'Processing' }).click();
    await expect(page.getByText('Timeline')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /^export$/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /play/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /skip back/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /skip forward/i }).first()).toBeVisible();

    // Playback controls.
    const video = page.locator('video').first();
    await expect(video).toBeVisible();
    await page.getByRole('button', { name: /play/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /pause/i }).first().click();
    await page.getByRole('button', { name: /skip back/i }).first().click();
    await page.getByRole('button', { name: /skip forward/i }).first().click();

    // Select the clip on the timeline and exercise edit tools.
    await page.getByText('sample.mp4', { exact: true }).last().click();
    await expect(page.getByRole('button', { name: 'Trim' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Split' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Speed' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Transform' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Overlay' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Freeze' })).toBeVisible();

    await page.getByRole('button', { name: 'Trim' }).click();
    await expect(page.getByRole('heading', { name: 'Trim' })).toBeVisible();
    await page.getByRole('button', { name: 'Split' }).click();
    await expect(page.getByRole('heading', { name: 'Split Clip' })).toBeVisible();

    // Create a second clip through the real timeline/playhead UI.
    const timeline = page.locator('div.overflow-x-auto.cursor-crosshair').first();
    const timelineBox = await timeline.boundingBox();
    expect(timelineBox).not.toBeNull();
    if (!timelineBox) throw new Error('Timeline was not measurable');
    await page.mouse.click(timelineBox.x + timelineBox.width * 0.25, timelineBox.y + timelineBox.height * 0.65);
    await page.getByRole('button', { name: 'Split' }).click();
    await expect(page.getByText(/2 clips/)).toBeVisible({ timeout: 15_000 });

    // Multi-clip tools become available only after the split.
    await expect(page.getByRole('button', { name: 'Merge' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clips' })).toBeVisible();
    await page.getByRole('button', { name: 'Merge' }).click();
    await expect(page.getByRole('heading', { name: 'Merge Clips' })).toBeVisible();
    await page.getByRole('button', { name: 'Clips' }).click();
    await expect(page.getByRole('heading', { name: 'Clip Operations' })).toBeVisible();

    // Switch through the dedicated editor workspaces.
    await page.getByRole('button', { name: 'Audio' }).click();
    await expect(page.getByText(/Audio/i).first()).toBeVisible();
    await page.getByRole('button', { name: 'Subs' }).click();
    await expect(page.getByText(/Subtitle Management/i)).toBeVisible();
    await page.getByRole('button', { name: 'Transform' }).click();
    await expect(page.getByText(/Transform/i).first()).toBeVisible();
    await page.getByRole('button', { name: 'Overlay' }).click();
    await expect(page.getByText(/Overlay/i).first()).toBeVisible();

    // Open export settings and inspect the real controls.
    await page.getByRole('button', { name: /^export$/i }).first().click();
    await expect(page.getByRole('heading', { name: /export settings/i })).toBeVisible();
    await expect(page.getByText('Format').first()).toBeVisible();
    await expect(page.getByText('Resolution').first()).toBeVisible();
    await expect(page.getByText('Frame Rate').first()).toBeVisible();
    await expect(page.getByText('Quality').first()).toBeVisible();
    await expect(page.getByText('Codec').first()).toBeVisible();
    await expect(page.getByText('Video Bitrate').first()).toBeVisible();
    await expect(page.getByText('Audio').last()).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('heading', { name: /export settings/i })).toHaveCount(0);
  });
});
