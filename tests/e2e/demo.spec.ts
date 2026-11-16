import { expect, test } from '@playwright/test';

const backendUrl = 'http://127.0.0.1:8000';

test.beforeEach(async ({ request }) => {
  const reset = await request.post(`${backendUrl}/demo/reset`);
  expect(reset.ok()).toBeTruthy();
});

test('dashboard renders seeded data from the connected demo backend', async ({ page }) => {
  const backendFailures: string[] = [];
  page.on('response', (response) => {
    if (response.url().startsWith(backendUrl) && response.status() >= 400) {
      backendFailures.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/app/dashboard');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Product Launch').first()).toBeVisible();
  await expect(page.getByText('Brand Refresh').first()).toBeVisible();

  expect(backendFailures).toEqual([]);
});

test('project creation is sent to the backend and survives a page reload', async ({ page }) => {
  await page.goto('/app/dashboard/projects');
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

  await page.getByRole('button', { name: 'Create Project', exact: true }).first().click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Browser Integration Project');
  await dialog.getByLabel('Description (optional)').fill('Created through the real frontend UI.');
  await dialog.getByRole('button', { name: 'Create Project', exact: true }).click();

  await expect(page.getByText('Browser Integration Project')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Browser Integration Project')).toBeVisible();
});

test('media upload uses the frontend resumable flow and appears in the library', async ({ page }) => {
  await page.goto('/app/dashboard/media');
  await expect(page.getByRole('heading', { name: 'Media' })).toBeVisible();

  await page.getByRole('button', { name: 'Upload media' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'browser-e2e-upload.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('FrameFlux recruiter demo upload payload'),
  });

  await expect(dialog.getByText('browser-e2e-upload.mp4')).toBeVisible();
  await dialog.getByRole('button', { name: 'Upload', exact: true }).click();

  await expect(page).toHaveURL(/\/app\/dashboard\/media\/demo-media-/);
  await page.goto('/app/dashboard/media');
  await expect(page.getByText('browser-e2e-upload.mp4')).toBeVisible();
});

test('browser-origin processing requests create and complete a demo job', async ({ page }) => {
  await page.goto('/app/dashboard/media');
  await expect(page.getByText('product-launch-master.mp4')).toBeVisible();

  const result = await page.evaluate(async (url) => {
    const created = await fetch(`${url}/media/demo-media-001/convert`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'webm', resolution: '1080p' }),
    });
    const payload = await created.json();
    if (!created.ok) return { httpStatus: created.status, jobStatus: 'request-failed' };

    let jobStatus = 'not-found';
    for (let attempt = 0; attempt < 16; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      const response = await fetch(`${url}/jobs/${payload.job_id}`, {
        credentials: 'include',
      });
      if (!response.ok) continue;
      const job = await response.json();
      jobStatus = job.status;
      if (jobStatus === 'completed') break;
    }

    return { httpStatus: created.status, jobStatus, jobId: payload.job_id };
  }, backendUrl);

  expect(result.httpStatus).toBe(200);
  expect(result.jobStatus).toBe('completed');
});
