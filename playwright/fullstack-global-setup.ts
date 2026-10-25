import { chromium, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PASSWORD = 'TestPass123!';
const ARTIFACT_DIR = path.resolve('test-results/evidence');
const AUTH_DIR = path.resolve('playwright/.auth');

function uniqueEmail() {
  return `frameflux_e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export default async function globalSetup() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const email = process.env.E2E_EMAIL || uniqueEmail();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page: Page = await context.newPage();

  page.on('response', async (response) => {
    if (response.url().includes('/auth/')) {
      console.log(`[AUTH] ${response.request().method()} ${response.url()} -> ${response.status()}`);
    }
  });

  await page.goto('http://127.0.0.1:3000/auth/signup');
  await page.getByPlaceholder('Jane Doe').fill('FrameFlux E2E User');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 60_000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '01-signup-and-dashboard.png'), fullPage: true });

  await context.storageState({ path: path.join(AUTH_DIR, 'user.json') });
  fs.writeFileSync(
    path.join(AUTH_DIR, 'credentials.json'),
    JSON.stringify({ email, password: PASSWORD, full_name: 'FrameFlux E2E User' }, null, 2),
  );

  await browser.close();
}