import { test, expect } from '@playwright/test';
import { API, createUser, uploadMedia } from './qa-helpers';

test('Audio editing reorder clips', async ({ page, request }) => {
  const auth = await createUser(request, 'audio-reorder');
  const first = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
  const second = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

  await page.goto('/auth/login');
  await page.getByRole('textbox', { name: /email/i }).fill(auth.email);
  await page.getByRole('textbox', { name: /password/i }).fill(auth.password);
  await page.getByRole('button', { name: /log in|login|sign in/i }).click();
  await page.waitForURL(/\/app\/dashboard/);

  await page.goto('/app/dashboard/media/' + first.id);
  await page.getByRole('tab', { name: 'Processing', exact: true }).click();
  await expect(page.getByText('Audio Tools', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Reorder', exact: true }).click();
  await expect(page.getByText('Clip order', { exact: true })).toBeVisible();

  const picker = page.getByRole('combobox').last();
  await picker.click();
  await page.getByRole('option', { name: 'sample.mp3' }).last().click();
  await page.getByRole('button', { name: /^Add$/i }).click();

  const clipOrder = page.getByText('Clip order', { exact: true }).locator('..');
  await clipOrder.scrollIntoViewIfNeeded();
  const moveUpButtons = page.getByRole('button', { name: 'Move sample.mp3 up' });
  await expect(moveUpButtons).toHaveCount(2);
  await moveUpButtons.nth(1).click();

  const orderRows = clipOrder.locator('span').filter({ hasText: /^[12]\. sample\.mp3$/ });
  await expect(orderRows.nth(0)).toHaveText('1. sample.mp3');
  await expect(orderRows.nth(1)).toHaveText('2. sample.mp3');

  let payload: any = null;
  page.on('request', (req) => {
    if (req.url().includes('/audio/' + first.id + '/edit') && req.method() === 'POST') {
      payload = JSON.parse(req.postData() || '{}');
    }
  });

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/audio/' + first.id + '/edit') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: /Reorder & Export/i }).click();
  const response = await responsePromise;

  expect(response.ok(), await response.text()).toBeTruthy();
  expect(payload.operation).toBe('merge');
  expect(payload.target_files).toEqual([second.stored_filename, first.stored_filename]);
  await expect(page.getByText('Audio clips reordered and exported successfully.', { exact: true })).toBeVisible();
});
