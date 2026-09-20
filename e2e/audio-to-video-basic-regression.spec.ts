import { test, expect } from '@playwright/test';
import { API, createUser, expectBlob, uploadMedia } from './qa-helpers';

test('Audio → Video: create video from an audio file', async ({ request }) => {
  const auth = await createUser(request, 'audio-to-video-basic');
  const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

  const response = await request.post(API + '/audio/' + audio.id + '/to-video', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: {
      background_color: '#202020',
      output_format: 'mp4',
      resolution: '320x240',
      fps: 24,
      duration: 1,
    },
  });

  await expectBlob(response, 'video/');
});

test('Audio → Video: add background image', async ({ request }) => {
  const auth = await createUser(request, 'audio-to-video-background-image');
  const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
  const image = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.png');

  const response = await request.post(API + '/audio/' + audio.id + '/to-video', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: {
      background_image: image.stored_filename,
      output_format: 'mp4',
      resolution: '320x240',
      fps: 24,
      duration: 1,
    },
  });

  await expectBlob(response, 'video/');
});
