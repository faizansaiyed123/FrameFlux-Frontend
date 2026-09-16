import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const TEST_PASSWORD = 'TestPass123!';
const TEST_NAME = 'Test User';
const AUTH_FILE = path.join(__dirname, '.auth/user.json');

function uniqueEmail() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2,8)}@example.com`;
}

async function signupAndLogin(page: any, email: string) {
  await page.goto('http://localhost:3000/auth/signup');
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder="John Doe"]', TEST_NAME);
  await page.fill('input[placeholder="you@example.com"]', email);
  await page.fill('input[placeholder="••••••••"]', TEST_PASSWORD);
  await page.click('button:has-text("Create account")');
  await page.waitForURL(/.*dashboard/, { timeout: 60000 });
}

export default async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const email = uniqueEmail();
  await signupAndLogin(page, email);
  
  // Save storage state
  await page.context().storageState({ path: AUTH_FILE });
  
  await browser.close();
}