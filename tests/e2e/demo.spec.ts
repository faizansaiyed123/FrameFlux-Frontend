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

    const [mediaStatusResponse, versionsResponse] = await Promise.all([
      fetch(`${url}/media/demo-media-001/status`, { credentials: 'include' }),
      fetch(`${url}/media/demo-media-001/versions`, { credentials: 'include' }),
    ]);
    const mediaStatus = await mediaStatusResponse.json();
    const versions = await versionsResponse.json();

    return {
      httpStatus: created.status,
      jobStatus,
      jobId: payload.job_id,
      mediaStatusHasJob: Boolean(mediaStatus.job_id),
      versionsCount: Array.isArray(versions) ? versions.length : 0,
    };
  }, backendUrl);

  expect(result.httpStatus).toBe(200);
  expect(result.jobStatus).toBe('completed');
  expect(result.mediaStatusHasJob).toBeTruthy();
  expect(result.versionsCount).toBeGreaterThan(0);
});

test('browser-origin batch and workflow operations return frontend response shapes', async ({ page }) => {
  await page.goto('/app/dashboard');

  const result = await page.evaluate(async (url) => {
    const createdWorkflow = await fetch(`${url}/workflows`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Browser E2E Workflow',
        description: 'Created from the frontend browser.',
        operations: [{ type: 'convert', params: { format: 'webm' } }],
      }),
    });
    const workflow = await createdWorkflow.json();
    if (!createdWorkflow.ok) return { ok: false, stage: 'create-workflow' };

    const updatedWorkflow = await fetch(`${url}/workflows/${workflow.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Browser E2E Workflow' }),
    });
    if (!updatedWorkflow.ok) return { ok: false, stage: 'update-workflow' };

    const runWorkflow = await fetch(
      `${url}/workflows/${workflow.id}/run?media_id=demo-media-001`,
      { method: 'POST', credentials: 'include' },
    );
    const run = await runWorkflow.json();

    const batchResponse = await fetch(`${url}/batch/process`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_ids: ['demo-media-001', 'demo-media-005'],
        operation: 'compress',
      }),
    });
    const batch = await batchResponse.json();
    if (!batchResponse.ok) return { ok: false, stage: 'batch' };

    const batchStatusResponse = await fetch(
      `${url}/batch/${batch.job_id}/status`,
      { credentials: 'include' },
    );
    const batchStatus = await batchStatusResponse.json();

    return {
      ok: runWorkflow.ok && batchStatusResponse.ok,
      workflowId: run.workflow_id,
      operationsCount: run.operations_count,
      batchTotal: batchStatus.total,
      batchResultCount: batchStatus.results?.length,
    };
  }, backendUrl);

  expect(result.ok).toBeTruthy();
  expect(result.workflowId).toBeTruthy();
  expect(result.operationsCount).toBe(1);
  expect(result.batchTotal).toBe(2);
  expect(result.batchResultCount).toBe(2);
});
