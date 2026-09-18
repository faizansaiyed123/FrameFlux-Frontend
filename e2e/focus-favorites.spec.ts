import { test, expect } from '@playwright/test';
import { API, createUser, uploadMedia, setAuthenticatedBrowser } from './qa-helpers';

test('Favorites — add, list, display and remove', async ({ request, page }) => {
  const auth = await createUser(request, 'focus-favorites');
  const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');

  const add = await request.post(API + '/favorites', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: { media_id: media.id },
  });
  expect(add.ok(), await add.text()).toBeTruthy();
  expect((await add.json()).media_id).toBe(media.id);

  const list = await request.get(API + '/favorites', {
    headers: { Authorization: 'Bearer ' + auth.token },
  });
  expect(list.ok(), await list.text()).toBeTruthy();
  expect((await list.json()).some((item: any) => item.media_id === media.id)).toBeTruthy();

  await setAuthenticatedBrowser(page, auth.email, auth.password);
  await page.goto('/app/dashboard/favorites');
  await expect(page.getByRole('heading', { name: 'Favorites' })).toBeVisible();
  await expect(page.getByText('Media ID: ' + media.id, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('No favorites yet', { exact: true })).toBeVisible();

  const finalList = await request.get(API + '/favorites', {
    headers: { Authorization: 'Bearer ' + auth.token },
  });
  expect(finalList.ok(), await finalList.text()).toBeTruthy();
  expect((await finalList.json()).some((item: any) => item.media_id === media.id)).toBeFalsy();
});
\n// Sequential feature verification: Favorites only.\n