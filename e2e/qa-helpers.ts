import { expect, APIRequestContext, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const API = process.env.TEST_API_URL || 'http://localhost:8000';

export type AuthContext = {
  email: string;
  password: string;
  token: string;
  userId: string;
};

export async function createUser(request: APIRequestContext, prefix = 'qa'): Promise<AuthContext> {
  const email = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = 'TestPass123!';
  const signup = await request.post(`${API}/auth/signup`, {
    data: { email, password, full_name: 'Exhaustive QA User' },
  });
  expect(signup.ok(), await signup.text()).toBeTruthy();

  const login = await request.post(`${API}/auth/login`, {
    data: { email, password },
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  const loginBody = await login.json();

  const me = await request.get(`${API}/auth/me`, {
    headers: { Authorization: 'Bearer ' + loginBody.access_token },
  });
  expect(me.ok(), await me.text()).toBeTruthy();
  const user = await me.json();

  return { email, password, token: loginBody.access_token, userId: user.id };
}

export async function uploadMedia(request: APIRequestContext, token: string, filePath: string) {
  const file = fs.readFileSync(filePath);
  const response = await request.post(`${API}/media/upload`, {
    headers: { Authorization: 'Bearer ' + token },
    multipart: {
      file: {
        name: path.basename(filePath),
        mimeType: mimeFor(filePath),
        buffer: file,
      },
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

export async function waitForMedia(
  request: APIRequestContext,
  token: string,
  mediaId: string,
  timeoutMs = 90_000
) {
  const deadline = Date.now() + timeoutMs;
  let last: any = null;
  while (Date.now() < deadline) {
    const response = await request.get(`${API}/media/${mediaId}/status`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    last = await response.json();
    if (last.status === 'completed' || last.status === 'failed') return last;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for media ${mediaId}. Last status: ${JSON.stringify(last)}`);
}

export async function expectBlob(
  response: Awaited<ReturnType<APIRequestContext['get'] | APIRequestContext['post']>>,
  expectedPrefix?: string
) {
  expect(response.ok(), await response.text()).toBeTruthy();
  const contentType = response.headers()['content-type'] || '';
  if (expectedPrefix) expect(contentType).toContain(expectedPrefix);
  const body = await response.body();
  expect(body.length).toBeGreaterThan(0);
  return body;
}

export async function setAuthenticatedBrowser(page: Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.getByRole('textbox', { name: /email/i }).fill(email);
  await page.getByRole('textbox', { name: /password/i }).fill(password);
  await page.getByRole('button', { name: /log in|login|sign in/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 30_000 });
}

export function mimeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.opus': 'audio/opus',
    '.aiff': 'audio/aiff',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.srt': 'application/x-subrip',
    '.vtt': 'text/vtt',
    '.ass': 'text/plain',
  };
  return map[ext] || 'application/octet-stream';
}
export async function uploadViaMediaDialog(page: Page, filePath: string, expectedName: string) {
  await page.getByRole('button', { name: /upload media/i }).click();
  const input = page.locator('input[type="file"]#file').last();
  await input.setInputFiles(filePath);
  await expect(page.getByText(expectedName, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^upload$/i }).click();
  await page.waitForURL(/\/app\/dashboard\/media\/[^/?]+\?from_upload=1$/, { timeout: 120_000 });
}
