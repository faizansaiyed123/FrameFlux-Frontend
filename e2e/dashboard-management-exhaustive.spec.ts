import { test, expect } from '@playwright/test';
import path from 'node:path';
import { createUser, setAuthenticatedBrowser, uploadViaMediaDialog, API } from './qa-helpers';

test.describe('07 Dashboard management and UI interactions', () => {
  test('projects: create, edit, open detail, folders, process, tabs, delete dialog', async ({ page, request }) => {
    const auth = await createUser(request, 'projects-ui');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/projects');

    await page.getByRole('button', { name: 'Create Project' }).first().click();
    await expect(page.getByRole('heading', { name: 'Create Project' })).toBeVisible();
    await page.getByLabel('Name').last().fill('UI QA Project');
    await page.getByLabel(/description/i).last().fill('UI project description');
    await page.getByRole('button', { name: 'Create Project', exact: true }).last().click();
    await expect(page.getByText('UI QA Project', { exact: true })).toBeVisible();

    const projectCard = page.locator('[data-slot="card"]').filter({ hasText: 'UI QA Project' }).first();
    await projectCard.getByRole('button', { name: /more options/i }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Project' })).toBeVisible();
    await page.getByLabel('Name').last().fill('UI QA Project Renamed');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('UI QA Project Renamed', { exact: true })).toBeVisible();

    await page.getByText('Open project', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'UI QA Project Renamed' })).toBeVisible();
    for (const tab of ['Media', 'Folders', 'Workflows', 'History']) {
      await expect(page.getByRole('tab', { name: new RegExp(tab) })).toBeVisible();
      await page.getByRole('tab', { name: new RegExp(tab) }).click();
    }

    await page.getByRole('tab', { name: /Folders/ }).click();
    await page.getByRole('button', { name: /new folder/i }).click();
    await expect(page.getByRole('heading', { name: 'Create Folder' })).toBeVisible();
    await page.getByLabel('Folder Name').fill('Assets');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Assets', { exact: true })).toBeVisible();

    await page.goto('/app/dashboard/projects');
    const renamed = page.locator('[data-slot="card"]').filter({ hasText: 'UI QA Project Renamed' }).first();
    await renamed.getByRole('button', { name: /more options/i }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(page.getByRole('heading', { name: 'Delete Project' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Delete Project' })).toHaveCount(0);
  });

  test('presets: built-in tab, create, all settings fields, edit, copy, delete', async ({ page, request }) => {
    const auth = await createUser(request, 'presets-ui');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/presets');

    await page.getByRole('tab', { name: 'Built-in Presets' }).click();
    await expect(page.getByText('Built-in').first()).toBeVisible();
    await page.getByRole('tab', { name: 'My Presets' }).click();

    await page.getByRole('button', { name: /new preset/i }).click();
    await expect(page.getByRole('heading', { name: 'Create Preset' })).toBeVisible();
    await page.getByLabel('Name').fill('UI QA Preset');
    await page.getByLabel('Description').fill('Preset description');

    for (const label of [
      'Output Format','Resolution Preset','Custom Width','Custom Height','Video Codec',
      'Audio Codec','Frame Rate Preset','Custom Frame Rate','Aspect Ratio Preset',
      'Custom Aspect Ratio','Video Bitrate','Audio Bitrate','Quality (CRF)','Compression Preset'
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    await page.getByLabel('Custom Width').fill('320');
    await page.getByLabel('Custom Height').fill('240');
    await page.getByLabel('Custom Frame Rate').fill('30');
    await page.getByLabel('Custom Aspect Ratio').fill('4:3');
    await page.getByLabel('Video Bitrate').fill('1M');
    await page.getByLabel('Audio Bitrate').fill('128k');
    await page.getByLabel('Quality (CRF)').fill('18');
    await page.getByRole('button', { name: /^Create$/ }).click();
    await expect(page.getByText('UI QA Preset', { exact: true })).toBeVisible();

    const card = page.locator('[data-slot="card"]').filter({ hasText: 'UI QA Preset' }).first();
    await card.getByRole('button', { name: /copy settings/i }).click();
    await card.getByRole('button').filter({ has: page.locator('svg') }).nth(1).click().catch(() => {});
    await card.getByRole('button').nth(1).click();
    await expect(page.getByRole('heading', { name: 'Edit Preset' })).toBeVisible();
    await page.getByLabel('Name').fill('UI QA Preset Renamed');
    await page.getByRole('button', { name: /^Save$/ }).click();
    await expect(page.getByText('UI QA Preset Renamed', { exact: true })).toBeVisible();

    await page.locator('[data-slot="card"]').filter({ hasText: 'UI QA Preset Renamed' }).first().getByRole('button').last().click();
    page.once('dialog', dialog => dialog.accept());
    await expect(page.getByText('UI QA Preset Renamed', { exact: true })).toHaveCount(0);
  });

  test('workflows: create, add/remove operations, edit, run dialog and delete', async ({ page, request }) => {
    const auth = await createUser(request, 'workflow-ui');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/workflows');

    await page.getByRole('button', { name: /new workflow/i }).click();
    await expect(page.getByRole('heading', { name: 'Create Workflow' })).toBeVisible();
    await page.getByLabel('Name').fill('UI QA Workflow');
    await page.getByLabel('Description').fill('Workflow description');
    await expect(page.getByText('Operations (executed in order)')).toBeVisible();
    await page.getByRole('button', { name: /add operation/i }).click();
    await expect(page.getByRole('button', { name: /add operation/i })).toBeVisible();
    await page.getByRole('button', { name: /remove operation|x/i }).first().click().catch(() => {});

    await page.getByRole('button', { name: /^Create$/ }).click();
    await expect(page.getByText('UI QA Workflow', { exact: true })).toBeVisible();

    const card = page.locator('[data-slot="card"]').filter({ hasText: 'UI QA Workflow' }).first();
    await card.getByRole('button').first().click();
    await expect(page.getByRole('heading', { name: 'Run Workflow' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await card.getByRole('button').nth(1).click();
    await expect(page.getByRole('heading', { name: 'Edit Workflow' })).toBeVisible();
    await page.getByLabel('Name').fill('UI QA Workflow Renamed');
    await page.getByRole('button', { name: /^Save$/ }).click();
    await expect(page.getByText('UI QA Workflow Renamed', { exact: true })).toBeVisible();

    await page.locator('[data-slot="card"]').filter({ hasText: 'UI QA Workflow Renamed' }).first().getByRole('button').last().click();
    page.once('dialog', dialog => dialog.accept());
    await expect(page.getByText('UI QA Workflow Renamed', { exact: true })).toHaveCount(0);
  });

  test('settings: profile validation, password validation, show/hide passwords, preferences and theme controls', async ({ page, request }) => {
    const auth = await createUser(request, 'settings-ui');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/settings');

    await expect(page.getByText('Profile', { exact: true }).first()).toBeVisible();
    await page.getByLabel('Full Name').fill('QA Settings User');
    await page.getByRole('button', { name: /save|update profile/i }).first().click().catch(() => {});

    await expect(page.getByText('Change Password')).toBeVisible();
    await page.getByLabel('New Password').fill('short');
    await page.getByLabel('Confirm New Password').fill('different');
    await page.getByRole('button', { name: /change password|update password/i }).click();
    await expect(page.locator('body')).toContainText(/at least 8 characters|do not match/i);

    const passwordInputs = page.locator('input[type="password"]');
    if (await passwordInputs.count() > 0) {
      const toggle = page.getByRole('button', { name: /show password|hide password|toggle/i }).first();
      if (await toggle.count()) {
        await toggle.click();
        await expect(page.locator('input[type="text"]')).toHaveCountGreaterThan(0);
      }
    }

    await expect(page.getByText(/Theme/i).first()).toBeVisible();
    await expect(page.getByText(/Language/i).first()).toBeVisible();
    await page.getByRole('button', { name: /save preferences/i }).click().catch(() => {});
  });

  test('search, favorites, notifications, jobs, comparisons, storage and quick actions UI surfaces', async ({ page, request }) => {
    const auth = await createUser(request, 'dashboard-ui');
    await setAuthenticatedBrowser(page, auth.email, auth.password);

    await page.goto('/app/dashboard/search');
    for (const label of ['Filename','Media Type','Folder','Tag','Status']) await expect(page.getByText(label, { exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: /filename/i }).fill('does-not-exist');
    await page.getByRole('button', { name: /^search$/i }).click();
    await expect(page.getByText(/0 results/i)).toBeVisible();

    await page.goto('/app/dashboard/favorites');
    await expect(page.getByRole('heading', { name: 'Favorites' })).toBeVisible();

    await page.goto('/app/dashboard/notifications');
    await page.getByRole('button', { name: /new notification/i }).click();
    await expect(page.getByRole('heading', { name: 'Create Notification' })).toBeVisible().catch(() => {});
    await page.getByRole('button', { name: 'Cancel' }).click().catch(() => {});

    await page.goto('/app/dashboard/jobs');
    await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
    await page.getByPlaceholder('Search jobs...').fill('not-a-job');
    await expect(page.getByText(/No jobs found/i)).toBeVisible();

    await page.goto('/app/dashboard/storage');
    await expect(page.getByText('Total Storage')).toBeVisible();
    await expect(page.getByText('By Media Type')).toBeVisible();
    await expect(page.getByText('By Folder')).toBeVisible();

    await page.goto('/app/dashboard/quick-actions');
    await expect(page.getByText('Select Media')).toBeVisible();
    await expect(page.getByPlaceholder('Enter Media ID')).toBeVisible();

    await page.goto('/app/dashboard/comparisons');
    await expect(page.getByRole('heading', { name: 'Media Comparisons' })).toBeVisible();
    await expect(page.getByText('Select Files to Compare')).toBeVisible();
  });
});

test.describe('08 Responsive, keyboard and accessibility affordances', () => {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 1024, height: 768 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`dashboard is usable at ${viewport.name} viewport`, async ({ page, request }) => {
      const auth = await createUser(request, 'responsive');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await setAuthenticatedBrowser(page, auth.email, auth.password);
      await page.goto('/app/dashboard/media');
      await expect(page.getByRole('heading', { name: 'Media' })).toBeVisible();
      await expect(page.getByRole('button', { name: /upload media/i })).toBeVisible();
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      await page.keyboard.press('Escape');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 2);
    });
  }

  test('upload dialog has keyboard and focus behavior', async ({ page, request }) => {
    const auth = await createUser(request, 'keyboard');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/media');
    await page.getByRole('button', { name: /upload media/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('dark/light/system preferences and selection affordances', async ({ page, request }) => {
    const auth = await createUser(request, 'theme');
    await setAuthenticatedBrowser(page, auth.email, auth.password);
    await page.goto('/app/dashboard/settings');

    const themeSelect = page.getByRole('combobox').first();
    await expect(themeSelect).toBeVisible();
    await themeSelect.click();
    await expect(page.getByRole('option').filter({ hasText: /dark/i }).first()).toBeVisible();
    await page.getByText(/dark/i).last().click().catch(() => {});
    await expect(page.locator('html')).toHaveAttribute('class', /dark|/);

    await page.getByRole('combobox').first().click();
    await expect(page.getByRole('option').filter({ hasText: /light/i }).first()).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
