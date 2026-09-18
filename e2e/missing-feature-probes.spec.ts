import { test, expect } from '@playwright/test';
import { API, createUser, uploadMedia } from './qa-helpers';

test.describe('09 Explicit missing/placeholder feature probes', () => {
  test('export endpoint must execute rather than return configuration placeholder', async ({ request }) => {
    const auth = await createUser(request, 'export-probe');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const res = await request.post(`${API}/export/${media.id}/export`, {
      headers: { Authorization: 'Bearer ' + auth.token },
      data: { format: 'mp4' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(JSON.stringify(body).toLowerCase()).not.toContain('being configured');
  });

  test('metadata endpoint returns actual metadata rather than an empty route module', async ({ request }) => {
    const auth = await createUser(request, 'metadata-probe');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const res = await request.get(`${API}/metadata/${media.id}`, { headers: { Authorization: 'Bearer ' + auth.token } });
    expect(res.status()).not.toBe(404);
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(Object.keys(body).length).toBeGreaterThan(0);
  });

  test('effects/filter endpoints return executable processing responses', async ({ request }) => {
    const auth = await createUser(request, 'effects-probe');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    for (const endpoint of [`${API}/video/${media.id}/adjust`, `${API}/video/${media.id}/filter`, `${API}/video/${media.id}/fade`, `${API}/video/${media.id}/reverse`]) {
      const res = await request.post(endpoint, { headers: { Authorization: 'Bearer ' + auth.token }, data: {} });
      expect(res.status()).not.toBe(404);
      expect(res.status()).toBeLessThan(500);
      const text = await res.text();
      expect(text.toLowerCase()).not.toContain('being configured');
    }
  });
});
